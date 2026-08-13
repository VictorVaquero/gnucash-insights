#!/usr/bin/env node
// Generates a self-consistent synthetic GnuCash-shaped dataset for the guest
// Turso database and writes it as a single .sql file. Mirrors the real ETL
// (cashpy-processor's gcparser/core/sql.py): only the raw tables are
// hand-built here (books, accounts, commodities, prices, transactions,
// splits, timetable, meta); accountsClosure, maxPrices, fullTransactions and
// summary_monthly/quarterly/yearly are derived with the exact same SQL that
// pipeline runs against Turso, appended at the end of the generated file so
// running it reproduces the real table shapes exactly.
//
// Usage: node scripts/generate-guest-data.mjs > /tmp/guest-seed.sql
//        node scripts/generate-guest-data.mjs --months 36 --out /tmp/guest-seed.sql

import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const MONTHS = Number(getArg("months", 36));
const OUT = getArg("out", null);
const SEED = Number(getArg("seed", 42));
const END_DATE = new Date(getArg("end", new Date().toISOString().slice(0, 10)) + "T10:59:00Z");

// --- Deterministic PRNG (mulberry32) so re-runs with the same --seed are stable ---
let seedState = SEED >>> 0;
const rand = () => {
  seedState |= 0;
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const randFloat = (min, max, decimals = 2) => {
  const v = rand() * (max - min) + min;
  const p = 10 ** decimals;
  return Math.round(v * p) / p;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
// Deterministic 32-char hex id, seeded from `rand()` — same --seed always
// reproduces the same account/transaction/split IDs, so GUEST_ACCOUNT_CONFIG
// (hardcoded in api/turso-token.ts and vite.config.ts) stays valid across
// re-runs of seed-guest-data.sh without manual copy-pasting.
const id = () => Array.from({ length: 32 }, () => Math.floor(rand() * 16).toString(16)).join("");

const sqlStr = (v) => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
};
const sqlDateTime = (d) =>
  d
    .toISOString()
    .replace(/\.\d{3}Z$/, "+0000")
    .replace("Z", "+0000");
const ymd = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const addMonths = (d, n) => {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + n);
  return r;
};

// --- IDs ---
const bookId = id();

// --- Chart of accounts: mirrors the real book's shape (root -> Income/Expense/Asset/Liability
// branches, Assets -> current-assets + investments, Expenses grouped by category) but with
// fictional English category names so guest data reads as clearly synthetic, not personal. ---
const accounts = [];
const addAccount = (name, accountType, parentId, opts = {}) => {
  const acc = { id: id(), name, accountType, parent: parentId, commodity: "EUR", ...opts };
  accounts.push(acc);
  return acc.id;
};

const root = addAccount("Root Account", "ROOT", null, { commodity: null });
const income = addAccount("Income", "INCOME", root);
const expenses = addAccount("Expenses", "EXPENSE", root);
const assets = addAccount("Assets", "ASSET", root);
const liabilities = addAccount("Liabilities", "LIABILITY", root);
const equity = addAccount("Equity", "EQUITY", root);

const currentAssets = addAccount("Current Assets", "BANK", assets);
const checking = addAccount("Checking Account", "BANK", currentAssets);
const savings = addAccount("Savings Account", "BANK", currentAssets);
const cash = addAccount("Cash", "CASH", currentAssets);
const investments = addAccount("Investments", "ASSET", assets);
const indexFund = addAccount("Index Fund", "MUTUAL", investments, { commodity: "IDXFUND" });

const salary = addAccount("Salary", "INCOME", income);
const freelance = addAccount("Freelance", "INCOME", income);
const interestIncome = addAccount("Interest Income", "INCOME", income);
const otherIncome = addAccount("Other Income", "INCOME", income);

const housing = addAccount("Housing", "LIABILITY", liabilities);
const rentOwed = addAccount("Rent Owed", "LIABILITY", housing);

