import type { DateTime } from "luxon";

export type Periodicity = "monthly" | "quarterly" | "yearly";

/** Periods the transaction explorer can group by (the summary tables only have the coarser ones). */
export type FinePeriodicity = Periodicity | "daily" | "weekly";

export interface DateRange {
  from: DateTime<boolean>;
  to: DateTime<boolean>;
}
