import RecipeModule from './recipeModule';
export default class NormalisedURLDomain {
    private value;
    constructor(recipe: RecipeModule | undefined, url: string);
    getAsStringDangerous: () => string;
}
export declare function normaliseURLDomainOrThrowError(recipe: RecipeModule | undefined, input: string, ignoreProtocol?: boolean): string;