const groceries = addAccount("Groceries", "EXPENSE", expenses);
const restaurants = addAccount("Restaurants & Bars", "EXPENSE", expenses);
const transport = addAccount("Transport", "EXPENSE", expenses);
const publicTransit = addAccount("Public Transit", "EXPENSE", transport);
const fuel = addAccount("Fuel", "EXPENSE", transport);
const leisure = addAccount("Leisure", "EXPENSE", expenses);
const sports = addAccount("Sports", "EXPENSE", leisure);
const books_ = addAccount("Books & Media", "EXPENSE", leisure);
const travel = addAccount("Travel", "EXPENSE", leisure);
const health = addAccount("Health", "EXPENSE", expenses);
const utilities = addAccount("Utilities", "EXPENSE", expenses);
const clothing = addAccount("Clothing", "EXPENSE", expenses);
const education = addAccount("Education", "EXPENSE", expenses);
const taxesAcc = addAccount("Taxes", "EXPENSE", expenses);
const incomeTax = addAccount("Income Tax", "EXPENSE", taxesAcc);
const socialSecurity = addAccount("Social Security", "EXPENSE", taxesAcc);
const otherExpenses = addAccount("Other Expenses", "EXPENSE", expenses);

const openingBalances = addAccount("Opening Balances", "EQUITY", equity);

// Two more holdings alongside the index fund, with deliberately different performance
// profiles (see buildMonthlyPriceSeries calls below) so the /investments page has
// something to compare, rank, and chart. Added after all the ID()-sensitive accounts
// above so GUEST_ACCOUNT_CONFIG's hardcoded IDs in api/turso-token.ts / vite.config.ts
// never shift.
const novaStock = addAccount("Nova Robotics", "STOCK", investments, { commodity: "NOVA" });
const bondFund = addAccount("Bond Fund", "MUTUAL", investments, { commodity: "BONDFUND" });

// --- Guest AccountConfig (mirrors AccountConfig in src/services/tursoService.ts) ---
const GUEST_ACCOUNT_CONFIG = {
  expenses,
  income,
  checking,
  savings,
  assets,
  working: currentAssets,
  liability: liabilities,
  investments,
  taxes: taxesAcc,
  taxesAll: [incomeTax, socialSecurity],
  tripDesc: "Trip",
};

// --- Merchants / notes pools per expense leaf, for varied realistic descriptions ---
const MERCHANTS = {
  [groceries]: ["Corner Market", "GreenGrocer", "Bulk Foods Co", "Farmers Market"],
  [restaurants]: ["Pasta Place", "Sushi Bar", "Corner Pub", "Burger Joint", "Coffee House"],
  [publicTransit]: ["Metro Card", "City Bus", "Train Ticket"],
  [fuel]: ["Gas Station", "Fuel Stop"],
  [sports]: ["Climbing Gym", "Yoga Studio", "Running Club"],
  [books_]: ["Bookstore", "E-book Store", "Comic Shop"],
  [health]: ["Pharmacy", "Dental Clinic", "Optician"],
  [utilities]: ["Internet Provider", "Electric Co", "Water Utility", "Mobile Carrier"],
  [clothing]: ["Clothing Store", "Shoe Shop", "Outdoor Gear"],
  [education]: ["Online Course", "Language School", "Workshop Fee"],
  [otherExpenses]: ["Miscellaneous", "General Store"],
  [travel]: ["Hotel", "Flight Booking", "Car Rental", "Travel Agency"],
};

const TRIP_NAMES = [
  "Trip Lisbon 2023",
  "Trip Alps Hiking 2023",
  "Trip Rome 2024",
  "Trip Coastal Roadtrip 2024",
  "Trip Mountain Camp 2025",
  "Trip City Break 2025",
  "Trip Island Getaway 2026",
];

// --- Time range ---
const startDate = addMonths(END_DATE, -MONTHS);
startDate.setUTCDate(1);

// --- Holding price series: one point per month (index m, aligned with the monthly
// transaction loop below) so each holding's purchases can be quantity = eurAmount /
// price[m], giving genuinely varying market values instead of a flat 1:1 price. Each
// holding gets its own drift/volatility so the /investments page has a clear best and
// worst performer to rank and a visibly different comparison-chart shape. ---
const buildMonthlyPriceSeries = (startPrice, monthlyDriftPct, monthlyVolPct) => {
  const prices = [];
  let price = startPrice;
  for (let m = 0; m <= MONTHS; m++) {
    prices.push(Math.max(0.5, Math.round(price * 10000) / 10000));
    const shock = randFloat(-monthlyVolPct, monthlyVolPct, 4) / 100;
    price = price * (1 + monthlyDriftPct / 100 + shock);
  }
  return prices;
};

const HOLDING_PRICES = {
  [indexFund]: { commodity: "IDXFUND", series: buildMonthlyPriceSeries(100, 0.8, 3.5) },
  [novaStock]: { commodity: "NOVA", series: buildMonthlyPriceSeries(40, 1.7, 8) },
  [bondFund]: { commodity: "BONDFUND", series: buildMonthlyPriceSeries(100, -0.3, 1.5) },
};

