import { Querier } from "./querier";
import STError from "./error";
import { NormalisedAppinfo } from "./types";
export default abstract class RecipeModule {
    private recipeId;
    private querier;
    private appInfo;
    constructor(recipeId: string, appInfo: NormalisedAppinfo);
    getRecipeId: () => string;
    getAppInfo: () => NormalisedAppinfo;
    getQuerier: () => Querier;
    isErrorFromThisRecipe: (err: any) => err is STError;
}
