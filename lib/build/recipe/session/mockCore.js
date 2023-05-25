"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockRevokeAllSessionsForUser = exports.mockGetAllSessionHandlesForUser = exports.mockRegenerateSession = exports.mockGetSession = exports.mockAccessTokenPayload = exports.mockCreateNewSession = exports.mockGetRefreshAPIResponse = void 0;
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
let sessionHandles = [];
function mockGetRefreshAPIResponse(requestBody, querier) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield querier.sendPostRequest(
            new normalisedURLPath_1.default("/recipe/session/refresh"),
            requestBody
        );
        if (response.status === "OK") {
            response.session.recipeUserId = response.session.userId;
            return response;
        } else if (response.status === "UNAUTHORISED") {
            return response;
        } else {
            response.session.recipeUserId = response.session.userId;
            return response;
        }
    });
}
exports.mockGetRefreshAPIResponse = mockGetRefreshAPIResponse;
function mockCreateNewSession(requestBody, querier) {
    return __awaiter(this, void 0, void 0, function* () {
        let ogRecipeUserId = requestBody.recipeUserId;
        let ogUserId = requestBody.userId;
        requestBody.userId = requestBody.recipeUserId;
        delete requestBody.recipeUserId;
        let response = yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/session"), requestBody);
        response.session.recipeUserId = ogRecipeUserId;
        response.session.userId = ogUserId;
        sessionHandles.push({
            primaryUserId: ogUserId,
            recipeUserId: ogRecipeUserId,
            sessionHandle: response.session.handle,
        });
        return response;
    });
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
function mockGetSession(requestBody, querier) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield querier.sendPostRequest(
            new normalisedURLPath_1.default("/recipe/session/verify"),
            requestBody
        );
        if (response.status === "OK") {
            for (let i = 0; i < sessionHandles.length; i++) {
                if (response.session.sessionHandle === sessionHandles[i].sessionHandle) {
                    response.session.sub = sessionHandles[i].primaryUserId;
                    response.session.recipeUserId = sessionHandles[i].recipeUserId;
                }
            }
            return response;
        } else {
            return response;
        }
    });
}
exports.mockGetSession = mockGetSession;
function mockRegenerateSession(accessToken, newAccessTokenPayload, querier) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/session/regenerate"), {
            accessToken: accessToken,
            userDataInJWT: newAccessTokenPayload,
        });
        if (response.status === "UNAUTHORISED") {
            return response;
        }
        response.session.recipeUserId = response.session.userId;
        return response;
    });
}
exports.mockRegenerateSession = mockRegenerateSession;
function mockGetAllSessionHandlesForUser(input) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = [];
        for (let i = 0; i < sessionHandles.length; i++) {
            if (input.fetchSessionsForAllLinkedAccounts) {
                if (
                    sessionHandles[i].primaryUserId === input.userId ||
                    sessionHandles[i].recipeUserId === input.userId
                ) {
                    result.push(sessionHandles[i].sessionHandle);
                }
            } else {
                if (sessionHandles[i].recipeUserId === input.userId) {
                    result.push(sessionHandles[i].sessionHandle);
                }
            }
        }
        return result;
    });
}
exports.mockGetAllSessionHandlesForUser = mockGetAllSessionHandlesForUser;
function mockRevokeAllSessionsForUser(input) {
    return __awaiter(this, void 0, void 0, function* () {
        let usersToRevokeSessionFor = [input.userId];
        let sessionHandlesRevoked = [];
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
            let response = yield input.querier.sendPostRequest(
                new normalisedURLPath_1.default("/recipe/session/remove"),
                {
                    userId: usersToRevokeSessionFor[i],
                }
            );
            sessionHandlesRevoked.push(...response.sessionHandlesRevoked);
        }
        // remove duplicates from sessionHandlesRevoked
        sessionHandlesRevoked = sessionHandlesRevoked.filter((v, i, a) => a.indexOf(v) === i);
        sessionHandles = sessionHandles.filter((v) => !sessionHandlesRevoked.includes(v.sessionHandle));
        return sessionHandlesRevoked;
    });
}
exports.mockRevokeAllSessionsForUser = mockRevokeAllSessionsForUser;
