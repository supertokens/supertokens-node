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
    killAllST,
    cleanST,
    extractInfoFromResponse,
    setKeyValueInConfig,
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
let SessionRecipe = require("../lib/build/recipe/session/sessionRecipe").default;

/* TODO:
- check that if signing key changes, things are still fine
- the opposite of the above condition
- calling createNewSession twice, should overwrite the first call (in terms of cookies)
- calling createNewSession in the case of unauthorised error, should create a proper session
- revoking old session after create new session, should not remove new session's cookies.
- check that if idRefreshToken is not passed to express, verify throws UNAUTHORISED
- check that Access-Control-Expose-Headers header is being set properly during create, use and destroy session**** for express
*/

describe(`session: ${printPath("[test/session.test.js]")}`, function () {
    describe("With default config", function () {
        let app;

        before(async function () {
            await killAllST();
            await setupST();
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

            app = express();

            app.use(SuperTokens.middleware());

            app.post("/create", async (req, res) => {
                await Session.createNewSession(res, "", {}, {});
                res.status(200).send("");
            });

            app.use(SuperTokens.errorHandler());
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        it("test that output headers and set cookie for create session is fine", async function () {
            let res = await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.deepStrictEqual(
                res.header["access-control-expose-headers"],
                "front-token, id-refresh-token, anti-csrf"
            );

            let cookies = extractInfoFromResponse(res);
            assert.notDeepStrictEqual(cookies.accessToken, undefined);
            assert.notDeepStrictEqual(cookies.refreshToken, undefined);
            assert.notDeepStrictEqual(cookies.antiCsrf, undefined);
            assert.notDeepStrictEqual(cookies.idRefreshTokenFromHeader, undefined);
            assert.notDeepStrictEqual(cookies.idRefreshTokenFromCookie, undefined);
            assert.notDeepStrictEqual(cookies.accessTokenExpiry, undefined);
            assert.notDeepStrictEqual(cookies.refreshTokenExpiry, undefined);
            assert.notDeepStrictEqual(cookies.idRefreshTokenExpiry, undefined);
            assert.notDeepStrictEqual(cookies.refreshToken, undefined);
            assert.deepStrictEqual(cookies.accessTokenDomain, undefined);
            assert.deepStrictEqual(cookies.refreshTokenDomain, undefined);
            assert.deepStrictEqual(cookies.idRefreshTokenDomain, undefined);
            assert.notDeepStrictEqual(cookies.frontToken, undefined);
        });

        it("test that output headers and set cookie for refresh session is fine", async function () {
            const res = extractInfoFromResponse(
                await new Promise((resolve) =>
                    request(app)
                        .post("/create")
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                )
            );

            const res2 = await new Promise((resolve) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.deepStrictEqual(
                res2.header["access-control-expose-headers"],
                "front-token, id-refresh-token, anti-csrf"
            );

            let cookies = extractInfoFromResponse(res2);
            assert.notStrictEqual(cookies.accessToken, undefined);
            assert.notStrictEqual(cookies.refreshToken, undefined);
            assert.notStrictEqual(cookies.antiCsrf, undefined);
            assert.notStrictEqual(cookies.idRefreshTokenFromHeader, undefined);
            assert.notStrictEqual(cookies.idRefreshTokenFromCookie, undefined);
            assert.notStrictEqual(cookies.accessTokenExpiry, undefined);
            assert.notStrictEqual(cookies.refreshTokenExpiry, undefined);
            assert.notStrictEqual(cookies.idRefreshTokenExpiry, undefined);
            assert.notStrictEqual(cookies.refreshToken, undefined);
            assert.deepStrictEqual(cookies.accessTokenDomain, undefined);
            assert.deepStrictEqual(cookies.refreshTokenDomain, undefined);
            assert.deepStrictEqual(cookies.idRefreshTokenDomain, undefined);
            assert.notStrictEqual(cookies.frontToken, undefined);
        });

        // Failure condition: if valid cookies are set in the refresh call the test will fail
        it("test that if input cookies are missing, an appropriate error is thrown", async function () {
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            const refreshSessionResult = await new Promise((resolve) =>
                request(app)
                    .post("/auth/session/refresh")
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.deepStrictEqual(refreshSessionResult.status, 401);
            assert.deepStrictEqual(JSON.parse(refreshSessionResult.text).message, "unauthorised");
        });

        // Failure condition: if cookies are no set in the refresh call the test will fail
        it("test that if input cookies are there, no error is thrown", async function () {
            const createSessionResponse = extractInfoFromResponse(
                await new Promise((resolve) =>
                    request(app)
                        .post("/create")
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                )
            );

            let sessionRefreshResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + createSessionResponse.refreshToken])
                    .set("anti-csrf", createSessionResponse.antiCsrf)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.deepStrictEqual(sessionRefreshResponse.status, 200);
        });

        it("token theft detection", async function () {
            let response = await SessionFunctions.createNewSession(SessionRecipe.getInstanceOrThrowError(), "", {}, {});

            let response2 = await SessionFunctions.refreshSession(
                SessionRecipe.getInstanceOrThrowError(),
                response.refreshToken.token,
                response.antiCsrfToken
            );

            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError(),
                response2.accessToken.token,
                response2.antiCsrfToken,
                true,
                response2.idRefreshToken.token
            );

            try {
                await SessionFunctions.refreshSession(
                    SessionRecipe.getInstanceOrThrowError(),
                    response.refreshToken.token,
                    response.antiCsrfToken
                );
                throw new Error("should not have come here");
            } catch (err) {
                if (err.type !== Session.Error.TOKEN_THEFT_DETECTED) {
                    throw err;
                }
            }
        });

        it("test basic usage of sessions", async function () {
            const s = SessionRecipe.getInstanceOrThrowError();

            let response = await SessionFunctions.createNewSession(s, "", {}, {});
            assert.notStrictEqual(response.session, undefined);
            assert.notStrictEqual(response.accessToken, undefined);
            assert.notStrictEqual(response.refreshToken, undefined);
            assert.notStrictEqual(response.idRefreshToken, undefined);
            assert.notStrictEqual(response.antiCsrfToken, undefined);
            assert.deepStrictEqual(Object.keys(response).length, 5);

            await SessionFunctions.getSession(
                s,
                response.accessToken.token,
                response.antiCsrfToken,
                true,
                response.idRefreshToken.token
            );
            let verifyState3 = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1500
            );
            assert.deepStrictEqual(verifyState3, undefined);

            let response2 = await SessionFunctions.refreshSession(
                s,
                response.refreshToken.token,
                response.antiCsrfToken
            );
            assert.notStrictEqual(response2.session, undefined);
            assert.notStrictEqual(response2.accessToken, undefined);
            assert.notStrictEqual(response2.refreshToken, undefined);
            assert.notStrictEqual(response2.idRefreshToken, undefined);
            assert.notStrictEqual(response2.antiCsrfToken, undefined);
            assert.deepStrictEqual(Object.keys(response2).length, 5);

            let response3 = await SessionFunctions.getSession(
                s,
                response2.accessToken.token,
                response2.antiCsrfToken,
                true,
                response.idRefreshToken.token
            );
            let verifyState = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);
            assert.notStrictEqual(verifyState, undefined);
            assert.notStrictEqual(response3.session, undefined);
            assert.notStrictEqual(response3.accessToken, undefined);
            assert.deepStrictEqual(Object.keys(response3).length, 2);

            ProcessState.getInstance().reset();

            let response4 = await SessionFunctions.getSession(
                s,
                response3.accessToken.token,
                response2.antiCsrfToken,
                true,
                response.idRefreshToken.token
            );
            let verifyState2 = await ProcessState.getInstance().waitForEvent(
                PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
                1000
            );
            assert.deepStrictEqual(verifyState2, undefined);
            assert.notStrictEqual(response4.session, undefined);
            assert.deepStrictEqual(response4.accessToken, undefined);
            assert.deepStrictEqual(Object.keys(response4).length, 1);

            let response5 = await SessionFunctions.revokeSession(s, response4.session.handle);
            assert.deepStrictEqual(response5, true);
        });

        //check session verify for with / without anti-csrf present
        it("test session verify with anti-csrf present", async function () {
            const s = SessionRecipe.getInstanceOrThrowError();

            let response = await SessionFunctions.createNewSession(s, "", {}, {});

            let response2 = await SessionFunctions.getSession(
                s,
                response.accessToken.token,
                response.antiCsrfToken,
                true,
                response.idRefreshToken.token
            );
            assert.notDeepStrictEqual(response2.session, undefined);
            assert.deepStrictEqual(Object.keys(response2.session).length, 3);

            let response3 = await SessionFunctions.getSession(
                s,
                response.accessToken.token,
                response.antiCsrfToken,
                false,
                response.idRefreshToken.token
            );
            assert.notDeepStrictEqual(response3.session, undefined);
            assert.deepStrictEqual(Object.keys(response3.session).length, 3);
        });

        //check session verify for with / without anti-csrf present**
        it("test session verify without anti-csrf present", async function () {
            const s = SessionRecipe.getInstanceOrThrowError();

            let response = await SessionFunctions.createNewSession(s, "", {}, {});

            //passing anti-csrf token as undefined and anti-csrf check as false
            let response2 = await SessionFunctions.getSession(
                s,
                response.accessToken.token,
                undefined,
                false,
                response.idRefreshToken
            );
            assert.notDeepStrictEqual(response2.session, undefined);
            assert.deepStrictEqual(Object.keys(response2.session).length, 3);

            //passing anti-csrf token as undefined and anti-csrf check as true
            try {
                await SessionFunctions.getSession(
                    s,
                    response.accessToken.token,
                    undefined,
                    true,
                    response.idRefreshToken
                );
                throw new Error("should not have come here");
            } catch (err) {
                if (err.type !== Session.Error.TRY_REFRESH_TOKEN) {
                    throw err;
                }
            }
        });

        //check revoking session(s)
        it("test revoking of sessions", async function () {
            const s = SessionRecipe.getInstanceOrThrowError();
            //create a single session and  revoke using the session handle
            let res = await SessionFunctions.createNewSession(s, "someUniqueUserId", {}, {});
            let res2 = await SessionFunctions.revokeSession(s, res.session.handle);
            assert.deepStrictEqual(res2, true);

            let res3 = await SessionFunctions.getAllSessionHandlesForUser(s, "someUniqueUserId");
            assert.deepStrictEqual(res3.length, 0);

            //create multiple sessions with the same userID and use revokeAllSessionsForUser to revoke sessions
            await SessionFunctions.createNewSession(s, "someUniqueUserId", {}, {});
            await SessionFunctions.createNewSession(s, "someUniqueUserId", {}, {});

            let sessionIdResponse = await SessionFunctions.getAllSessionHandlesForUser(s, "someUniqueUserId");
            assert.deepStrictEqual(sessionIdResponse.length, 2);

            let response = await SessionFunctions.revokeAllSessionsForUser(s, "someUniqueUserId");
            assert.deepStrictEqual(response.length, 2);

            sessionIdResponse = await SessionFunctions.getAllSessionHandlesForUser(s, "someUniqueUserId");
            assert.deepStrictEqual(sessionIdResponse.length, 0);

            //revoke a session with a session handle that does not exist
            let resp = await SessionFunctions.revokeSession(s, "");
            assert.deepStrictEqual(resp, false);

            //revoke a session with a userId that does not exist
            let resp2 = await SessionFunctions.revokeAllSessionsForUser(s, "random");
            assert.deepStrictEqual(resp2.length, 0);
        });

        //check manipulating session data
        it("test manipulating session data", async function () {
            const s = SessionRecipe.getInstanceOrThrowError();
            //adding session data
            let res = await SessionFunctions.createNewSession(s, "", {}, {});
            await SessionFunctions.updateSessionData(s, res.session.handle, { key: "value" });

            let res2 = await SessionFunctions.getSessionData(s, res.session.handle);
            assert.deepStrictEqual(res2, { key: "value" });

            //changing the value of session data with the same key
            await SessionFunctions.updateSessionData(s, res.session.handle, { key: "value 2" });

            let res3 = await SessionFunctions.getSessionData(s, res.session.handle);
            assert.deepStrictEqual(res3, { key: "value 2" });

            //passing invalid session handle when updating session data
            try {
                await SessionFunctions.updateSessionData(s, "random", { key2: "value2" });
                assert.deepStrictEqual(false);
            } catch (error) {
                if (error.type !== Session.Error.UNAUTHORISED) {
                    throw error;
                }
            }
        });

        //check manipulating jwt payload
        it("test manipulating jwt payload", async function () {
            const s = SessionRecipe.getInstanceOrThrowError();
            //adding jwt payload
            let res = await SessionFunctions.createNewSession(s, "", {}, {});

            await SessionFunctions.updateJWTPayload(s, res.session.handle, { key: "value" });

            let res2 = await SessionFunctions.getJWTPayload(s, res.session.handle);
            assert.deepStrictEqual(res2, { key: "value" });

            //changing the value of jwt payload with the same key
            await SessionFunctions.updateJWTPayload(s, res.session.handle, { key: "value 2" });

            let res3 = await SessionFunctions.getJWTPayload(s, res.session.handle);
            assert.deepStrictEqual(res3, { key: "value 2" });

            //passing invalid session handle when updating jwt payload
            try {
                await SessionFunctions.updateJWTPayload(s, "random", { key2: "value2" });
                throw new Error();
            } catch (error) {
                if (error.type !== Session.Error.UNAUTHORISED) {
                    throw error;
                }
            }
        });
    });

    describe("With API Key", function () {
        let app;

        before(async function () {
            const apiKey = "shfo3h98308hOIHoei309saiho";
            await killAllST();
            await setupST();
            await setKeyValueInConfig("api_keys", apiKey);
            await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                    apiKey,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init()],
            });

            app = express();

            app.use(SuperTokens.middleware());

            app.use(SuperTokens.errorHandler());
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        it("token theft detection with API key", async function () {
            const response = await SessionFunctions.createNewSession(
                SessionRecipe.getInstanceOrThrowError(),
                "",
                {},
                {}
            );

            let response2 = await SessionFunctions.refreshSession(
                SessionRecipe.getInstanceOrThrowError(),
                response.refreshToken.token,
                response.antiCsrfToken
            );

            await SessionFunctions.getSession(
                SessionRecipe.getInstanceOrThrowError(),
                response2.accessToken.token,
                response2.antiCsrfToken,
                true,
                response2.idRefreshToken.token
            );

            try {
                await SessionFunctions.refreshSession(
                    SessionRecipe.getInstanceOrThrowError(),
                    response.refreshToken.token,
                    response.antiCsrfToken
                );
                throw new Error("should not have come here");
            } catch (err) {
                if (err.type !== Session.Error.TOKEN_THEFT_DETECTED) {
                    throw err;
                }
            }
        });
    });

    describe("With API Key in core configs", function () {
        let app;

        before(async function () {
            const apiKey = "shfo3h98308hOIHoei309saiho";
            await killAllST();
            await setupST();
            await setKeyValueInConfig("api_keys", apiKey);
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

            app = express();

            app.use(SuperTokens.middleware());

            app.use(SuperTokens.errorHandler());
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        it("query without API key", async function () {
            try {
                await Querier.getInstanceOrThrowError("").getAPIVersion();
                throw new Error("should not have come here");
            } catch (err) {
                if (
                    err.type !== Session.Error.GENERAL_ERROR ||
                    err.message !==
                        "SuperTokens core threw an error for a GET request to path: '/apiversion' with status code: 401 and message: Invalid API key\n"
                ) {
                    throw err;
                }
            }
        });
    });

    describe("With CSRF disabled and cookie = sameSite none", function () {
        let app;

        before(async function () {
            await killAllST();
            await setupST();
            await setKeyValueInConfig("enable_anti_csrf", "false");
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
                        cookieSameSite: "none",
                    }),
                ],
            });

            app = express();

            app.use(SuperTokens.middleware());

            app.use(SuperTokens.errorHandler());
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        it("test that anti-csrf disabled and sameSite none throws an error", async function () {
            const session = SessionRecipe.getInstanceOrThrowError();

            try {
                await SessionFunctions.createNewSession(session, "", {}, {});
                assert.deepStrictEqual(false);
            } catch (err) {
                if (
                    err.type !== Session.Error.GENERAL_ERROR ||
                    err.message !==
                        'Security error: Cookie same site is "none" and anti-CSRF protection is disabled! Please either: \n- Change cookie same site to "lax" or to "strict". or \n- Enable anti-CSRF protection in the core by setting enable_anti_csrf to true.'
                ) {
                    throw error;
                }
            }
        });
    });

    describe("With CSRF disabled and cookie = sameSite none", function () {
        before(async function () {
            await killAllST();
            await setupST();
            await setKeyValueInConfig("enable_anti_csrf", "false");
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
                        cookieSameSite: "none",
                    }),
                ],
            });
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });
    });

    describe("With CSRF disabled in the core but default node config", function () {
        before(async function () {
            await killAllST();
            await setupST();
            await setKeyValueInConfig("enable_anti_csrf", "false");
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
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        it("test that when anti-csrf is disabled from ST core not having that in input to verify session is fine", async function () {
            const s = SessionRecipe.getInstanceOrThrowError();
            let response = await SessionFunctions.createNewSession(s, "", {}, {});

            //passing anti-csrf token as undefined and anti-csrf check as false
            let response2 = await SessionFunctions.getSession(
                s,
                response.accessToken.token,
                undefined,
                false,
                response.idRefreshToken
            );
            assert.notDeepStrictEqual(response2.session, undefined);
            assert.deepStrictEqual(Object.keys(response2.session).length, 3);

            //passing anti-csrf token as undefined and anti-csrf check as true
            let response3 = await SessionFunctions.getSession(
                s,
                response.accessToken.token,
                undefined,
                true,
                response.idRefreshToken
            );
            assert.notDeepStrictEqual(response3.session, undefined);
            assert.deepStrictEqual(Object.keys(response3.session).length, 3);
        });
    });

    describe("With CSRF disabled in the core and cookieSameSite lax", function () {
        before(async function () {
            await killAllST();
            await setupST();
            await setKeyValueInConfig("enable_anti_csrf", "false");
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
                        cookieSameSite: "lax",
                    }),
                ],
            });
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        it("test that anti-csrf disabled and sameSite lax does now throw an error", async function () {
            let s = SessionRecipe.getInstanceOrThrowError();
            await SessionFunctions.createNewSession(s, "", {}, {});
        });
    });

    describe("With CSRF disabled in the core and cookieSameSite lax", function () {
        before(async function () {
            await killAllST();
            await setupST();
            await setKeyValueInConfig("enable_anti_csrf", "false");
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
                        cookieSameSite: "strict",
                    }),
                ],
            });
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        it("test that anti-csrf disabled and sameSite strict does now throw an error", async function () {
            let s = SessionRecipe.getInstanceOrThrowError();
            await SessionFunctions.createNewSession(s, "", {}, {});
        });
    });
});
