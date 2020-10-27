export default class SuperTokensError {
    private static errMagic;
    static GENERAL_ERROR: "GENERAL_ERROR";
    static BAD_INPUT_ERROR: "BAD_INPUT_ERROR";
    type: string;
    message: string;
    payload: any;
    rId: string;
    private errMagic;
    constructor(options: {
        rId: string;
        message: string;
        payload?: any;
        type: string;
    } | {
        rId: string;
        payload: Error;
        type: "GENERAL_ERROR";
    } | {
        rId: string;
        message: string;
        type: "BAD_INPUT_ERROR";
        payload: undefined;
    });
    static isErrorFromSuperTokens(obj: any): obj is SuperTokensError;
}
