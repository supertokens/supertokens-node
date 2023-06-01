import { User } from "./types";
import RecipeUserId from "../../recipeUserId";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";

let tokenMap: { [key: string]: User } = {};

export async function mockGetEmailVerificationTokenInfo({
    token,
}: {
    token: string;
}): Promise<{ status: "OK"; user: User } | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" }> {
    if (tokenMap[token] === undefined) {
        return {
            status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR",
        };
    }
    return {
        status: "OK",
        user: tokenMap[token],
    };
}

export async function mockCreateEmailVerificationToken(
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
    | { status: "EMAIL_ALREADY_VERIFIED_ERROR" }
> {
    let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/user/email/verify/token"), {
        userId: input.recipeUserId.getAsString(),
        email: input.email,
    });
    if (response.status === "OK") {
        tokenMap[response.token] = input;
        return {
            status: "OK",
            token: response.token,
        };
    } else {
        return {
            status: "EMAIL_ALREADY_VERIFIED_ERROR",
        };
    }
}