// --- Generators ---
const transactions = [];
const splits = [];

const addTransaction = ({ date, description, slNotes = null, legs }) => {
  const txId = id();
  transactions.push({
    id: txId,
    dateEntered: date,
    datePosted: date,
    description,
    slNotes,
  });
  for (const leg of legs) {
    splits.push({
      id: id(),
      transactionId: txId,
      account: leg.account,
      value: leg.value,
      quantity: leg.quantity ?? leg.value,
    });
  }
  return txId;
};

// Monthly salary (last business-ish day of month) + occasional freelance/interest
for (let m = 0; m <= MONTHS; m++) {
  const monthDate = addMonths(startDate, m);
  if (monthDate > END_DATE) break;
  const payDate = new Date(
    Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 27, 10, 59),
  );
  if (payDate > END_DATE) continue;

  const salaryAmount = randFloat(2200, 2600);
  addTransaction({
    date: payDate,
    description: "Payroll",
    legs: [
      { account: salary, value: -salaryAmount },
      { account: checking, value: salaryAmount },
    ],
  });

  if (chance(0.15)) {
    const amount = randFloat(150, 900);
    addTransaction({
      date: addDays(payDate, randInt(-5, 5)),
      description: "Freelance payment",
      legs: [
        { account: freelance, value: -amount },
        { account: checking, value: amount },
      ],
    });
  }

  if (chance(0.08)) {
    const amount = randFloat(20, 200);
    addTransaction({
      date: addDays(payDate, randInt(-10, 10)),
      description: "Other income",
      legs: [
        { account: otherIncome, value: -amount },
        { account: checking, value: amount },
      ],
    });
  }

  if (chance(0.5)) {
    const amount = randFloat(2, 15);
    addTransaction({
      date: addDays(payDate, randInt(0, 3)),
      description: "Savings interest",
      legs: [
        { account: interestIncome, value: -amount },
        { account: savings, value: amount },
      ],
    });
  }

  // Rent, always
  const rentAmount = randFloat(750, 780);
  addTransaction({
    date: new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 3, 10, 59)),
    description: "Rent",
    legs: [
      { account: checking, value: -rentAmount },
      { account: rentOwed, value: rentAmount },
    ],
  });

  // Utilities bundle
  const utilAmount = randFloat(60, 120);
  addTransaction({
    date: new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 5, 10, 59)),
    description: "Utilities",
    slNotes: pick(MERCHANTS[utilities] ?? ["Utility Co"]),
    legs: [
      { account: checking, value: -utilAmount },
      { account: utilities, value: utilAmount },
    ],
  });

  // Income tax + social security withheld from a separate settlement
  const incomeTaxAmount = randFloat(280, 420);
  const socialSecAmount = randFloat(140, 220);
  addTransaction({
    date: new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 10, 10, 59)),
    description: "Tax settlement",
    legs: [
      { account: checking, value: -(incomeTaxAmount + socialSecAmount) },
      { account: incomeTax, value: incomeTaxAmount },
      { account: socialSecurity, value: socialSecAmount },
    ],
  });

  // Monthly investment contributions: each holding buys at its own price for month `m`,
  // so quantity (units bought) genuinely diverges from value (EUR paid) over time.
  const buyHolding = (account, description, chanceOfBuy, min, max) => {
    if (!chance(chanceOfBuy)) return;
    const investAmount = randFloat(min, max);
    const price = HOLDING_PRICES[account].series[m];
    addTransaction({
      date: new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 15, 10, 59)),
      description,
      legs: [
        { account: checking, value: -investAmount },
        { account, value: investAmount, quantity: investAmount / price },
      ],
    });
  };
  buyHolding(indexFund, "Index fund purchase", 0.85, 100, 300);
  buyHolding(novaStock, "Nova Robotics purchase", 0.5, 50, 250);
  buyHolding(bondFund, "Bond fund purchase", 0.6, 80, 200);

  // Daily-ish discretionary spending across the month
  const daysInMonth = new Date(
    Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const spendDays = randInt(14, 22);
  const usedDays = new Set();
  for (let s = 0; s < spendDays; s++) {
    let day = randInt(1, daysInMonth);
    while (usedDays.has(day)) day = randInt(1, daysInMonth);
    usedDays.add(day);
    const date = new Date(
      Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), day, 10, 59),
    );
    if (date > END_DATE) continue;

    const category = pick([
      groceries,
      restaurants,
      publicTransit,
      fuel,
      sports,
      books_,
      health,
      clothing,
      otherExpenses,
    ]);
    const amount =
      category === groceries
        ? randFloat(15, 70)
        : category === restaurants
          ? randFloat(8, 45)
          : category === fuel
            ? randFloat(30, 65)
            : randFloat(5, 60);

    addTransaction({
      date,
      description: pick(MERCHANTS[category] ?? ["Purchase"]),
      slNotes: chance(0.3) ? pick(MERCHANTS[category] ?? []) : null,
      legs: [
        { account: checking, value: -amount },
        { account: category, value: amount },
      ],
    });
  }

  // Occasional education expense
  if (chance(0.1)) {
    const amount = randFloat(40, 250);
    const date = new Date(
      Date.UTC(
        monthDate.getUTCFullYear(),
        monthDate.getUTCMonth(),
        randInt(1, daysInMonth),
        10,
        59,
      ),
    );
    if (date <= END_DATE) {
      addTransaction({
        date,
        description: pick(MERCHANTS[education] ?? ["Course"]),
        legs: [
          { account: checking, value: -amount },
          { account: education, value: amount },
        ],
      });
    }
  }
}

