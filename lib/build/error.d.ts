// @ts-nocheck
export default class SuperTokensError extends Error {
    private static errMagic;
    static BAD_INPUT_ERROR: "BAD_INPUT_ERROR";
    static UNKNOWN_ERROR: "UNKNOWN_ERROR";
    static PLUGIN_ERROR: "PLUGIN_ERROR";
    type: string;
    payload: any;
    fromRecipe: string | undefined;
    private errMagic;
    constructor(
        options:
            | {
                  message: string;
                  payload?: any;
                  type: string;
              }
            | {
                  message: string;
                  type: "BAD_INPUT_ERROR";
                  payload: undefined;
              }
    );
    static isErrorFromSuperTokens(obj: any): obj is SuperTokensError | SuperTokensPluginError;
}
export declare class SuperTokensPluginError extends SuperTokensError {
    code: number;
    constructor(options: { message: string; payload?: any; code?: number });
}
export declare const transformErrorToSuperTokensError: (err: any) => SuperTokensError;
