import STError from "../../error";
import RecipeModule from "../../recipeModule";
export default class SessionError extends STError {
    static EMAIL_ALREADY_VERIFIED_ERROR: "EMAIL_ALREADY_VERIFIED_ERROR";
    static EMAIL_VERIFICATION_INVALID_TOKEN_ERROR: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR";
    constructor(options: {
        type: "EMAIL_ALREADY_VERIFIED_ERROR" | "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR";
        message: string;
    } | {
        type: "BAD_INPUT_ERROR";
        message: string;
    } | {
        type: "GENERAL_ERROR";
        payload: Error;
    }, recipe: RecipeModule | undefined);
}
