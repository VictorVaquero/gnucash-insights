interface Nested<T> {
  key: string;
  header: string;
  node: T;
  children: Nested<T>[];
  depth: number;
}

interface ToHierarchyOptions<T, U> {
  key: (d: T) => string;
  header: (d: T) => string;
  parent: (d: T) => string;
  sort: (a: T, b: T) => number;
  func: (d: T) => U;
}

export const toHierarchy = <T, U = T>(
  head: T,
  data: T[],
  options: ToHierarchyOptions<T, U>,
  depth = 0,
): Nested<U> => {
  const { key, header, parent, sort, func } = options;
  const children = data.filter((d) => key(head) == parent(d));
  if (children.length == 0)
    return { key: key(head), header: header(head), node: func(head), children: [], depth: depth };
  return {
    key: key(head),
    header: header(head),
    node: func(head),
    children: children.sort(sort).map((p) => toHierarchy(p, data, options, depth + 1)),
    depth: depth,
  };
};
