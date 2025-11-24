// @ts-nocheck
import STError from "../../error";
import RecipeUserId from "../../recipeUserId";
import { ClaimValidationError } from "./types";
export default class SessionError extends STError {
    static UNAUTHORISED: "UNAUTHORISED";
    static TRY_REFRESH_TOKEN: "TRY_REFRESH_TOKEN";
    static TOKEN_THEFT_DETECTED: "TOKEN_THEFT_DETECTED";
    static INVALID_CLAIMS: "INVALID_CLAIMS";
    static CLEAR_DUPLICATE_SESSION_COOKIES: "CLEAR_DUPLICATE_SESSION_COOKIES";
    constructor(
        options:
            | {
                  message: string;
                  type: "UNAUTHORISED";
                  payload?: {
                      clearTokens: boolean;
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
                      recipeUserId: RecipeUserId;
                      sessionHandle: string;
                  };
              }
            | {
                  message: string;
                  type: "INVALID_CLAIMS";
                  payload: ClaimValidationError[];
              }
            | {
                  message: string;
                  type: "CLEAR_DUPLICATE_SESSION_COOKIES";
              }
    );
}
