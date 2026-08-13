import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { buildDeflateFactors, deflateValue } from "@/common/deflate";
import { cpiSeriesOptions } from "@/services/cpiService";
import { useDomain } from "@/hooks/useDB";
import { useInvestmentsPageContext } from "./-investmentsPageContext";

/**
 * Returns a `deflate(value, dateKey)` function that rescales a nominal amount tagged with
 * a "YYYY"/"YYYY-MM"/"YYYY-MM-DD" date key into today's (latest known year's) money, using
 * Spain's annual CPI. When the page's deflate toggle is off, or the CPI data hasn't loaded
 * yet, it's the identity function, so callers can use it unconditionally.
 */
export const useDeflator = () => {
  const { deflate: enabled } = useInvestmentsPageContext();
  const { latestMonth } = useDomain();
  const { data: cpi } = useQuery(cpiSeriesOptions());

  const baseYear = latestMonth?.year;

  const factors = useMemo(() => {
    if (!enabled || !cpi || baseYear == null) return undefined;
    return buildDeflateFactors(cpi, baseYear);
  }, [enabled, cpi, baseYear]);

  const deflate = useCallback(
    (value: number, dateKey: string) => (factors ? deflateValue(value, dateKey, factors) : value),
    [factors],
  );

  return { deflate, isDeflating: !!factors };
};
