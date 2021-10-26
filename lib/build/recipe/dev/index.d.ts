// @ts-nocheck
import Recipe from "./recipe";
import SuperTokensError from "./error";
import { RecipeInterface, APIInterface, APIOptions } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export type { RecipeInterface, APIInterface, APIOptions };
