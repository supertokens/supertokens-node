import NormalisedURLPath from "../../normalisedURLPath";
import { Querier } from "../../querier";

let sessionHandles: {
    primaryUserId: string;
    recipeUserId: string;
    sessionHandle: string;
}[] = [];

export async function mockGetRefreshAPIResponse(requestBody: any, querier: any) {
    let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/session/refresh"), requestBody);
    if (response.status === "OK") {
        response.session.recipeUserId = response.session.userId;
        return response;
    } else if (response.status === "UNAUTHORISED") {
        return response;
    } else {
        response.session.recipeUserId = response.session.userId;
        return response;
    }
}

export async function mockCreateNewSession(requestBody: any, querier: any) {
    requestBody.userId = requestBody.recipeUserId;
    let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/session"), requestBody);
    response.session.recipeUserId = response.session.userId;
    sessionHandles.push({
        primaryUserId: requestBody.userId,
        recipeUserId: requestBody.recipeUserId,
        sessionHandle: response.session.handle,
    });
    return response;
}

export async function mockGetSession(requestBody: any, querier: any) {
    let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/session/verify"), requestBody);
    if (response.status === "OK") {
        response.session.recipeUserId = response.session.userId;
        return response;
    } else {
        return response;
    }
}

export async function mockRegenerateSession(accessToken: string, newAccessTokenPayload: any, querier: any) {
    let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/session/regenerate"), {
        accessToken: accessToken,
        userDataInJWT: newAccessTokenPayload,
    });

    if (response.status === "UNAUTHORISED") {
        return response;
    }
    response.session.recipeUserId = response.session.userId;
    return response;
}

export async function mockGetAllSessionHandlesForUser(input: {
    userId: string;
    fetchSessionsForAllLinkedAccounts: boolean;
}): Promise<string[]> {
    let result = [];
    for (let i = 0; i < sessionHandles.length; i++) {
        if (input.fetchSessionsForAllLinkedAccounts) {
            if (sessionHandles[i].primaryUserId === input.userId || sessionHandles[i].recipeUserId === input.userId) {
                result.push(sessionHandles[i].sessionHandle);
            }
        } else {
            if (sessionHandles[i].recipeUserId === input.userId) {
                result.push(sessionHandles[i].sessionHandle);
            }
        }
    }
    return result;
}

export async function mockRevokeAllSessionsForUser(input: {
    userId: string;
    revokeSessionsForLinkedAccounts: boolean;
    querier: Querier;
}): Promise<string[]> {
    let usersToRevokeSessionFor = [input.userId];
    let sessionHandlesRevoked: string[] = [];
    if (input.revokeSessionsForLinkedAccounts) {
        for (let i = 0; i < sessionHandles.length; i++) {
            if (input.revokeSessionsForLinkedAccounts) {
                if (
                    sessionHandles[i].primaryUserId === input.userId ||
                    sessionHandles[i].recipeUserId === input.userId
                ) {
                    usersToRevokeSessionFor.push(sessionHandles[i].recipeUserId);
                }
            }
        }
    }
    for (let i = 0; i < usersToRevokeSessionFor.length; i++) {
        let response = await input.querier.sendPostRequest(new NormalisedURLPath("/recipe/session/remove"), {
            userId: usersToRevokeSessionFor[i],
        });
        sessionHandlesRevoked.push(...response.sessionHandlesRevoked);
    }

    // remove duplicates from sessionHandlesRevoked
    sessionHandlesRevoked = sessionHandlesRevoked.filter((v, i, a) => a.indexOf(v) === i);
    sessionHandles = sessionHandles.filter((v) => !sessionHandlesRevoked.includes(v.sessionHandle));

    return sessionHandlesRevoked;
}
