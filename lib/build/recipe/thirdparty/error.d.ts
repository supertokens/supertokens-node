import STError from "../../error";
import RecipeModule from "../../recipeModule";
export default class ThirdPartyError extends STError {
    static UNKNOWN_USER_ID_ERROR: "UNKNOWN_USER_ID_ERROR";
    static NO_EMAIL_GIVEN_BY_PROVIDER: "NO_EMAIL_GIVEN_BY_PROVIDER";
    static FIELD_ERROR: "FIELD_ERROR";
    constructor(options: {
        type: "UNKNOWN_USER_ID_ERROR";
        message: string;
    } | {
        type: "FIELD_ERROR";
        message: string;
    } | {
        type: "NO_EMAIL_GIVEN_BY_PROVIDER";
        message: string;
    } | {
        type: "BAD_INPUT_ERROR";
        message: string;
    } | {
        type: "GENERAL_ERROR";
        payload: Error;
    }, recipe: RecipeModule | undefined);
}
