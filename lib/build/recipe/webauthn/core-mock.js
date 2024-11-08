"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMockQuerier = void 0;
const querier_1 = require("../../querier");
const getMockQuerier = (recipeId) => {
    const querier = querier_1.Querier.getNewInstanceOrThrowError(recipeId);
    const sendPostRequest = async (path, body, userContext) => {
        console.log("body", body);
        console.log("userContext", userContext);
        if (path.getAsStringDangerous().includes("/recipe/webauthn/options/register")) {
            // @ts-ignore
            return {
                status: "OK",
                webauthnGeneratedOptionsId: "7ab03f6a-61b8-4f65-992f-b8b8469bc18f",
                rp: { id: "example.com", name: "Example App" },
                user: { id: "dummy-user-id", name: "user@example.com", displayName: "User" },
                challenge: "dummy-challenge",
                timeout: 60000,
                excludeCredentials: [],
                attestation: "none",
                pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                authenticatorSelection: {
                    requireResidentKey: false,
                    residentKey: "preferred",
                    userVerification: "preferred",
                },
            };
        } else if (path.getAsStringDangerous().includes("/recipe/webauthn/options/signin")) {
            // @ts-ignore
            return {
                status: "OK",
                webauthnGeneratedOptionsId: "18302759-87c6-4d88-990d-c7cab43653cc",
                challenge: "dummy-signin-challenge",
                timeout: 60000,
                userVerification: "preferred",
            };
            // } else if (path.getAsStringDangerous().includes("/recipe/webauthn/user/recover/token")) {
            //     // @ts-ignore
            //     return {
            //         status: "OK",
            //         token: "dummy-recover-token",
            //     };
            // } else if (path.getAsStringDangerous().includes("/recipe/webauthn/user/recover/token/consume")) {
            //     // @ts-ignore
            //     return {
            //         status: "OK",
            //         userId: "dummy-user-id",
            //         email: "user@example.com",
            //     };
            // }
        } else if (path.getAsStringDangerous().includes("/recipe/webauthn/signup")) {
            // @ts-ignore
            return {
                status: "OK",
                user: {
                    id: "dummy-user-id",
                    email: "user@example.com",
                    timeJoined: Date.now(),
                },
                recipeUserId: "dummy-recipe-user-id",
            };
        } else if (path.getAsStringDangerous().includes("/recipe/webauthn/signin")) {
            // @ts-ignore
            return {
                status: "OK",
                user: {
                    id: "dummy-user-id",
                    email: "user@example.com",
                    timeJoined: Date.now(),
                },
                recipeUserId: "dummy-recipe-user-id",
            };
        }
        throw new Error(`Unmocked endpoint: ${path}`);
    };
    querier.sendPostRequest = sendPostRequest;
    return querier;
};
exports.getMockQuerier = getMockQuerier;
