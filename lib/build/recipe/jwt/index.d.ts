import Recipe from "./recipe";
import { APIInterface, RecipeInterface, APIOptions, JsonWebKey } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static createJWT(payload: any, validitySeconds?: number): Promise<any>;
    static getJWKS(): Promise<any>;
}
export declare let init: typeof Recipe.init;
export declare let createJWT: typeof Wrapper.createJWT;
export declare let getJWKS: typeof Wrapper.getJWKS;
export type { APIInterface, APIOptions, RecipeInterface, JsonWebKey };
