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
const {
    printPath,
    setupST,
    startST,
    createServerlessCacheForTesting,
    killAllST,
    cleanST,
    extractInfoFromResponse,
    setKeyValueInConfig,
    killAllSTCoresOnly,
} = require("./utils");
let assert = require("assert");
let { Querier } = require("../lib/build/querier");
const nock = require("nock");
const express = require("express");
const request = require("supertest");
let { ProcessState, PROCESS_STATE } = require("../lib/build/processState");
let SuperTokens = require("../");
let Session = require("../recipe/session");
let SessionFunctions = require("../lib/build/recipe/session/sessionFunctions");
let SessionRecipe = require("../lib/build/recipe/session/recipe").default;
const { removeServerlessCache, maxVersion } = require("../lib/build/utils");
const { fail } = require("assert");

/* TODO:
- the opposite of the above (check that if signing key changes, things are still fine) condition
- calling createNewSession twice, should overwrite the first call (in terms of cookies)
- calling createNewSession in the case of unauthorised error, should create a proper session
- revoking old session after create new session, should not remove new session's cookies.
- check that if idRefreshToken is not passed to express, verify throws UNAUTHORISED
- check that Access-Control-Expose-Headers header is being set properly during create, use and destroy session**** only for express
*/

describe(`sessionAccessTokenSigningKeyUpdate: ${printPath(
    "[test/sessionAccessTokenSigningKeyUpdate.test.js]"
)}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        await createServerlessCacheForTesting();
        await removeServerlessCache();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("check that if signing key changes, things are still fine", async function () {
        await setKeyValueInConfig("access_token_signing_key_update_interval", "0.001"); // 5 seconds is the update interval
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

        let response = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
            "",
            {},
            {}
        );

        {
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
                response.accessToken.token,
                response.antiCsrfToken,
                true,
                response.idRefreshToken.token
            );

            let verifyState = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState === undefined);
        }

        await new Promise((r) => setTimeout(r, 6000));

        {
            try {
                await SessionFunctions.getSession(
                    SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
                    response.accessToken.token,
                    response.antiCsrfToken,
                    true,
                    response.idRefreshToken.token
                );
            } catch (err) {
                if (err.type !== Session.Error.TRY_REFRESH_TOKEN) {
                    throw err;
                }
            }

            let verifyState = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState !== undefined);
        }

        let response2 = await SessionFunctions.refreshSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
            response.refreshToken.token,
            response.antiCsrfToken
        );

        await SessionFunctions.getSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
            response2.accessToken.token,
            response2.antiCsrfToken,
            true,
            response2.idRefreshToken.token
        );

        await ProcessState.getInstance().reset();

        let verifyState = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1500);
        assert(verifyState === undefined);
    });

    it("check that if signing key changes, after new key is fetched - via one old token query, old tokens don't query the core", async function () {
        await setKeyValueInConfig("access_token_signing_key_update_interval", "0.001"); // 5 seconds is the update interval
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

        let response = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
            "",
            {},
            {}
        );

        let response2 = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
            "",
            {},
            {}
        );

        await new Promise((r) => setTimeout(r, 6000));

        {
            try {
                await SessionFunctions.getSession(
                    SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
                    response.accessToken.token,
                    response.antiCsrfToken,
                    true,
                    response.idRefreshToken.token
                );
            } catch (err) {
                if (err.type !== Session.Error.TRY_REFRESH_TOKEN) {
                    throw err;
                }
            }

            let verifyState = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState !== undefined);
        }

        await ProcessState.getInstance().reset();

        {
            try {
                await SessionFunctions.getSession(
                    SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
                    response2.accessToken.token,
                    response2.antiCsrfToken,
                    true,
                    response2.idRefreshToken.token
                );
            } catch (err) {
                if (err.type !== Session.Error.TRY_REFRESH_TOKEN) {
                    throw err;
                }
            }

            let verifyState = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState === undefined);
        }
    });

    it("check that if signing key changes, after new key is fetched - via creation of new token, old tokens don't query the core", async function () {
        await setKeyValueInConfig("access_token_signing_key_update_interval", "0.001"); // 5 seconds is the update interval
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

        let response2 = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
            "",
            {},
            {}
        );

        await new Promise((r) => setTimeout(r, 6000));

        let response = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
            "",
            {},
            {}
        );

        {
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
                response.accessToken.token,
                response.antiCsrfToken,
                true,
                response.idRefreshToken.token
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
                    SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
                    response2.accessToken.token,
                    response2.antiCsrfToken,
                    true,
                    response2.idRefreshToken.token
                );
            } catch (err) {
                if (err.type !== Session.Error.TRY_REFRESH_TOKEN) {
                    throw err;
                }
            }

            let verifyState = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState === undefined);
        }
    });

    it("check that if signing key changes, after new key is fetched - via verification of old token, old tokens don't query the core", async function () {
        await setKeyValueInConfig("access_token_signing_key_update_interval", "0.001"); // 5 seconds is the update interval
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

        let response2 = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
            "",
            {},
            {}
        );

        await new Promise((r) => setTimeout(r, 6000));

        let originalHandShakeInfo = {
            ...SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.handshakeInfo,
        };

        let response = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
            "",
            {},
            {}
        );

        // we reset the handshake info to before the session creation so it's
        // like the above session was created from another server.
        SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.handshakeInfo = originalHandShakeInfo;

        {
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
                response.accessToken.token,
                response.antiCsrfToken,
                true,
                response.idRefreshToken.token
            );

            let verifyState = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState !== undefined);
        }

        await ProcessState.getInstance().reset();

        {
            try {
                await SessionFunctions.getSession(
                    SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
                    response2.accessToken.token,
                    response2.antiCsrfToken,
                    true,
                    response2.idRefreshToken.token
                );
            } catch (err) {
                if (err.type !== Session.Error.TRY_REFRESH_TOKEN) {
                    throw err;
                }
            }

            let verifyState = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState === undefined);
        }
    });

    it("test reducing access token signing key update interval time", async function () {
        await setKeyValueInConfig("access_token_signing_key_update_interval", "0.0041"); // 10 seconds
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

        let session = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
            "",
            {},
            {}
        );

        {
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
                session.accessToken.token,
                session.antiCsrfToken,
                true,
                session.idRefreshToken.token
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

        await setKeyValueInConfig("access_token_signing_key_update_interval", "0.0011"); // update key to 4 seconds

        // start server again
        await startST();

        await new Promise((r) => setTimeout(r, 5 * 1000)); // wait for 5 seconds

        {
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
                session.accessToken.token,
                session.antiCsrfToken,
                true,
                session.idRefreshToken.token
            );

            let verifyState3 = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState3 === undefined);
        }

        // now we create a new session that will use a new key and we will
        // do it in a way that the jwtSigningKey info is not updated (as if another server has created this new session)
        let originalHandShakeInfo = {
            ...SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.handshakeInfo,
        };

        let session2 = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
            "",
            {},
            {}
        );

        // we reset the handshake info to before the session creation so it's
        // like the above session was created from another server.
        SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.handshakeInfo = originalHandShakeInfo;

        // now we will call getSession on session2 and see that the core is called
        {
            // jwt signing key has not expired, according to the SDK, so it should succeed
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
                session2.accessToken.token,
                session2.antiCsrfToken,
                true,
                session2.idRefreshToken.token
            );

            let verifyState3 = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState3 !== undefined);
        }

        ProcessState.getInstance().reset();

        // we will do the same thing, but this time core should not be called
        {
            // jwt signing key has not expired, according to the SDK, so it should succeed
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
                session2.accessToken.token,
                session2.antiCsrfToken,
                true,
                session2.idRefreshToken.token
            );

            let verifyState3 = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState3 === undefined);
        }

        {
            // now we will use the original session again and see that core is not called
            try {
                await SessionFunctions.getSession(
                    SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
                    session.accessToken.token,
                    session.antiCsrfToken,
                    true,
                    session.idRefreshToken.token
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
        }
    });

    it("no access token signing key update", async function () {
        await setKeyValueInConfig("access_token_signing_key_update_interval", "0.0011"); // 4 seconds
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
            recipeList: [
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        let q = Querier.getNewInstanceOrThrowError(false, undefined);
        let apiVersion = await q.getAPIVersion();

        // Only run test for >= 2.8 since the fix for this test is in core with CDI >= 2.8
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        let session = await SessionFunctions.createNewSession(
            SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
            "",
            {},
            {}
        );

        {
            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
                session.accessToken.token,
                session.antiCsrfToken,
                true,
                session.idRefreshToken.token
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
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
                session.accessToken.token,
                session.antiCsrfToken,
                true,
                session.idRefreshToken.token
            );

            let verifyState3 = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert(verifyState3 === undefined);
        }
    });
});
