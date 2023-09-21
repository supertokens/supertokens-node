/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
const { printPath, setupST, startST, killAllST, cleanST, extractInfoFromResponse } = require("../utils");
const assert = require("assert");
const SuperTokens = require("../..");
const Session = require("../../recipe/session");
const JWT = require("../../recipe/jwt");
const { maxVersion } = require("../../lib/build/utils");
let { Querier } = require("../../lib/build/querier");

describe(`Session handling functions without modifying response: ${printPath(
    "[test/session/sessionHandlingFuncsWithoutReq.test.js]"
)}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("createNewSessionWithoutRequestResponse", () => {
        it("should create a new session", async () => {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init()],
            });

            const res = await Session.createNewSessionWithoutRequestResponse(
                "public",
                SuperTokens.convertToRecipeUserId("test-user-id"),
                { tokenProp: true },
                { dbProp: true }
            );
            assert.ok(res);
            const tokens = res.getAllSessionTokensDangerously();
            assert.strictEqual(tokens.accessAndFrontTokenUpdated, true);
            assert.strictEqual(tokens.antiCsrfToken, undefined);

            const payload = res.getAccessTokenPayload();
            assert.strictEqual(payload.sub, "test-user-id");
            assert.strictEqual(payload.tokenProp, true);
            assert.strictEqual(payload.iss, "https://api.supertokens.io/auth");

            assert.deepStrictEqual(await res.getSessionDataFromDatabase(), { dbProp: true });
        });

        it("should create a new session w/ anti-csrf", async () => {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init({
                        antiCsrf: "VIA_TOKEN",
                    }),
                ],
            });

            const session = await Session.createNewSessionWithoutRequestResponse(
                "public",
                SuperTokens.convertToRecipeUserId("test-user-id"),
                { tokenProp: true },
                { dbProp: true }
            );
            assert.ok(session);
            const tokens = session.getAllSessionTokensDangerously();
            assert.strictEqual(tokens.accessAndFrontTokenUpdated, true);
            assert.notStrictEqual(tokens.antiCsrfToken, undefined);

            const payload = session.getAccessTokenPayload();
            assert.strictEqual(payload.sub, "test-user-id");
            assert.strictEqual(payload.tokenProp, true);

            assert.deepStrictEqual(await session.getSessionDataFromDatabase(), { dbProp: true });
        });
    });

    describe("getSessionWithoutRequestResponse", () => {
        it("should validate basic access token", async () => {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init()],
            });

            const createRes = await Session.createNewSessionWithoutRequestResponse(
                "public",
                SuperTokens.convertToRecipeUserId("test-user-id")
            );
            const tokens = createRes.getAllSessionTokensDangerously();
            const session = await Session.getSessionWithoutRequestResponse(tokens.accessToken, tokens.antiCsrfToken);
            assert.ok(session);
            /** @type {import("../../recipe/session").SessionContainer} */
            const getSessionTokenInfo = session.getAllSessionTokensDangerously();
            assert.deepStrictEqual(getSessionTokenInfo, {
                accessToken: tokens.accessToken,
                frontToken: tokens.frontToken,
                antiCsrfToken: tokens.antiCsrfToken,
                accessAndFrontTokenUpdated: false,
                refreshToken: undefined,
            });
        });

        it("should validate basic access token with anti-csrf", async () => {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init({
                        antiCsrf: "VIA_TOKEN",
                    }),
                ],
            });

            const createRes = await Session.createNewSessionWithoutRequestResponse(
                "public",
                SuperTokens.convertToRecipeUserId("test-user-id")
            );
            const tokens = createRes.getAllSessionTokensDangerously();
            const session = await Session.getSessionWithoutRequestResponse(tokens.accessToken, tokens.antiCsrfToken);

            const getSessionTokenInfo = session.getAllSessionTokensDangerously();
            assert.deepStrictEqual(getSessionTokenInfo, {
                accessToken: tokens.accessToken,
                frontToken: tokens.frontToken,
                antiCsrfToken: tokens.antiCsrfToken,
                accessAndFrontTokenUpdated: false,
                refreshToken: undefined,
            });

            let caught;
            try {
                await Session.getSessionWithoutRequestResponse(tokens.accessToken, undefined);
            } catch (ex) {
                caught = ex;
            }
            assert.ok(caught);
            assert(Session.Error.isErrorFromSuperTokens(caught));
            assert.strictEqual(caught.type, Session.Error.TRY_REFRESH_TOKEN);

            const getSessionWithAntiCSRFDisabled = await Session.getSessionWithoutRequestResponse(
                tokens.accessToken,
                undefined,
                {
                    antiCsrfCheck: false,
                }
            );
            assert.ok(getSessionWithAntiCSRFDisabled);
        });

        it("should validate access tokens created by createJWT", async () => {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init(), JWT.init()],
            });

            const session = await Session.createNewSessionWithoutRequestResponse(
                "public",
                SuperTokens.convertToRecipeUserId("testId")
            );
            const originalPayload = session.getAccessTokenPayload();

            const customAccessToken = await JWT.createJWT(
                {
                    ...originalPayload,
                    exp: undefined,
                    iat: undefined,
                },
                1234,
                false
            );

            const customSession = await Session.getSessionWithoutRequestResponse(customAccessToken.jwt);
            const customPayload = customSession.getAccessTokenPayload();
            assert.strictEqual(customPayload.exp - customPayload.iat, 1234);
        });

        it("should validate access tokens created by createJWT w/ checkDatabase", async () => {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init(), JWT.init()],
            });

            let q = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await q.getAPIVersion();

            // Only run test for >= 3.0 CDI (3.0 is after 2.21)
            if (maxVersion(apiVersion, "2.21") === "2.21") {
                return;
            }

            const session = await Session.createNewSessionWithoutRequestResponse(
                "public",
                SuperTokens.convertToRecipeUserId("testId")
            );
            const originalPayload = session.getAccessTokenPayload();

            const customAccessToken = await JWT.createJWT(
                {
                    ...originalPayload,
                    exp: undefined,
                    iat: undefined,
                    tId: "public",
                },
                1234,
                false
            );

            const customSession = await Session.getSessionWithoutRequestResponse(customAccessToken.jwt, undefined, {
                checkDatabase: true,
            });
            const customPayload = customSession.getAccessTokenPayload();
            assert.strictEqual(customPayload.exp - customPayload.iat, 1234);
        });

        it("should return error for non-tokens", async () => {
            SuperTokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init({
                        antiCsrf: "VIA_TOKEN",
                    }),
                ],
            });

            let caught;
            try {
                await Session.getSessionWithoutRequestResponse("nope");
            } catch (ex) {
                caught = ex;
            }
            assert.ok(caught);
            assert(Session.Error.isErrorFromSuperTokens(caught));
            assert.strictEqual(caught.type, Session.Error.UNAUTHORISED);
        });

        it("should return undefined for non-tokens with requireSession false", async () => {
            SuperTokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init({
                        antiCsrf: "VIA_TOKEN",
                    }),
                ],
            });

            const res = await Session.getSessionWithoutRequestResponse("nope", undefined, { sessionRequired: false });
            assert.strictEqual(res, undefined);
        });

        it("should return error for claim validation failures", async () => {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init()],
            });

            const createRes = await Session.createNewSessionWithoutRequestResponse(
                "public",
                SuperTokens.convertToRecipeUserId("test-user-id")
            );
            const tokens = createRes.getAllSessionTokensDangerously();
            let caught;
            try {
                await Session.getSessionWithoutRequestResponse(tokens.accessToken, undefined, {
                    overrideGlobalClaimValidators: () => [
                        { id: "test", validate: () => ({ isValid: false, reason: "test" }) },
                    ],
                });
            } catch (ex) {
                caught = ex;
            }
            assert.ok(caught);
            assert(Session.Error.isErrorFromSuperTokens(caught));
            assert.strictEqual(caught.type, Session.Error.INVALID_CLAIMS);
        });
    });

    describe("refreshSessionWithoutRequestResponse", () => {
        it("should refresh session", async () => {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init()],
            });

            const createRes = await Session.createNewSessionWithoutRequestResponse(
                "public",
                SuperTokens.convertToRecipeUserId("test-user-id"),
                { tokenProp: true },
                { dbProp: true }
            );
            const tokens = createRes.getAllSessionTokensDangerously();
            const session = await Session.refreshSessionWithoutRequestResponse(
                tokens.refreshToken,
                false,
                tokens.antiCsrfToken
            );
            assert.ok(session);

            const tokensAfterRefresh = session.getAllSessionTokensDangerously();
            assert.strictEqual(tokensAfterRefresh.accessAndFrontTokenUpdated, true);
            assert.strictEqual(tokensAfterRefresh.antiCsrfToken, undefined);

            const payload = session.getAccessTokenPayload();
            assert.strictEqual(payload.sub, "test-user-id");
            assert.strictEqual(payload.tokenProp, true);

            assert.deepStrictEqual(await session.getSessionDataFromDatabase(), { dbProp: true });
        });

        it("should work with anti-csrf", async () => {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init({
                        antiCsrf: "VIA_TOKEN",
                    }),
                ],
            });

            const createRes = await Session.createNewSessionWithoutRequestResponse(
                "public",
                SuperTokens.convertToRecipeUserId("test-user-id")
            );
            const tokens = createRes.getAllSessionTokensDangerously();

            const session = await Session.refreshSessionWithoutRequestResponse(
                tokens.refreshToken,
                false,
                tokens.antiCsrfToken
            );

            assert.ok(session);
            const tokensAfterRefresh = session.getAllSessionTokensDangerously();
            assert.strictEqual(tokensAfterRefresh.accessAndFrontTokenUpdated, true);

            let caught;
            try {
                await Session.refreshSessionWithoutRequestResponse(tokensAfterRefresh.refreshToken, false);
            } catch (ex) {
                caught = ex;
            }
            assert.ok(caught);
            assert(Session.Error.isErrorFromSuperTokens(caught));
            assert.strictEqual(caught.type, Session.Error.UNAUTHORISED);

            const sessionAfterRefreshWithDisabledAntiCsrf = await Session.refreshSessionWithoutRequestResponse(
                tokensAfterRefresh.refreshToken,
                true
            );
            const tokensAfterRefreshWithDisable = sessionAfterRefreshWithDisabledAntiCsrf.getAllSessionTokensDangerously();
            assert.strictEqual(tokensAfterRefreshWithDisable.accessAndFrontTokenUpdated, true);
        });

        it("should return error for non-tokens", async () => {
            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init({
                        antiCsrf: "VIA_TOKEN",
                    }),
                ],
            });

            let caught;
            try {
                await Session.refreshSessionWithoutRequestResponse("nope");
            } catch (ex) {
                caught = ex;
            }
            assert.ok(caught);
            assert(Session.Error.isErrorFromSuperTokens(caught));
            assert.strictEqual(caught.type, Session.Error.UNAUTHORISED);
        });
    });
});
