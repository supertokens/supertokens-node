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
const { printPath, setupST, startST, killAllST, cleanST, setKeyValueInConfig, killAllSTCoresOnly } = require("./utils");
let assert = require("assert");
let { Querier } = require("../lib/build/querier");
let { ProcessState, PROCESS_STATE } = require("../lib/build/processState");
let SuperTokens = require("../");
let Session = require("../recipe/session");
let SessionFunctions = require("../lib/build/recipe/session/sessionFunctions");
let { parseJWTWithoutSignatureVerification } = require("../lib/build/recipe/session/jwt");
let SessionRecipe = require("../lib/build/recipe/session/recipe").default;
const { maxVersion } = require("../lib/build/utils");
const { fail } = require("assert");
const sinon = require("sinon");
const request = require("http");

/* TODO:
- the opposite of the above (check that if signing key changes, things are still fine) condition
- calling createNewSession twice, should overwrite the first call (in terms of cookies)
- calling createNewSession in the case of unauthorised error, should create a proper session
- revoking old session after create new session, should not remove new session's cookies.
- check that Access-Control-Expose-Headers header is being set properly during create, use and destroy session**** only for express
*/

describe(`sessionAccessTokenSigningKeyUpdate: ${printPath(
    "[test/sessionAccessTokenSigningKeyUpdate.test.js]"
)}`, function () {
    let requestSpy;
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
        requestSpy.resetHistory();
    });

    before(() => {
        requestSpy = sinon.spy(request, "get");
    });

    after(async function () {
        requestSpy.restore();
        await killAllST();
        await cleanST();
    });

    it("check that if signing key changes, things are still fine", async function () {
        await setKeyValueInConfig("access_token_dynamic_signing_key_update_interval", "0.001"); // 5 seconds is the update interval
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        let response = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            "",
            undefined,
            false,
            {},
            {}
        );

        {
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
                parseJWTWithoutSignatureVerification(response.accessToken.token),
                response.antiCsrfToken,
                true,
                false
            );

            let verifyState = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState === undefined);
        }

        await new Promise((r) => setTimeout(r, 6000));

        try {
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
                parseJWTWithoutSignatureVerification(response.accessToken.token),
                response.antiCsrfToken,
                true,
                false
            );
        } catch (err) {
            if (err.type !== Session.Error.TRY_REFRESH_TOKEN) {
                throw err;
            } else {
                // Cores supporting multiple signig shouldn't throw since the signing key is still valid
                fail();
            }
        }

        const verifyState = await ProcessState.getInstance().waitForEvent(
            PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
            1500
        );
        assert(verifyState === undefined);

        ProcessState.getInstance().reset();

        const response2 = await SessionFunctions.refreshSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            response.refreshToken.token,
            response.antiCsrfToken,
            false
        );
        assert.strictEqual(requestSpy.callCount, 1);

        await SessionFunctions.getSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            parseJWTWithoutSignatureVerification(response2.accessToken.token),
            response2.antiCsrfToken,
            true,
            false
        );

        // We call verify, since refresh does not refresh the signing key info
        const verifyState2 = await ProcessState.getInstance().waitForEvent(
            PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
            1500
        );
        assert(verifyState2 !== undefined);
        assert.strictEqual(requestSpy.callCount, 2);
    });

    it("check that if signing key changes, after new key is fetched - via token query, old tokens don't query the core", async function () {
        await setKeyValueInConfig("access_token_dynamic_signing_key_update_interval", "0.001"); // 5 seconds is the update interval
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        const oldSession = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            "",
            undefined,
            false,
            {},
            {}
        );

        await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            "",
            undefined,
            false,
            {},
            {}
        );

        await new Promise((r) => setTimeout(r, 6000));

        const newSession = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            "",
            undefined,
            false,
            {},
            {}
        );

        {
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
                parseJWTWithoutSignatureVerification(newSession.accessToken.token),
                newSession.antiCsrfToken,
                true,
                false
            );

            let verifyState = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );

            assert(verifyState === undefined);
            assert.strictEqual(requestSpy.callCount, 1);
            assert(requestSpy.getCall(0).args[0].endsWith("/.well-known/jwks.json"));
        }

        await ProcessState.getInstance().reset();

        {
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
                parseJWTWithoutSignatureVerification(oldSession.accessToken.token),
                oldSession.antiCsrfToken,
                true,
                false
            );

            let verifyState = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState === undefined);
        }
        assert.strictEqual(requestSpy.callCount, 1);
    });

    it("check that if signing key changes, after new key is fetched - via creation of new token, old tokens don't query the core", async function () {
        await setKeyValueInConfig("access_token_dynamic_signing_key_update_interval", "0.001"); // 5 seconds is the update interval
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        let response2 = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            "",
            undefined,
            false,
            {},
            {}
        );

        await new Promise((r) => setTimeout(r, 6000));

        let response = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            "",
            undefined,
            false,
            {},
            {}
        );

        {
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
                parseJWTWithoutSignatureVerification(response.accessToken.token),
                response.antiCsrfToken,
                true,
                false
            );

            let verifyState = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState === undefined);
        }

        await ProcessState.getInstance().reset();

        {
            try {
                await SessionFunctions.getSession(
                    SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
                    parseJWTWithoutSignatureVerification(response2.accessToken.token),
                    response2.antiCsrfToken,
                    true,
                    false
                );
                // Old core versions should throw here because the signing key was updated
            } catch (err) {
                if (err.type !== Session.Error.TRY_REFRESH_TOKEN) {
                    throw err;
                } else {
                    // Cores supporting multiple signig shouldn't throw since the signing key is still valid
                    fail();
                }
            }

            let verifyState = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState === undefined);
        }
        assert.strictEqual(requestSpy.callCount, 1);
    });

    it("check that if signing key changes, after new key is fetched - via verification of old token, old tokens don't query the core", async function () {
        await setKeyValueInConfig("access_token_dynamic_signing_key_update_interval", "0.001"); // 5 seconds is the update interval
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        const currCDIVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion();

        let response2 = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            "",
            undefined,
            false,
            {},
            {}
        );

        await new Promise((r) => setTimeout(r, 6000));

        let response = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            "",
            undefined,
            false,
            {},
            {}
        );

        {
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
                parseJWTWithoutSignatureVerification(response.accessToken.token),
                response.antiCsrfToken,
                true,
                false
            );

            let verifyState = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState === undefined);
            assert.strictEqual(requestSpy.callCount, 1);
            assert(requestSpy.getCall(0).args[0].endsWith("/.well-known/jwks.json"));
        }

        await ProcessState.getInstance().reset();

        {
            try {
                await SessionFunctions.getSession(
                    SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
                    parseJWTWithoutSignatureVerification(response2.accessToken.token),
                    response2.antiCsrfToken,
                    true,
                    false
                );
            } catch (err) {
                if (err.type !== Session.Error.TRY_REFRESH_TOKEN) {
                    throw err;
                } else {
                    // Cores supporting multiple signig shouldn't throw since the signing key is still valid
                    fail();
                }
            }

            let verifyState = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState === undefined);
        }
        assert.strictEqual(requestSpy.callCount, 1);
    });

    it("test reducing access token signing key update interval time", async function () {
        await setKeyValueInConfig("access_token_dynamic_signing_key_update_interval", "0.0041"); // 10 seconds
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        let session = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            "",
            undefined,
            false,
            {},
            {}
        );

        {
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
                parseJWTWithoutSignatureVerification(session.accessToken.token),
                session.antiCsrfToken,
                true,
                false
            );

            let verifyState3 = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState3 === undefined);
        }

        // we kill the core
        await killAllSTCoresOnly();
        await setupST();

        // start server again
        await startST();

        {
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
                parseJWTWithoutSignatureVerification(session.accessToken.token),
                session.antiCsrfToken,
                true,
                false
            );

            let verifyState3 = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState3 === undefined);
        }

        let session2 = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            "",
            undefined,
            false,
            {},
            {}
        );

        // now we will call getSession on session2 and see that the core is called
        {
            // jwt signing key has not expired, according to the SDK, so it should succeed
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
                parseJWTWithoutSignatureVerification(session2.accessToken.token),
                session2.antiCsrfToken,
                true,
                false
            );

            let verifyState3 = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState3 === undefined);
            // we have one at the start as well as now
            assert.strictEqual(requestSpy.callCount, 2);
            assert(requestSpy.getCall(1).args[0].endsWith("/.well-known/jwks.json"));
        }

        ProcessState.getInstance().reset();

        // we will do the same thing, but this time core should not be called
        {
            // jwt signing key has not expired, according to the SDK, so it should succeed
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
                parseJWTWithoutSignatureVerification(session2.accessToken.token),
                session2.antiCsrfToken,
                true,
                false
            );

            let verifyState3 = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState3 === undefined);
        }

        {
            // We should not have called the core jwks endpoint since the last check
            assert.strictEqual(requestSpy.callCount, 2);
            // now we will use the original session again and see that core is not called
            try {
                await SessionFunctions.getSession(
                    SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
                    parseJWTWithoutSignatureVerification(session.accessToken.token),
                    session.antiCsrfToken,
                    true,
                    false
                );
                fail();
            } catch (err) {
                if (err.type !== Session.Error.TRY_REFRESH_TOKEN) {
                    throw err;
                }
            }

            let verifyState3 = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState3 === undefined);
            // We call the jwks endpoint since the key is not in the cache anymore, and we double-check
            assert.strictEqual(requestSpy.callCount, 3);
        }
    });

    it("no access token signing key update", async function () {
        await setKeyValueInConfig("access_token_dynamic_signing_key_update_interval", "0.0011"); // 4 seconds
        await setKeyValueInConfig("access_token_signing_key_dynamic", "false");
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
            recipeList: [Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" })],
        });

        let q = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await q.getAPIVersion();

        // Only run test for >= 2.8 since the fix for this test is in core with CDI >= 2.8
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        let session = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
            "",
            undefined,
            false,
            {},
            {}
        );

        {
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
                parseJWTWithoutSignatureVerification(session.accessToken.token),
                session.antiCsrfToken,
                true,
                false
            );

            let verifyState3 = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState3 === undefined);
        }

        await new Promise((r) => setTimeout(r, 5000)); // wait for 5 seconds

        // it should not query the core anymore even if the jwtSigningKetUpdate interval has passed

        {
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
                parseJWTWithoutSignatureVerification(session.accessToken.token),
                session.antiCsrfToken,
                true,
                false
            );

            let verifyState3 = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState3 === undefined);
        }
        assert.strictEqual(requestSpy.callCount, 1);
    });
});
