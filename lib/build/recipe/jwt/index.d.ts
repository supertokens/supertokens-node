// @ts-nocheck
import Recipe from "./recipe";
import { APIInterface, RecipeInterface, APIOptions, JsonWebKey } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static createJWT(
        payload: any,
        validitySeconds?: number,
        useStaticSigningKey?: boolean,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              jwt: string;
          }
        | {
              status: "UNSUPPORTED_ALGORITHM_ERROR";
          }
    >;
    static getJWKS(userContext?: Record<string, any>): Promise<{
        keys: JsonWebKey[];
        validityInSeconds?: number;
    }>;
}
export declare let init: typeof Recipe.init;
export declare let createJWT: typeof Wrapper.createJWT;
export declare let getJWKS: typeof Wrapper.getJWKS;
export type { APIInterface, APIOptions, RecipeInterface, JsonWebKey };
