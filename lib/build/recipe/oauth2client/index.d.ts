// @ts-nocheck
import Recipe from "./recipe";
import { RecipeInterface, APIInterface, APIOptions } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
}
export declare let init: typeof Recipe.init;
export type { RecipeInterface, APIInterface, APIOptions };
