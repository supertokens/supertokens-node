// @ts-nocheck
import STError from "../../error";
export default class SessionError extends STError {
    static UNAUTHORISED: "UNAUTHORISED";
    static TRY_REFRESH_TOKEN: "TRY_REFRESH_TOKEN";
    static TOKEN_THEFT_DETECTED: "TOKEN_THEFT_DETECTED";
    static MISSING_GRANT: "MISSING_GRANT";
    constructor(
        options:
            | {
                  message: string;
                  type: "UNAUTHORISED";
                  payload?: {
                      clearCookies: boolean;
                  };
              }
            | {
                  message: string;
                  type: "TRY_REFRESH_TOKEN";
              }
            | {
                  message: string;
                  type: "TOKEN_THEFT_DETECTED";
                  payload: {
                      userId: string;
                      sessionHandle: string;
                  };
              }
            | {
                  message: string;
                  type: "MISSING_GRANT";
                  payload: {
                      grantId: string;
                  };
              }
    );
}
