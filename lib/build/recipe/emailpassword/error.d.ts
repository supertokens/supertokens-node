import STError from "../../error";
export default class SessionError extends STError {
    static EMAIL_ALREADY_EXISTS_ERROR: "EMAIL_ALREADY_EXISTS_ERROR";
    static GENERAL_ERROR: "GENERAL_ERROR";
    static BAD_INPUT_ERROR: "BAD_INPUT_ERROR";
    constructor(options: {
        type: "EMAIL_ALREADY_EXISTS_ERROR";
        message: string;
    } | {
        type: "BAD_INPUT_ERROR";
        message: string;
    } | {
        type: "GENERAL_ERROR";
        payload: Error;
    }, recipeId: string);
}
