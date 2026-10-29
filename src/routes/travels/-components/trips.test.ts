import { describe, expect, it } from "vitest";

import type { TripSplit } from "@/db/queries/travel";
import { buildTrips } from "./trips";

const split = (o: Partial<TripSplit>): TripSplit => ({
  trip: "Trip:Paris",
  transactionId: "t1",
  date: "2024-05-01",
  description: "Hotel",
  accountId: "a1",
  accountName: "Alojamiento",
  value: 100,
  ...o,
});

describe("buildTrips", () => {
  it("aggregates splits into trips with dates, categories and transactions", () => {
    const trips = buildTrips(
      [
        split({}),
        split({
          transactionId: "t2",
          date: "2024-05-04",
          accountId: "a2",
          accountName: "Comida",
          value: 40,
        }),
        split({
          transactionId: "t2",
          date: "2024-05-04",
          accountId: "a1",
          accountName: "Alojamiento",
          value: 20,
        }),
        split({ trip: "Trip:Rome", transactionId: "t3", date: "2024-08-10", value: -30 }),
      ],
      "Trip:",
    );

    expect(trips.map((t) => t.name)).toEqual(["Rome", "Paris"]); // newest first
    const paris = trips[1];
    expect(paris.start.toISODate()).toBe("2024-05-01");
    expect(paris.end.toISODate()).toBe("2024-05-04");
    expect(paris.days).toBe(4);
    expect(paris.total).toBe(160);
    expect(paris.perDay).toBe(40);
    expect(paris.categories[0]).toMatchObject({ accountName: "Alojamiento", value: 120 });
    expect(paris.transactions).toHaveLength(2);
    expect(paris.transactions[1].categories).toEqual(["Comida", "Alojamiento"]);
    expect(trips[0].total).toBe(30);
  });
});
