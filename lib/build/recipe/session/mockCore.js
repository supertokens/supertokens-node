"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockUpdateAccessTokenPayload = exports.mockRevokeAllSessionsForUser = exports.mockRevokeSession = exports.mockGetAllSessionHandlesForUser = exports.mockRegenerateSession = exports.mockGetSessionInformation = exports.mockGetSession = exports.mockAccessTokenPayload = exports.mockCreateNewSession = exports.mockGetRefreshAPIResponse = exports.mockReset = void 0;
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const jwt_1 = require("./jwt");
let sessionHandles = [];
async function mockReset() {
    sessionHandles = [];
}
exports.mockReset = mockReset;
async function mockGetRefreshAPIResponse(requestBody, querier) {
    let response = await querier.sendPostRequest(
        new normalisedURLPath_1.default("/recipe/session/refresh"),
        requestBody
    );
    if (response.status === "OK") {
        for (let i = 0; i < sessionHandles.length; i++) {
            if (response.session.handle === sessionHandles[i].sessionHandle) {
                response.session.userId = sessionHandles[i].primaryUserId;
                response.session.recipeUserId = sessionHandles[i].recipeUserId;
            }
        }
        if (response.session.recipeUserId === undefined) {
            // this is only there cause there are some tests (like "should help migrating a v2 token using protected props")
            // which create the session in the test directly from the core. Therefore
            // there is no session handle in the mocked map
            response.session.recipeUserId = response.session.userId;
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
exports.mockGetRefreshAPIResponse = mockGetRefreshAPIResponse;
async function mockCreateNewSession(requestBody, querier) {
    if (requestBody.userDataInJWT.recipeUserId !== undefined) {
        throw new Error(
            "SuperTokens core threw an error for a POST request to path: '/recipe/session' with status code: 400 and message: The user payload contains protected field\n"
        );
    }
    let ogRecipeUserId = requestBody.recipeUserId;
    let ogUserId = requestBody.userId;
    requestBody.userId = requestBody.recipeUserId;
    requestBody.userDataInJWT.recipeUserId = requestBody.recipeUserId;
    delete requestBody.recipeUserId;
    let response = await querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/session"), requestBody);
    response.session.recipeUserId = ogRecipeUserId;
    response.session.userId = ogUserId;
    delete response.session.userDataInJWT.recipeUserId;
    sessionHandles.push({
        primaryUserId: ogUserId,
        recipeUserId: ogRecipeUserId,
        sessionHandle: response.session.handle,
    });
    return response;
}
exports.mockCreateNewSession = mockCreateNewSession;
function mockAccessTokenPayload(payload) {
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
exports.mockAccessTokenPayload = mockAccessTokenPayload;
async function mockGetSession(requestBody, querier) {
    let response = await querier.sendPostRequest(
        new normalisedURLPath_1.default("/recipe/session/verify"),
        requestBody
    );
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
exports.mockGetSession = mockGetSession;
async function mockGetSessionInformation(sessionHandle, querier) {
    let response = await querier.sendGetRequest(new normalisedURLPath_1.default("/recipe/session"), {
        sessionHandle,
    });
    if (response.status === "OK") {
        for (let i = 0; i < sessionHandles.length; i++) {
            if (response.sessionHandle === sessionHandle) {
                response.userId = sessionHandles[i].primaryUserId;
                response.recipeUserId = sessionHandles[i].recipeUserId;
            }
        }
        if (response.recipeUserId === undefined) {
            // this is only there cause there are some tests (like "should help migrating a v2 token using protected props when called using session handle")
            // which create the session in the test directly from the core. Therefore
            // there is no session handle in the mocked map
            response.recipeUserId = response.userId;
        }
        if (response.userDataInJWT.recipeUserId !== undefined) {
            delete response.userDataInJWT.recipeUserId;
        }
        return response;
    } else {
        return response;
    }
}
exports.mockGetSessionInformation = mockGetSessionInformation;
async function mockRegenerateSession(accessToken, newAccessTokenPayload, querier) {
    if (newAccessTokenPayload.recipeUserId !== undefined) {
        throw new Error(
            "SuperTokens core threw an error for a POST request to path: '/recipe/session/regenerate' with status code: 400 and message: The user payload contains protected field\n"
        );
    }
    newAccessTokenPayload.recipeUserId = jwt_1.parseJWTWithoutSignatureVerification(accessToken).payload.recipeUserId;
    let response = await querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/session/regenerate"), {
        accessToken: accessToken,
        userDataInJWT: newAccessTokenPayload,
    });
    if (response.status === "UNAUTHORISED") {
        return response;
    }
    response.session.recipeUserId = response.session.userId;
    return response;
}
exports.mockRegenerateSession = mockRegenerateSession;
async function mockGetAllSessionHandlesForUser(input) {
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
exports.mockGetAllSessionHandlesForUser = mockGetAllSessionHandlesForUser;
async function mockRevokeSession(sessionHandle, querier) {
    sessionHandles = sessionHandles.filter((sh) => sh.sessionHandle !== sessionHandle);
    let response = await querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/session/remove"), {
        sessionHandles: [sessionHandle],
    });
    return response.sessionHandlesRevoked.length === 1;
}
exports.mockRevokeSession = mockRevokeSession;
async function mockRevokeAllSessionsForUser(input) {
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
    let sessionHandlesRevoked = [];
    for (let i = 0; i < usersToRevokeSessionFor.length; i++) {
        let response = await input.querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/session/remove"), {
            userId: usersToRevokeSessionFor[i],
        });
        sessionHandlesRevoked.push(...response.sessionHandlesRevoked);
    }
    // remove duplicates from sessionHandlesRevoked
    sessionHandlesRevoked = sessionHandlesRevoked.filter((v, i, a) => a.indexOf(v) === i);
    sessionHandles = sessionHandles.filter((v) => !sessionHandlesRevoked.includes(v.sessionHandle));
    return sessionHandlesRevoked;
}
exports.mockRevokeAllSessionsForUser = mockRevokeAllSessionsForUser;
async function mockUpdateAccessTokenPayload(sessionHandle, newAccessTokenPayload, querier) {
    if (newAccessTokenPayload.recipeUserId !== undefined) {
        throw new Error(
            "SuperTokens core threw an error for a PUT request to path: '/recipe/jwt/data' with status code: 400 and message: The user payload contains protected field\n"
        );
    }
    let response = await querier.sendPutRequest(new normalisedURLPath_1.default("/recipe/jwt/data"), {
        sessionHandle,
        userDataInJWT: newAccessTokenPayload,
    });
    if (response.status === "UNAUTHORISED") {
        return false;
    }
    return true;
}
exports.mockUpdateAccessTokenPayload = mockUpdateAccessTokenPayload;
