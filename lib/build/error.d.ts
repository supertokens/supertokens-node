// @ts-nocheck
export default class SuperTokensError extends Error {
    private static errMagic;
    static BAD_INPUT_ERROR: "BAD_INPUT_ERROR";
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
            | {
                  message: string;
                  type: "PLUGIN_ERROR";
                  payload: undefined;
              }
    );
    static isErrorFromSuperTokens(obj: any): obj is SuperTokensError;
    static fromError(err: Error, type: string): SuperTokensError;
}
