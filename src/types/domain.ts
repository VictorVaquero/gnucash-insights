import type { DateTime } from "luxon";

export type Periodicity = "monthly" | "quarterly" | "yearly";

export interface DateRange {
  from: DateTime<boolean>;
  to: DateTime<boolean>;
}
