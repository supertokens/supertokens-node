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
        for (let i = 0; i < sessionHandles.length; i++) {
            if (response.session.handle === sessionHandles[i].sessionHandle) {
                response.session.userId = sessionHandles[i].primaryUserId;
                response.session.recipeUserId = sessionHandles[i].recipeUserId;
            }
        }
        return response;
    } else if (response.status === "UNAUTHORISED") {
        return response;
    } else {
        for (let i = 0; i < sessionHandles.length; i++) {
            if (response.session.handle === sessionHandles[i].sessionHandle) {
                response.session.userId = sessionHandles[i].primaryUserId;
                response.session.recipeUserId = sessionHandles[i].recipeUserId;
            }
        }
        return response;
    }
}

export async function mockCreateNewSession(requestBody: any, querier: any) {
    let ogRecipeUserId = requestBody.recipeUserId;
    let ogUserId = requestBody.userId;
    requestBody.userId = requestBody.recipeUserId;
    delete requestBody.recipeUserId;
    let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/session"), requestBody);
    response.session.recipeUserId = ogRecipeUserId;
    response.session.userId = ogUserId;
    sessionHandles.push({
        primaryUserId: ogUserId,
        recipeUserId: ogRecipeUserId,
        sessionHandle: response.session.handle,
    });
    return response;
}

export function mockAccessTokenPayload(payload: any) {
    if (payload.sessionHandle === undefined) {
        return payload;
    }

    if (payload.sub === undefined) {
        return payload;
    }

    for (let i = 0; i < sessionHandles.length; i++) {
        if (payload.sessionHandle === sessionHandles[i].sessionHandle) {
            payload.sub = sessionHandles[i].primaryUserId;
            payload.recipeUserId = sessionHandles[i].recipeUserId;
        }
    }
    return payload;
}

export async function mockGetSession(requestBody: any, querier: any) {
    let response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/session/verify"), requestBody);
    if (response.status === "OK") {
        for (let i = 0; i < sessionHandles.length; i++) {
            if (response.session.handle === sessionHandles[i].sessionHandle) {
                response.session.userId = sessionHandles[i].primaryUserId;
                response.session.recipeUserId = sessionHandles[i].recipeUserId;
            }
        }
        return response;
    } else {
        return response;
    }
}

export async function mockGetSessionInformation(sessionHandle: string, querier: any) {
    let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/session"), {
        sessionHandle,
    });
    if (response.status === "OK") {
        for (let i = 0; i < sessionHandles.length; i++) {
            if (response.sessionHandle === sessionHandle) {
                response.userId = sessionHandles[i].primaryUserId;
                response.recipeUserId = sessionHandles[i].recipeUserId;
            }
        }
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
            let { mockGetUser } = require("../accountlinking/mockCore");
            let user = await mockGetUser({ userId: input.userId });
            if (user !== undefined) {
                input.userId = user.id;
            }
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
    let usersToRevokeSessionFor = [];
    if (input.revokeSessionsForLinkedAccounts) {
        // we import this way cause of cyclic dependency issues
        let { mockGetUser } = require("../accountlinking/mockCore");
        let user = await mockGetUser({ userId: input.userId });
        if (user !== undefined) {
            input.userId = user.id;
        }
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
    } else {
        usersToRevokeSessionFor = [input.userId];
    }
    let sessionHandlesRevoked: string[] = [];
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
