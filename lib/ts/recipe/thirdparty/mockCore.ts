import type { User } from "../../types";
import { mockGetUser } from "../accountlinking/mockCore";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";

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
