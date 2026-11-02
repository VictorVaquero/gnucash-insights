export interface AllocationInput {
  label: string;
  platform: string | null;
  marketValue: number;
  isClosed?: boolean;
}

export interface Slice {
  name: string;
  value: number;
  share: number;
}

const slices = (map: Map<string, number>): Slice[] => {
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return [...map.entries()]
    .map(([name, value]) => ({ name, value, share: total > 0 ? value / total : 0 }))
    .sort((a, b) => b.value - a.value);
};

/** Portfolio split by holding and by platform, ignoring closed or empty positions. */
export const allocation = (holdings: AllocationInput[], noPlatform = "—") => {
  const open = holdings.filter((h) => !h.isClosed && h.marketValue > 0);
  const byHolding = new Map<string, number>();
  const byPlatform = new Map<string, number>();
  for (const h of open) {
    byHolding.set(h.label, (byHolding.get(h.label) ?? 0) + h.marketValue);
    const p = h.platform ?? noPlatform;
    byPlatform.set(p, (byPlatform.get(p) ?? 0) + h.marketValue);
  }
  const holdingsSlices = slices(byHolding);
  return {
    byHolding: holdingsSlices,
    byPlatform: slices(byPlatform),
    /** Share of the largest single holding, 0 when empty. */
    topShare: holdingsSlices[0]?.share ?? 0,
    /** Herfindahl index (1 = all in one holding). */
    hhi: holdingsSlices.reduce((s, x) => s + x.share ** 2, 0),
  };
};