// Trips: a handful of multi-transaction trips spread across the range, tagged via slNotes
// so travelExpensesByAccountOptions / tripDesc ("Trip") filters find them.
const numTrips = Math.min(TRIP_NAMES.length, Math.max(2, Math.floor(MONTHS / 6)));
for (let t = 0; t < numTrips; t++) {
  const tripName = TRIP_NAMES[t];
  const tripStart = addDays(startDate, Math.floor(((t + 0.5) / numTrips) * (MONTHS * 30)));
  if (tripStart > END_DATE) continue;
  const tripLegs = randInt(3, 6);
  for (let l = 0; l < tripLegs; l++) {
    const date = addDays(tripStart, l);
    if (date > END_DATE) continue;
    const category = pick([restaurants, transport, travel, groceries]);
    const amount = randFloat(30, 220);
    addTransaction({
      date,
      description: "Trip expense",
      slNotes: tripName,
      legs: [
        { account: checking, value: -amount },
        { account: category, value: amount },
      ],
    });
  }
}

// Opening balance so checking/savings/cash aren't seeded from zero at t=0
addTransaction({
  date: startDate,
  description: "Opening balance",
  legs: [
    { account: openingBalances, value: -6500 },
    { account: checking, value: 3000 },
    { account: savings, value: 3000 },
    { account: cash, value: 500 },
  ],
});

// --- Emit SQL ---
const lines = [];
const p = (s) => lines.push(s);

p("-- Generated by scripts/generate-guest-data.mjs — synthetic data, do not edit by hand.");
p("PRAGMA foreign_keys=OFF;");

const RAW_TABLES = [
  "meta",
  "books",
  "accounts",
  "transactions",
  "splits",
  "prices",
  "commodities",
  "timetable",
  "accountsClosure",
  "maxPrices",
  "fullTransactions",
  "summary_monthly",
  "summary_quarterly",
  "summary_yearly",
];
for (const t of RAW_TABLES) p(`DELETE FROM "${t}";`);

// books
p(
  `INSERT INTO books (id, version, count_account, count_budget, count_commodity, count_price, count_schedxaction, count_transaction) VALUES (${sqlStr(
    bookId,
  )}, '2.0.0', ${accounts.length}, NULL, 4, 0, 0, ${transactions.length});`,
);

// commodities
p(
  `INSERT INTO commodities (book_id, id, space, name, fraction, version, code) VALUES (${sqlStr(bookId)}, 'EUR', 'ISO4217', NULL, NULL, '2.0.0', NULL);`,
);
p(
  `INSERT INTO commodities (book_id, id, space, name, fraction, version, code) VALUES (${sqlStr(bookId)}, 'IDXFUND', 'FUND', 'Synthetic Index Fund', 10000, '2.0.0', 'IDXF');`,
);
p(
  `INSERT INTO commodities (book_id, id, space, name, fraction, version, code) VALUES (${sqlStr(bookId)}, 'NOVA', 'NASDAQ', 'Nova Robotics Inc.', 10000, '2.0.0', 'NOVA');`,
);
p(
  `INSERT INTO commodities (book_id, id, space, name, fraction, version, code) VALUES (${sqlStr(bookId)}, 'BONDFUND', 'FUND', 'Steady Bond Fund', 10000, '2.0.0', 'BOND');`,
);

