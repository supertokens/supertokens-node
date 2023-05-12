// @ts-nocheck
import type { User } from "../../types";
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
