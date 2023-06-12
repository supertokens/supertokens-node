import type { User } from "../../types";
import { mockGetUser, mockListUsersByAccountInfo } from "../accountlinking/mockCore";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import assert from "assert";
import RecipeUserId from "../../recipeUserId";

export async function mockCreateNewOrUpdateEmailOfRecipeUser(
    thirdPartyId: string,
    thirdPartyUserId: string,
    email: string,
    isVerified: boolean,
    querier: Querier
): Promise<
    | { status: "OK"; createdNewUser: boolean; user: User }
    | {
          status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
          reason: string;
      }
> {
    let shouldMarkInputEmailVerified = false;
    let thirdPartyUser = await mockListUsersByAccountInfo({
        accountInfo: {
            thirdParty: {
                id: thirdPartyId,
                userId: thirdPartyUserId,
            },
        },
        doUnionOfAccountInfo: false,
    });

    if (thirdPartyUser.length > 0) {
        assert(thirdPartyUser.length === 1);
        let userBasedOnEmail = await mockListUsersByAccountInfo({
            accountInfo: {
                email,
            },
            doUnionOfAccountInfo: false,
        });
        if (thirdPartyUser[0].isPrimaryUser === true) {
            for (let i = 0; i < userBasedOnEmail.length; i++) {
                if (userBasedOnEmail[i].isPrimaryUser) {
                    if (userBasedOnEmail[i].id !== thirdPartyUser[0].id) {
                        return {
                            status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR",
                            reason: "Email already associated with another primary user.",
                        };
                    } else if (!isVerified) {
                        userBasedOnEmail[i].loginMethods.forEach((loginMethod) => {
                            if (loginMethod.hasSameEmailAs(email) && loginMethod.verified) {
                                shouldMarkInputEmailVerified = true;
                            }
                        });
                    }
                }
            }
        }
    }

    let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/signinup"), {
        thirdPartyId,
        thirdPartyUserId,
        email: { id: email },
    });

    if (response.status === "OK" && (shouldMarkInputEmailVerified || isVerified)) {
        // TODO: this part should ideally be in the backend SDK and not in the core. In the
        // backend SDK, this should be a part of the sign in recipe function, and createNewUser recipe function.

        // We mark this user's email as verified if:
        //  - This is a sign in, their email is unverified, but other linked accounts email is verified.
        //  - This is a sign in or sign in up, and the email is verified from the provider.

        // These asserts are just there to detect bugs.
        if (shouldMarkInputEmailVerified) {
            assert(response.createdNewUser === false);
            assert(!isVerified);
        }

        let recipeUserId: RecipeUserId | undefined = undefined;
        let user = await mockGetUser({
            userId: response.user.id,
        });
        user!.loginMethods.forEach((loginMethod) => {
            if (
                loginMethod.hasSameThirdPartyInfoAs({
                    id: thirdPartyId,
                    userId: thirdPartyUserId,
                })
            ) {
                recipeUserId = loginMethod.recipeUserId;
            }
        });
        let EmailVerification = require("../emailverification");
        try {
            let tokenResp = await EmailVerification.createEmailVerificationToken(recipeUserId!);
            if (tokenResp.status === "OK") {
                // cause we do not want to account link in this function
                await EmailVerification.verifyEmailUsingToken(tokenResp.token, false);
            }
        } catch (err) {
            if (err.message === "Initialisation not done. Did you forget to call the SuperTokens.init function?") {
                // this means email verification is not enabled.. So we just ignore.
            } else {
                throw err;
            }
        }
    }

    return {
        status: "OK",
        createdNewUser: response.createdNewUser,
        user: (await mockGetUser({
            userId: response.user.id,
        }))!,
    };
}
