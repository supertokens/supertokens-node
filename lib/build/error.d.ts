import RecipeModule from "./recipeModule";
export default class SuperTokensError {
    private static errMagic;
    static GENERAL_ERROR: "GENERAL_ERROR";
    static BAD_INPUT_ERROR: "BAD_INPUT_ERROR";
    type: string;
    message: string;
    payload: any;
    recipe: RecipeModule | undefined;
    constructor(options: {
        recipe: RecipeModule | undefined;
        message: string;
        payload?: any;
        type: string;
    } | {
        recipe: RecipeModule | undefined;
        payload: Error;
        type: "GENERAL_ERROR";
    } | {
        recipe: RecipeModule | undefined;
        message: string;
        type: "BAD_INPUT_ERROR";
        payload: undefined;
    });
    getRecipeId: () => string;
    static isErrorFromSuperTokens(obj: any): obj is SuperTokensError;
}
