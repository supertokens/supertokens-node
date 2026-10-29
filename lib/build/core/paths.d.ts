// @ts-nocheck
import { paths as pathsV5_4 } from "./versions/5.4/schema";
import { paths as pathsV5_5 } from "./versions/5.5/schema";
import { paths as pathsV5_6 } from "./versions/5.6/schema";
import { paths as pathsV5_7 } from "./versions/5.7/schema";
type MergeMethods<M1, M2> = {
    [K in keyof M1 | keyof M2]: K extends keyof M1 ? K extends keyof M2 ? M1[K] | M2[K] : M1[K] : K extends keyof M2 ? M2[K] : never;
};
type MergePaths<P1, P2> = {
    [K in keyof P1 | keyof P2]: K extends keyof P1 ? K extends keyof P2 ? MergeMethods<P1[K], P2[K]> : P1[K] : K extends keyof P2 ? P2[K] : never;
};
type MergeManyPaths<T extends Record<string, any>[]> = T extends [infer First, ...infer Rest] ? First extends Record<string, any> ? Rest extends Record<string, any>[] ? MergePaths<First, MergeManyPaths<Rest>> : First : never : {};
export type paths = MergeManyPaths<[pathsV5_4, pathsV5_5, pathsV5_6, pathsV5_7]>;
export {};
