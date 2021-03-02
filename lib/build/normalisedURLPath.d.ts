import RecipeModule from "./recipeModule";
export default class NormalisedURLPath {
    private value;
    constructor(recipe: RecipeModule | undefined, url: string);
    startsWith: (other: NormalisedURLPath) => boolean;
    appendPath: (recipe: RecipeModule | undefined, other: NormalisedURLPath) => NormalisedURLPath;
    getAsStringDangerous: () => string;
    equals: (other: NormalisedURLPath) => boolean;
    isARecipePath: () => boolean;
}
export declare function normaliseURLPathOrThrowError(recipe: RecipeModule | undefined, input: string): string;
