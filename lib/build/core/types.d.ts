// @ts-nocheck
/**
 * This file contains the types for providing automatic type inference
 * for core related method calls that is generated from the OpenAPI spec.
 *
 * This file is not needed for the core driver interface to work, but it is
 * useful for providing type inference for the core related method calls.
 */
import { paths } from "./paths";
export type Method = "get" | "post" | "put" | "delete" | "patch";
type ExtractMethodTypeWithUndefined<P extends keyof paths, M extends Method> = M extends keyof paths[P]
    ? paths[P][M]
    : never;
export type ExtractMethodType<P extends keyof paths, M extends Method> = Exclude<
    ExtractMethodTypeWithUndefined<P, M>,
    undefined
>;
type DeepRequireAllFields<T> = T extends any ? Required<T> : never;
export type RequestBody<P extends keyof paths, M extends Method> = ExtractMethodType<P, M> extends {
    requestBody?: infer ReqBody;
}
    ? ReqBody extends {
          content: {
              "application/json": infer R;
          };
      }
        ? R | undefined
        : undefined
    : undefined;
export type UncleanedResponseBody<P extends keyof paths, M extends Method> = ExtractMethodType<P, M> extends {
    responses: {
        200: {
            content: {
                "application/json": infer R;
            };
        };
    };
}
    ? R
    : unknown;
export type ResponseBody<P extends keyof paths, M extends Method> = DeepRequireAllFields<UncleanedResponseBody<P, M>>;
type ExtractPathParams<T extends string> = T extends `${string}<${infer Param}>${infer Rest}`
    ? Param | ExtractPathParams<Rest>
    : never;
type PathParamsObject<T extends string> = ExtractPathParams<T> extends never
    ? undefined
    : {
          [K in ExtractPathParams<T>]: string;
      };
export type PathParam<P extends keyof paths> =
    | P
    | {
          path: P;
          params: PathParamsObject<P>;
      };
export {};
