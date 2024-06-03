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
const { printPath, setupST, startST, killAllST, cleanST, extractInfoFromResponse, resetAll } = require("../utils");
const assert = require("assert");
const SuperTokens = require("../..");
const Session = require("../../recipe/session");
const JWT = require("../../recipe/jwt");
const { maxVersion } = require("../../lib/build/utils");
let { Querier } = require("../../lib/build/querier");
const { parseJWTWithoutSignatureVerification } = require("../../lib/build/recipe/session/jwt");

describe(`Switching useDynamicAccessTokenSigningKey after session creation: ${printPath(
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

    describe("true to false", () => {
        it("should throw when verifying", async () => {
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
                        useDynamicAccessTokenSigningKey: true,
                    }),
                ],
            });

            const createRes = await Session.createNewSessionWithoutRequestResponse(
                "public",
                SuperTokens.convertToRecipeUserId("test-user-id"),
                { tokenProp: true },
                { dbProp: true }
            );
            const tokens = createRes.getAllSessionTokensDangerously();
            checkAccessTokenSigningKeyType(tokens, true);

            resetAll();
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
                        useDynamicAccessTokenSigningKey: false,
                    }),
                ],
            });

            let caught;
            try {
                await Session.getSessionWithoutRequestResponse(tokens.accessToken, tokens.antiCsrfToken);
            } catch (err) {
                caught = err;
            }
            assert.ok(caught);
            assert.strictEqual(
                caught.message,
                "The access token doesn't match the useDynamicAccessTokenSigningKey setting"
            );
        });

        it("should work after refresh", async () => {
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
                        useDynamicAccessTokenSigningKey: true,
                    }),
                ],
            });

            const createRes = await Session.createNewSessionWithoutRequestResponse(
                "public",
                SuperTokens.convertToRecipeUserId("test-user-id"),
                { tokenProp: true },
                { dbProp: true }
            );
            const tokens = createRes.getAllSessionTokensDangerously();
            checkAccessTokenSigningKeyType(tokens, true);

            resetAll();
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
                        useDynamicAccessTokenSigningKey: false,
                    }),
                ],
            });

            const refreshedSession = await Session.refreshSessionWithoutRequestResponse(
                tokens.refreshToken,
                true,
                tokens.antiCsrfToken
            );
            const tokensAfterRefresh = refreshedSession.getAllSessionTokensDangerously();
            assert.strictEqual(tokensAfterRefresh.accessAndFrontTokenUpdated, true);
            checkAccessTokenSigningKeyType(tokensAfterRefresh, false);

            const verifiedSession = await Session.getSessionWithoutRequestResponse(
                tokensAfterRefresh.accessToken,
                tokensAfterRefresh.antiCsrfToken
            );
            const tokensAfterVerify = verifiedSession.getAllSessionTokensDangerously();
            assert.strictEqual(tokensAfterVerify.accessAndFrontTokenUpdated, true);
            checkAccessTokenSigningKeyType(tokensAfterVerify, false);

            const verified2Session = await Session.getSessionWithoutRequestResponse(
                tokensAfterVerify.accessToken,
                tokensAfterVerify.antiCsrfToken
            );
            const tokensAfterVerify2 = verified2Session.getAllSessionTokensDangerously();
            assert.strictEqual(tokensAfterVerify2.accessAndFrontTokenUpdated, false);
        });
    });
});

function checkAccessTokenSigningKeyType(tokens, isDynamic) {
    const info = parseJWTWithoutSignatureVerification(tokens.accessToken);
    if (isDynamic) {
        assert(info.kid.startsWith("d-"));
    } else {
        assert(info.kid.startsWith("s-"));
    }
}
