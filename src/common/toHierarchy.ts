interface Nested<T> {
  key: string;
  node: T;
  children: Nested<T>[];
}

export const toHierarchy = <T, U = T>(
  head: T,
  data: T[],
  key: (d: T) => string,
  parent: (d: T) => string,
  sort: (a: T, b: T) => number,
  func: (d: T) => U
): Nested<U> => {
  const children = data.filter((d) => key(head) == parent(d));
  if (children.length == 0)
    return { key: key(head), node: func(head), children: [] };
  return {
    key: key(head),
    node: func(head),
    children: children
      .sort(sort)
      .map((p) => toHierarchy(p, data, key, parent, sort, func)),
  };
};
