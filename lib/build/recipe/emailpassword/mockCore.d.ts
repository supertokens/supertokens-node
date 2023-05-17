// @ts-nocheck
import type { User } from "../../types";
export declare function mockCreatePasswordResetToken(
    email: string,
    userId: string
): Promise<
    | {
          status: "OK";
          token: string;
      }
    | {
          status: "UNKNOWN_USER_ID_ERROR";
      }
>;
export declare function mockConsumePasswordResetToken(
    token: string
): Promise<
    | {
          status: "OK";
          userId: string;
          email: string;
      }
    | {
          status: "RESET_PASSWORD_INVALID_TOKEN_ERROR";
      }
>;
export declare function mockSignIn(input: {
    email: string;
    password: string;
}): Promise<
    | {
          status: "OK";
          user: User;
      }
    | {
          status: "WRONG_CREDENTIALS_ERROR";
      }
>;
export declare function mockCreateRecipeUser(input: {
    email: string;
    password: string;
    userContext: any;
}): Promise<
    | {
          status: "OK";
          user: User;
      }
    | {
          status: "EMAIL_ALREADY_EXISTS_ERROR";
      }
>;