// accounts
for (const a of accounts) {
  p(
    `INSERT INTO accounts (book_id, id, name, account_type, parent, commodity, scu, description) VALUES (${sqlStr(
      bookId,
    )}, ${sqlStr(a.id)}, ${sqlStr(a.name)}, ${sqlStr(a.accountType)}, ${sqlStr(a.parent)}, ${sqlStr(
      a.commodity,
    )}, 100, NULL);`,
  );
}

// transactions + splits
for (const tx of transactions) {
  p(
    `INSERT INTO transactions (book_id, id, date_entered, date_posted, currency_id, description, sl_date_posted, sl_from_sched_xaction, sl_notes, ymd_posted) VALUES (${sqlStr(
      bookId,
    )}, ${sqlStr(tx.id)}, ${sqlStr(sqlDateTime(tx.dateEntered))}, ${sqlStr(sqlDateTime(tx.datePosted))}, 'EUR', ${sqlStr(
      tx.description,
    )}, NULL, NULL, ${sqlStr(tx.slNotes)}, ${sqlStr(ymd(tx.datePosted))});`,
  );
}
for (const s of splits) {
  p(
    `INSERT INTO splits (transaction_id, id, account, value, quantity, isReconciled, reconciled_date, action, memo) VALUES (${sqlStr(
      s.transactionId,
    )}, ${sqlStr(s.id)}, ${sqlStr(s.account)}, ${s.value}, ${s.quantity}, 'y', ${sqlStr(
      sqlDateTime(END_DATE),
    )}, NULL, NULL);`,
  );
}

// prices: a flat EUR self-price series (so fullTransactions math, which only ever looks
// up the transaction currency's own price, stays 1:1 in EUR and maxPrices always
// resolves) plus each holding's own monthly price series from HOLDING_PRICES, which
// /investments actually reads to compute market value, gain, and XIRR.
{
  for (let m = 0; m <= MONTHS; m++) {
    const d = addMonths(startDate, m);
    if (d > END_DATE) break;
    p(
      `INSERT INTO prices (book_id, id, source, price_type, time, commodity, currency, value, ymd_time) VALUES (${sqlStr(
        bookId,
      )}, ${sqlStr(id())}, 'user:price', 'unknown', ${sqlStr(sqlDateTime(d))}, 'EUR', 'EUR', 1, ${sqlStr(ymd(d))});`,
    );
    for (const { commodity, series } of Object.values(HOLDING_PRICES)) {
      p(
        `INSERT INTO prices (book_id, id, source, price_type, time, commodity, currency, value, ymd_time) VALUES (${sqlStr(
          bookId,
        )}, ${sqlStr(id())}, 'user:price', 'unknown', ${sqlStr(sqlDateTime(d))}, ${sqlStr(commodity)}, 'EUR', ${series[m]}, ${sqlStr(ymd(d))});`,
      );
    }
  }
}

// timetable: mirrors get_timetable() in cashpy-processor, 1 extra year of lead-in
{
  const ttStart = addMonths(END_DATE, -(MONTHS + 12));
  ttStart.setUTCDate(1);
  const lastCompleteMonthEnd = new Date(
    Date.UTC(END_DATE.getUTCFullYear(), END_DATE.getUTCMonth(), 0),
  );
  const isCompleteRange = (d, monthsBack) => {
    const rangeStart = addMonths(addDays(lastCompleteMonthEnd, 1), -monthsBack);
    return d >= rangeStart && d <= lastCompleteMonthEnd;
  };
  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  for (let d = new Date(ttStart); d <= END_DATE; d = addDays(d, 1)) {
    const yyyy = d.getUTCFullYear();
    const mm = d.getUTCMonth() + 1;
    const dow = d.getUTCDay();
    p(
      `INSERT INTO timetable (ymd, year, month, day, yearmonth, month_name, week_day_num, week_day_name, is_last_month, is_last_3_months, is_last_6_months, is_last_year) VALUES (${sqlStr(
        ymd(d),
      )}, ${sqlStr(String(yyyy))}, ${sqlStr(String(mm))}, ${sqlStr(String(d.getUTCDate()))}, ${sqlStr(
        `${yyyy}-${String(mm).padStart(2, "0")}`,
      )}, ${sqlStr(MONTH_NAMES[mm - 1])}, ${sqlStr(String(dow))}, ${sqlStr(DAY_NAMES[dow])}, ${sqlStr(
        isCompleteRange(d, 1) ? "1" : "0",
      )}, ${sqlStr(isCompleteRange(d, 3) ? "1" : "0")}, ${sqlStr(isCompleteRange(d, 6) ? "1" : "0")}, ${sqlStr(
        isCompleteRange(d, 12) ? "1" : "0",
      )});`,
    );
  }
}

