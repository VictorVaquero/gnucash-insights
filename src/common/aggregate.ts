export function sum<T>(data: T[], f: (d: T) => number): number {
  let total = 0;
  for (const d of data) total += f(d);
  return total;
}

export function groupBy<T, K>(data: T[], keyFn: (d: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const d of data) {
    const k = keyFn(d);
    const arr = map.get(k);
    if (arr) arr.push(d);
    else map.set(k, [d]);
  }
  return map;
}

export function rollup<T, K, R>(data: T[], reducer: (v: T[]) => R, keyFn: (d: T) => K): Map<K, R> {
  const grouped = groupBy(data, keyFn);
  const result = new Map<K, R>();
  for (const [k, v] of grouped) result.set(k, reducer(v));
  return result;
}

export function flatRollup<T, K1, K2, R>(
  data: T[],
  reducer: (v: T[]) => R,
  key1Fn: (d: T) => K1,
  key2Fn: (d: T) => K2,
): [K1, K2, R][] {
  const outer = groupBy(data, key1Fn);
  const result: [K1, K2, R][] = [];
  for (const [k1, items1] of outer) {
    const inner = groupBy(items1, key2Fn);
    for (const [k2, items2] of inner) {
      result.push([k1, k2, reducer(items2)]);
    }
  }
  return result;
}
