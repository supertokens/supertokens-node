import { RecipeInterface, User } from "./";
import { Querier } from "../../querier";
export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    constructor(querier: Querier);
    createEmailVerificationToken: (
        userId: string,
        email: string
    ) => Promise<
        | {
              status: "OK";
              token: string;
          }
        | {
              status: "EMAIL_ALREADY_VERIFIED_ERROR";
          }
    >;
    verifyEmailUsingToken: (
        token: string
    ) => Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR";
          }
    >;
    isEmailVerified: (
        userId: string,
        email: string
    ) => Promise<{
        status: "OK";
        isVerified: boolean;
    }>;
}