// meta
{
  const dates = transactions.map((t) => t.datePosted.getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  p(
    `INSERT INTO meta (count_book, parsed_date, parsed_version, min_date, max_date) VALUES (1, ${sqlStr(
      new Date().toISOString(),
    )}, 'synthetic', ${sqlStr(sqlDateTime(minDate))}, ${sqlStr(sqlDateTime(maxDate))});`,
  );
}

// --- Derived tables: exact SQL from cashpy-processor/src/gcparser/core/sql.py Config.DERIVED_TABLES ---
p(`
INSERT INTO accountsClosure
WITH RECURSIVE closure (book_id, parent, child, depth) AS (
    SELECT book_id, id, id, 0 FROM accounts
    UNION ALL
    SELECT a.book_id, a.parent, r.child, r.depth + 1
    FROM closure r
    JOIN accounts a ON a.id = r.parent
    WHERE a.parent IS NOT NULL
)
SELECT book_id, parent, child, depth FROM closure;
`);

p(`
INSERT INTO maxPrices
SELECT
    p.book_id,
    p.currency,
    p.commodity,
    t.year,
    t.month,
    COALESCE(MAX(p.value), 1) as price
FROM timetable t
LEFT JOIN prices p ON t.ymd = p.ymd_time
GROUP BY p.book_id, p.currency, p.commodity, t.year, t.month
ORDER BY p.book_id, p.currency, p.commodity, t.year, t.month;
`);

p(`
INSERT INTO fullTransactions
SELECT
    t.book_id,
    t.id as transaction_id,
    t.date_posted,
    t.ymd_posted,
    t.currency_id,
    s.id as split_id,
    a.id as account_id,
    (s.value * COALESCE(mp.price, 1)) as value,
    a.name as account_name
FROM transactions t
INNER JOIN splits s ON t.id = s.transaction_id
INNER JOIN accounts a ON a.id = s.account
LEFT JOIN timetable tt ON tt.ymd = t.ymd_posted
LEFT JOIN maxPrices mp ON
    mp.commodity = t.currency_id AND
    mp.year = tt.year AND
    mp.month = tt.month;
`);

p(`
INSERT INTO summary_monthly
SELECT
    tt.yearmonth as date_label,
    (tt.yearmonth || '-01') as date,
    ft.account_id,
    ft.account_name,
    SUM(ft.value) as total_value
FROM fullTransactions ft
JOIN timetable tt ON tt.ymd = ft.ymd_posted
GROUP BY date_label, ft.account_id, ft.account_name;
`);

p(`
INSERT INTO summary_quarterly
SELECT
    (tt.year || '-Q' || CAST(((tt.month - 1) / 3) + 1 AS TEXT)) AS date_label,
    (tt.year || '-' || PRINTF('%02d', ((tt.month - 1) / 3) * 3 + 2) || '-15') AS date,
    ft.account_id,
    ft.account_name,
    SUM(ft.value) as total_value
FROM fullTransactions ft
JOIN timetable tt ON tt.ymd = ft.ymd_posted
GROUP BY date_label, ft.account_id, ft.account_name;
`);

p(`
INSERT INTO summary_yearly
SELECT
    tt.year as date_label,
    (tt.year || '-01-01') as date,
    ft.account_id,
    ft.account_name,
    SUM(ft.value) as total_value
FROM fullTransactions ft
JOIN timetable tt ON tt.ymd = ft.ymd_posted
GROUP BY date_label, ft.account_id, ft.account_name;
`);

const sql = lines.join("\n");

if (OUT) {
  writeFileSync(OUT, sql);
  console.error(
    `Wrote ${sql.length} bytes, ${transactions.length} transactions, ${accounts.length} accounts to ${OUT}`,
  );
  console.error(`Guest account config (paste into GUEST_ACCOUNT_CONFIG):`);
  console.error(JSON.stringify(GUEST_ACCOUNT_CONFIG, null, 2));
} else {
  process.stdout.write(sql);
  console.error(`-- ${transactions.length} transactions, ${accounts.length} accounts generated`);
  console.error(`-- Guest account config (paste into GUEST_ACCOUNT_CONFIG):`);
  console.error(JSON.stringify(GUEST_ACCOUNT_CONFIG, null, 2));
}
