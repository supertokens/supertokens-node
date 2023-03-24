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

    describe("createNewSessionWithoutModifyingResponse", () => {
        it("should create a new session", async () => {
            await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init()],
            });

            const res = await Session.createNewSessionWithoutModifyingResponse(
                "test-user-id",
                { tokenProp: true },
                { dbProp: true }
            );
            assert.strictEqual(res.status, "OK");
            const tokens = res.session.getTokensDangerously();
            assert.strictEqual(tokens.accessAndFrontTokenUpdated, true);
            assert.strictEqual(tokens.antiCsrf, undefined);

            const payload = res.session.getAccessTokenPayload();
            assert.strictEqual(payload.sub, "test-user-id");
            assert.strictEqual(payload.tokenProp, true);

            assert.deepStrictEqual(await res.session.getSessionDataFromDatabase(), { dbProp: true });
        });

        it("should create a new session w/ anti-csrf", async () => {
            await startST();
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

            const res = await Session.createNewSessionWithoutModifyingResponse(
                "test-user-id",
                { tokenProp: true },
                { dbProp: true }
            );
            assert.strictEqual(res.status, "OK");
            const tokens = res.session.getTokensDangerously();
            assert.strictEqual(tokens.accessAndFrontTokenUpdated, true);
            assert.notStrictEqual(tokens.antiCsrf, undefined);

            const payload = res.session.getAccessTokenPayload();
            assert.strictEqual(payload.sub, "test-user-id");
            assert.strictEqual(payload.tokenProp, true);

            assert.deepStrictEqual(await res.session.getSessionDataFromDatabase(), { dbProp: true });
        });
    });

    describe("getSessionWithoutModifyingResponse", () => {
        it("should validate basic access token", async () => {
            await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init()],
            });

            const createRes = await Session.createNewSessionWithoutModifyingResponse("test-user-id");
            const tokens = createRes.session.getTokensDangerously();
            const getSession = await Session.getSessionWithoutModifyingResponse(tokens.accessToken, tokens.antiCsrf);
            assert.strictEqual(getSession.status, "OK");
            /** @type {import("../../recipe/session").SessionContainer} */
            const session = getSession.session;
            const getSessionTokenInfo = session.getTokensDangerously();
            assert.deepStrictEqual(getSessionTokenInfo, {
                accessToken: tokens.accessToken,
                frontToken: tokens.frontToken,
                antiCsrf: tokens.antiCsrf,
                accessAndFrontTokenUpdated: false,
                refreshToken: undefined,
            });
        });

        it("should validate basic access token with anti-csrf", async () => {
            await startST();
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

            const createRes = await Session.createNewSessionWithoutModifyingResponse("test-user-id");
            const tokens = createRes.session.getTokensDangerously();
            const getSession = await Session.getSessionWithoutModifyingResponse(tokens.accessToken, tokens.antiCsrf);
            assert.strictEqual(getSession.status, "OK");
            /** @type {import("../../recipe/session").SessionContainer} */
            const session = getSession.session;
            const getSessionTokenInfo = session.getTokensDangerously();
            assert.deepStrictEqual(getSessionTokenInfo, {
                accessToken: tokens.accessToken,
                frontToken: tokens.frontToken,
                antiCsrf: tokens.antiCsrf,
                accessAndFrontTokenUpdated: false,
                refreshToken: undefined,
            });

            const getSessionWithoutAntiCSRFToken = await Session.getSessionWithoutModifyingResponse(
                tokens.accessToken,
                undefined
            );
            assert.strictEqual(getSessionWithoutAntiCSRFToken.status, "TRY_REFRESH_TOKEN_ERROR");

            const getSessionWithAntiCSRFDisabled = await Session.getSessionWithoutModifyingResponse(
                tokens.accessToken,
                undefined,
                {
                    antiCsrfCheck: false,
                }
            );
            assert.strictEqual(getSessionWithAntiCSRFDisabled.status, "OK");
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

            const res = await Session.getSessionWithoutModifyingResponse("nope");
            assert.strictEqual(res.status, "TOKEN_VALIDATION_ERROR");
        });

        it("should return error for claim validation failures", async () => {
            await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init()],
            });

            const createRes = await Session.createNewSessionWithoutModifyingResponse("test-user-id");
            const tokens = createRes.session.getTokensDangerously();
            const res = await Session.getSessionWithoutModifyingResponse(tokens.accessToken, undefined, {
                overrideGlobalClaimValidators: () => [
                    { id: "test", validate: () => ({ isValid: false, reason: "test" }) },
                ],
            });
            assert.deepStrictEqual(res, {
                invalidClaims: [
                    {
                        id: "test",
                        reason: "test",
                    },
                ],
                status: "CLAIM_VALIDATION_ERROR",
            });
        });
    });

    describe("refreshSessionWithoutModifyingResponse", () => {
        it("should refresh session", async () => {
            await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init()],
            });

            const createRes = await Session.createNewSessionWithoutModifyingResponse(
                "test-user-id",
                { tokenProp: true },
                { dbProp: true }
            );
            const tokens = createRes.session.getTokensDangerously();
            const refreshSession = await Session.refreshSessionWithoutModifyingResponse(
                tokens.refreshToken,
                tokens.antiCsrf
            );
            assert.strictEqual(refreshSession.status, "OK");
            /** @type {import("../../recipe/session").SessionContainer} */
            const session = refreshSession.session;

            const tokensAfterRefresh = session.getTokensDangerously();
            assert.strictEqual(tokensAfterRefresh.accessAndFrontTokenUpdated, true);
            assert.strictEqual(tokensAfterRefresh.antiCsrf, undefined);

            const payload = session.getAccessTokenPayload();
            assert.strictEqual(payload.sub, "test-user-id");
            assert.strictEqual(payload.tokenProp, true);

            assert.deepStrictEqual(await session.getSessionDataFromDatabase(), { dbProp: true });
        });

        it("should work with anti-csrf", async () => {
            await startST();
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

            const createRes = await Session.createNewSessionWithoutModifyingResponse("test-user-id");
            const tokens = createRes.session.getTokensDangerously();

            const refreshSession = await Session.refreshSessionWithoutModifyingResponse(
                tokens.refreshToken,
                false,
                tokens.antiCsrf
            );
            assert.strictEqual(refreshSession.status, "OK");
            /** @type {import("../../recipe/session").SessionContainer} */
            const session = refreshSession.session;
            const tokensAfterRefresh = session.getTokensDangerously();
            assert.strictEqual(tokensAfterRefresh.accessAndFrontTokenUpdated, true);

            const refreshSessionWithoutAntiCSRFToken = await Session.refreshSessionWithoutModifyingResponse(
                tokensAfterRefresh.refreshToken,
                false
            );
            assert.strictEqual(refreshSessionWithoutAntiCSRFToken.status, "UNAUTHORISED");

            const refreshSessionWithDisabledAntiCSRF = await Session.refreshSessionWithoutModifyingResponse(
                tokensAfterRefresh.refreshToken,
                true
            );
            assert.strictEqual(refreshSessionWithDisabledAntiCSRF.status, "OK");
            const tokensAfterRefreshWithDisable = session.getTokensDangerously();
            assert.strictEqual(tokensAfterRefreshWithDisable.accessAndFrontTokenUpdated, true);
        });

        it("should return error for non-tokens", async () => {
            await startST();
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

            const res = await Session.refreshSessionWithoutModifyingResponse("nope");
            assert.strictEqual(res.status, "UNAUTHORISED");
        });
    });
});
