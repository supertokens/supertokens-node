import STError from "../../error";
export default class SessionError extends STError {
    static EMAIL_ALREADY_EXISTS_ERROR: "EMAIL_ALREADY_EXISTS_ERROR";
    static GENERAL_ERROR: "GENERAL_ERROR";
    static BAD_INPUT_ERROR: "BAD_INPUT_ERROR";
    static FIELD_ERROR: "FIELD_ERROR";
    constructor(options: {
        type: "EMAIL_ALREADY_EXISTS_ERROR";
        message: string;
    } | {
        type: "FIELD_ERROR";
        payload: {
            id: string;
            error: string;
        }[];
        message: string;
    } | {
        type: "BAD_INPUT_ERROR";
        message: string;
    } | {
        type: "GENERAL_ERROR";
        payload: Error;
    }, recipeId: string);
}
