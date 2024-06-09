// @ts-nocheck
import Recipe from "./recipe";
import { APIInterface, RecipeInterface, APIOptions } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
}
export declare let init: typeof Recipe.init;
export type { APIInterface, APIOptions, RecipeInterface };
