/**
 * This file contains the types for providing automatic type inference
 * for core related method calls that is generated from the OpenAPI spec.
 *
 * This file is not needed for the core driver interface to work, but it is
 * useful for providing type inference for the core related method calls.
 */

import { paths } from "./paths";

export type Method = "get" | "post" | "put" | "delete" | "patch";

// Type to extract the method type from the paths object
type ExtractMethodTypeWithUndefined<P extends keyof paths, M extends Method> = M extends keyof paths[P]
    ? paths[P][M]
    : never;
export type ExtractMethodType<P extends keyof paths, M extends Method> = Exclude<
    ExtractMethodTypeWithUndefined<P, M>,
    undefined
>;

// Type to ensure that the `status` is a required field instead of
// it being optional. We should use this until the spec is not updated.
// TODO: Remove if we decide to go ahead with MakeAllRequired
// type MakeStatusRequired<T> = T extends { status?: infer S }
//     ? Omit<T, "status"> & { status: S }
//     : T;

// Type to make all fields required. This should be used only if
// it is absolutely guaranteed that the fields are not optional.
type MakeAllRequired<T> = {
    [K in keyof T]-?: NonNullable<T[K]>;
};

// Wrapper around MakeAllRequired to ensure that it is applied recursively
// to all unions.
type DeepRequireAllFields<T> = T extends any ? MakeAllRequired<T> : never;

// Type to extract the request body from the method type
export type RequestBody<P extends keyof paths, M extends Method> =
    ExtractMethodType<P, M> extends {
        requestBody?: infer ReqBody;
    }
        ? ReqBody extends { content: { "application/json": infer R } }
            ? R | undefined
            : undefined
        : undefined;

// Type to extract the response body from the method type
export type UncleanedResponseBody<P extends keyof paths, M extends Method> =
    ExtractMethodType<P, M> extends {
        responses: { 200: { content: { "application/json": infer R } } };
    }
        ? R
        : unknown;

// Type to clean the response body from the method type
export type ResponseBody<P extends keyof paths, M extends Method> = DeepRequireAllFields<UncleanedResponseBody<P, M>>;

// Type to extract the path parameters from the method type
// and enforce them through inference
type ExtractPathParams<T extends string> = T extends `${string}<${infer Param}>${infer Rest}`
    ? Param | ExtractPathParams<Rest>
    : never;

type PathParamsObject<T extends string> =
    ExtractPathParams<T> extends never ? undefined : { [K in ExtractPathParams<T>]: string };

// Type to handle the path parameter
export type PathParam<P extends keyof paths> = P | { path: P; params: PathParamsObject<P> };
