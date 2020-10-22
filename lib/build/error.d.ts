export default class SuperTokensError {
    private static errMagic;
    static GENERAL_ERROR: "GENERAL_ERROR";
    type: string;
    message: string;
    payload: any;
    rId: string;
    constructor(options: {
        rId: string;
        message: string;
        payload?: any;
        type: string;
    } | {
        rId: string;
        payload: Error;
        type: "GENERAL_ERROR";
    });
    static isErrorFromSuperTokens(obj: any): obj is SuperTokensError;
}
