import STError from "../../error";
export default class ThirdPartyError extends STError {
    static UNKNOWN_USER_ID_ERROR: "UNKNOWN_USER_ID_ERROR";
    constructor(options: {
        type: "UNKNOWN_USER_ID_ERROR";
        message: string;
    } | {
        type: "BAD_INPUT_ERROR";
        message: string;
    } | {
        type: "GENERAL_ERROR";
        payload: Error;
    }, recipeId: string);
}
