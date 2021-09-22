import Recipe from "./recipe";
import { APIInterface, RecipeInterface, APIOptions } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static createJWT(payload: any, validity?: number): Promise<import("./types").CreateJWTResponse>;
    static getJWKS(): Promise<{
        keys: import("./types").JsonWebKey[];
    }>;
}
export declare let init: typeof Recipe.init;
export declare let createJWT: typeof Wrapper.createJWT;
export declare let getJWKS: typeof Wrapper.getJWKS;
export type { APIInterface, APIOptions, RecipeInterface };
