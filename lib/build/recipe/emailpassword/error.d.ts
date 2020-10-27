import STError from "../../error";
export default class SessionError extends STError {
    constructor(options: {
        type: "GENERAL_ERROR";
        payload: Error;
    }, recipeId: string);
}
