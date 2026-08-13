import {
  faBuildingColumns,
  faCalendarDay,
  faClockRotateLeft,
  faCoins,
  faFileInvoiceDollar,
  faLayerGroup,
  faRepeat,
  faRightLeft,
  faTag,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { booksOptions, domainOptions } from "@/db/queries/global";
import { Book } from "@/db/schema";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useLocale } from "@/hooks/useLocale";
import { formatNumber } from "@/common/utils.ts";

const StatRow = (props: { icon: IconDefinition; label: string; value: ReactNode }) => (
  <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border last:border-b-0">
    <span className="flex items-center gap-2.5 text-muted-foreground">
      <FontAwesomeIcon icon={props.icon} className="w-4 text-center" />
      {props.label}
    </span>
    <span className="font-medium text-foreground tabular-nums">{props.value}</span>
  </div>
);

const LedgerCard = ({ book }: { book: Book | undefined }) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const n = (value: number | undefined) => (value != null ? formatNumber(value, locale) : "—");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("metadata.sections.ledger")}</CardTitle>
      </CardHeader>
      <CardContent>
        <StatRow
          icon={faBuildingColumns}
          label={t("metadata.accounts")}
          value={n(book?.countAccount)}
        />
        <StatRow
          icon={faRightLeft}
          label={t("metadata.transactions")}
          value={n(book?.countTransaction)}
        />
        <StatRow
          icon={faRepeat}
          label={t("metadata.scheduledTransactions")}
          value={n(book?.countSchedxaction)}
        />
        <StatRow icon={faCoins} label={t("metadata.currencies")} value={n(book?.countCommodity)} />
        <StatRow icon={faTag} label={t("metadata.priceRecords")} value={n(book?.countPrice)} />
      </CardContent>
    </Card>
  );
};

const DateRangeCard = ({ minDate, maxDate }: { minDate: string; maxDate: string }) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { numMonths } = useDomain();
  const span = numMonths != null ? formatNumber(numMonths, locale, { digits: 1 }) : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("metadata.sections.dateRange")}</CardTitle>
      </CardHeader>
      <CardContent>
        <StatRow icon={faCalendarDay} label={t("metadata.initialDate")} value={minDate} />
        <StatRow icon={faCalendarDay} label={t("metadata.finalDate")} value={maxDate} />
        <StatRow
          icon={faClockRotateLeft}
          label={t("metadata.span")}
          value={span != null ? t("metadata.spanMonths", { value: span }) : "—"}
        />
      </CardContent>
    </Card>
  );
};

const SourceCard = ({ book }: { book: Book | undefined }) => {
  const { t } = useTranslation();

  return (
    <Card className="sm:col-span-2">
      <CardHeader>
        <CardTitle>{t("metadata.sections.source")}</CardTitle>
      </CardHeader>
      <CardContent>
        <StatRow
          icon={faLayerGroup}
          label={t("metadata.bookId")}
          value={<span className="font-mono text-xs">{book?.id ?? "—"}</span>}
        />
        <StatRow
          icon={faFileInvoiceDollar}
          label={t("metadata.gnucashVersion")}
          value={book?.version ?? "—"}
        />
      </CardContent>
    </Card>
  );
};

const Metadata = () => {
  const { bookId } = useBook();
  const { db } = useDB();
  const { t } = useTranslation();

  const { data: books = [] } = useQuery(booksOptions(db));
  const { data: domainDates } = useQuery(domainOptions(db));

  const book = books.find((b) => b.id === bookId);
  const minDate = domainDates?.min?.toISODate() ?? "—";
  const maxDate = domainDates?.max?.toISODate() ?? "—";

  return (
    <div className="p-4 md:p-10 flex flex-col gap-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("routes.metadata.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("metadata.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LedgerCard book={book} />
        <DateRangeCard minDate={minDate} maxDate={maxDate} />
        <SourceCard book={book} />
      </div>
    </div>
  );
};

export const Route = createFileRoute("/metadata")({
  component: Metadata,
  beforeLoad: async () => {
    return { title: "routes.metadata.title" };
  },
  loader: async ({ location, context: { auth } }) => {
    if (auth && !auth.isAuthenticated()) {
      console.debug("Redirect to login");
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
});
