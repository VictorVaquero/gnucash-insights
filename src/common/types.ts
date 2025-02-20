
type PromiseResolvedType<T> = T extends Promise<infer R> ? R : never;
export type ReturnedPromiseResolvedType<T extends (...args: unknown[]) => unknown> = PromiseResolvedType<ReturnType<T>>