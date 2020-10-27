import STError from "../../error";
export default class SessionError extends STError {
    static EMAIL_ALREADY_EXISTS_ERROR: "EMAIL_ALREADY_EXISTS_ERROR";
    constructor(options: {
        type: "EMAIL_ALREADY_EXISTS_ERROR";
        message: string;
    } | {
        type: "GENERAL_ERROR";
        payload: Error;
    }, recipeId: string);
}
