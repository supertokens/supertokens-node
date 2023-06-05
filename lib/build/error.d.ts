// @ts-nocheck
export default class SuperTokensError extends Error {
    private static errMagic;
    static BAD_INPUT_ERROR: "BAD_INPUT_ERROR";
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
    static isErrorFromSuperTokens(obj: any): obj is SuperTokensError;
}
