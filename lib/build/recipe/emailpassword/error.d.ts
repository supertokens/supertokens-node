import STError from "../../error";
export default class SessionError extends STError {
    static EMAIL_ALREADY_EXISTS_ERROR: "EMAIL_ALREADY_EXISTS_ERROR";
    static FIELD_ERROR: "FIELD_ERROR";
    static WRONG_CREDENTIAL_ERROR: "WRONG_CREDENTIAL_ERROR";
    static UNKNOWN_USER_ID_ERROR: "UNKNOWN_USER_ID_ERROR";
    static UNKNOWN_EMAIL_ERROR: "UNKNOWN_EMAIL_ERROR";
    static RESET_PASSWORD_INVALID_TOKEN_ERROR: "RESET_PASSWORD_INVALID_TOKEN_ERROR";
    constructor(options: {
        type: "EMAIL_ALREADY_EXISTS_ERROR" | "WRONG_CREDENTIAL_ERROR" | "UNKNOWN_USER_ID_ERROR" | "UNKNOWN_EMAIL_ERROR" | "RESET_PASSWORD_INVALID_TOKEN_ERROR";
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
