import Session from "../../../recipe/session";
import * as supertokens from "../../../lib/build";

export async function handleSession(
    session: { [key: string]: any } | undefined
): Promise<Session.SessionContainer | undefined> {
    if (session !== undefined) {
        return await Session.getSessionWithoutRequestResponse(
            session.accessToken,
            session.userDataInAccessToken?.antiCsrfToken
        );
    }
    return session;
}

export function serializeUser(response) {
    return {
        ...("user" in response && response.user instanceof supertokens.User
            ? {
                  user: response.user.toJson(),
              }
            : {}),
    };
}

export function serializeRecipeUserId(response) {
    return {
        ...("recipeUserId" in response && response.recipeUserId instanceof supertokens.RecipeUserId
            ? {
                  recipeUserId: response.recipeUserId.getAsString(),
              }
            : {}),
    };
}
