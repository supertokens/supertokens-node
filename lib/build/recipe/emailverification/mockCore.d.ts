import { User } from "./types";
import RecipeUserId from "../../recipeUserId";
import { Querier } from "../../querier";
export declare function mockReset(): Promise<void>;
export declare function mockGetEmailVerificationTokenInfo({
    token,
}: {
    token: string;
}): Promise<
    | {
          status: "OK";
          user: User;
      }
    | {
          status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR";
      }
>;
export declare function mockCreateEmailVerificationToken(
    input: {
        recipeUserId: RecipeUserId;
        email: string;
    },
    querier: Querier
): Promise<
    | {
          status: "OK";
          token: string;
      }
    | {
          status: "EMAIL_ALREADY_VERIFIED_ERROR";
      }
>;
