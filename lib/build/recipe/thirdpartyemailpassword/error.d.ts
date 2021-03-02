import STError from "../../error";
import RecipeModule from "../../recipeModule";
export default class ThirdPartyEmailPasswordError extends STError {
    static UNKNOWN_USER_ID_ERROR: "UNKNOWN_USER_ID_ERROR";
    static INVALID_PAGINATION_TOKEN: "INVALID_PAGINATION_TOKEN";
    constructor(options: {
        type: "UNKNOWN_USER_ID_ERROR";
        message: string;
    } | {
        type: "BAD_INPUT_ERROR";
        message: string;
    } | {
        type: "GENERAL_ERROR";
        payload: Error;
    } | {
        type: "INVALID_PAGINATION_TOKEN";
        message: string;
    }, recipe: RecipeModule | undefined);
}
