import STError from "../../error";
export default class SessionError extends STError {
    static UNAUTHORISED: "UNAUTHORISED";
    static TRY_REFRESH_TOKEN: "TRY_REFRESH_TOKEN";
    static TOKEN_THEFT_DETECTED: "TOKEN_THEFT_DETECTED";
    static GENERAL_ERROR: "GENERAL_ERROR";
    constructor(options: {
        message: string;
        type: "UNAUTHORISED";
    } | {
        message: string;
        type: "TRY_REFRESH_TOKEN";
    } | {
        message: string;
        type: "TOKEN_THEFT_DETECTED";
        payload: {
            userId: string;
            sessionHandle: string;
        };
    } | {
        type: "GENERAL_ERROR";
        payload: Error;
    });
    static isErrorFromSession(obj: any): obj is SessionError;
}
