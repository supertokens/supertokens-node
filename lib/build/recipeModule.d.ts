import { Querier } from "./querier";
import STError from "./error";
export default abstract class RecipeModule {
    protected recipeId: string;
    constructor(recipeId: string);
    getRecipeId: () => string;
    getQuerier: () => Querier;
    isErrorFromThisRecipe: (err: any) => err is STError;
}
