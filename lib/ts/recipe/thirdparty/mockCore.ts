import type { User } from "../../types";
import { mockGetUser, mockListUsersByAccountInfo } from "../accountlinking/mockCore";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import assert from "assert";

export async function mockCreateNewOrUpdateEmailOfRecipeUser(
    thirdPartyId: string,
    thirdPartyUserId: string,
    email: string,
    querier: Querier
): Promise<
    | { status: "OK"; createdNewUser: boolean; user: User }
    | {
          status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
          reason: string;
      }
> {
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
        if (thirdPartyUser[0].isPrimaryUser === true) {
            let userBasedOnEmail = await mockListUsersByAccountInfo({
                accountInfo: {
                    email,
                },
                doUnionOfAccountInfo: false,
            });

            for (let i = 0; i < userBasedOnEmail.length; i++) {
                if (userBasedOnEmail[i].isPrimaryUser && userBasedOnEmail[i].id !== thirdPartyUser[0].id) {
                    return {
                        status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR",
                        reason: "Email already associated with another primary user.",
                    };
                }
            }
        }
    }

    let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/signinup"), {
        thirdPartyId,
        thirdPartyUserId,
        email: { id: email },
    });

    return {
        status: "OK",
        createdNewUser: response.createdNewUser,
        user: (await mockGetUser({
            userId: response.user.id,
        }))!,
    };
}
