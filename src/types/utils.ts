/**
 * TTYPES UTILITIES
 * This file contains both built-in TypeScript helpers (for reference)
 * and custom utility types used across the project.
 */

// --- CUSTOM UTILITIES ---

/**
 * Prettify: Flattens complex nested/intersected types into a single object.
 * Hover over a type using this to see the actual properties instead of "TypeA & TypeB"
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * DeepPartial: Makes all properties and nested properties optional.
 * The standard Partial<T> only goes one level deep.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

/**
 * RequireKeys: Takes a type and makes specific keys (K) required.
 */
export type RequireKeys<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/**
 * OptionalKeys: Takes a type and makes specific keys (K) optional.
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// --- BUILT-IN REFERENCE (Documentation Only) ---

/*
  These are globally available in TypeScript, you don't need to define them.
  
  Partial<T>      -> All properties optional
  Required<T>     -> All properties required
  Readonly<T>     -> All properties immutable
  
  Pick<T, K>      -> Choose specific keys K from T
  Omit<T, K>      -> Remove specific keys K from T
  Record<K, T>    -> Map of keys K to values of type T
  
  NonNullable<T>  -> Excludes null and undefined
  ReturnType<T>   -> Gets the return type of a function
  Awaited<T>      -> Unwraps a Promise type
*/
