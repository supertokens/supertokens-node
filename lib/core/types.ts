/**
 * This file contains the types for providing automatic type inference
 * for core related method calls that is generated from the OpenAPI spec.
 *
 * This file is not needed for the core driver interface to work, but it is
 * useful for providing type inference for the core related method calls.
 */

import { paths } from "./paths";

export type Method = "get" | "post" | "put" | "delete" | "patch";

export type ExtractMethodType<P extends keyof paths, M extends Method> = M extends keyof paths[P] ? paths[P][M] : never;

export type RequestBody<P extends keyof paths, M extends Method> = ExtractMethodType<P, M> extends {
    requestBody?: infer ReqBody;
}
    ? ReqBody extends { content: { "application/json": infer R } }
        ? R | undefined
        : undefined
    : undefined;

export type ResponseBody<P extends keyof paths, M extends Method> = ExtractMethodType<P, M> extends {
    responses: { 200: { content: { "application/json": infer R } } };
}
    ? R
    : unknown;
