import { queryOptions } from "@tanstack/react-query";

// World Bank's annual CPI inflation indicator for Spain (FP.CPI.TOTL.ZG), the only
// inflation series this app targets today. Free, keyless, permissive CORS.
const CPI_ENDPOINT =
  "https://api.worldbank.org/v2/country/ES/indicator/FP.CPI.TOTL.ZG?format=json&per_page=200";

interface WorldBankObservation {
  date: string;
  value: number | null;
}
type WorldBankResponse = [unknown, WorldBankObservation[] | null];

/** Year -> annual inflation rate as a fraction (e.g. 0.035 for 3.5%). */
export type CpiSeries = Map<number, number>;

export const fetchCpiSeries = async (): Promise<CpiSeries> => {
  const res = await fetch(CPI_ENDPOINT);
  if (!res.ok) throw new Error(`CPI fetch failed: ${res.status}`);
  const [, observations] = (await res.json()) as WorldBankResponse;

  const series: CpiSeries = new Map();
  for (const obs of observations ?? []) {
    if (obs.value == null) continue;
    series.set(Number(obs.date), obs.value / 100);
  }
  return series;
};

export const cpiSeriesOptions = () =>
  queryOptions({
    queryKey: ["cpiSeries", "ES"],
    queryFn: fetchCpiSeries,
    // Annual CPI is revised rarely; avoid re-fetching every session.
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
  });
