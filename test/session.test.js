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
const { maxVersion } = require("../lib/build/utils");
const { fail } = require("assert");
let { middleware, errorHandler } = require("../framework/express");

/* TODO:
- the opposite of the above (check that if signing key changes, things are still fine) condition
- calling createNewSession twice, should overwrite the first call (in terms of cookies)
- calling createNewSession in the case of unauthorised error, should create a proper session
- revoking old session after create new session, should not remove new session's cookies.
- check that if idRefreshToken is not passed to express, verify throws UNAUTHORISED
- check that Access-Control-Expose-Headers header is being set properly during create, use and destroy session**** only for express
*/

describe(`session: ${printPath("[test/session.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    // check if output headers and set cookies for create session is fine
    it("test that output headers and set cookie for create session is fine", async function () {
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

        const app = express();

        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, "", {}, {});
            res.status(200).send("");
        });

        app.use(errorHandler());

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
        assert(res.header["access-control-expose-headers"] === "front-token, id-refresh-token, anti-csrf");

        let cookies = extractInfoFromResponse(res);
        assert(cookies.accessToken !== undefined);
        assert(cookies.refreshToken !== undefined);
        assert(cookies.antiCsrf !== undefined);
        assert(cookies.idRefreshTokenFromHeader !== undefined);
        assert(cookies.idRefreshTokenFromCookie !== undefined);
        assert(cookies.accessTokenExpiry !== undefined);
        assert(cookies.refreshTokenExpiry !== undefined);
        assert(cookies.idRefreshTokenExpiry !== undefined);
        assert(cookies.refreshToken !== undefined);
        assert(cookies.accessTokenDomain === undefined);
        assert(cookies.refreshTokenDomain === undefined);
        assert(cookies.idRefreshTokenDomain === undefined);
        assert(cookies.frontToken !== undefined);
    });

    // check if output headers and set cookies for refresh session is fine
    it("test that output headers and set cookie for refresh session is fine", async function () {
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

        const app = express();
        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, "", {}, {});
            res.status(200).send("");
        });

        app.use(errorHandler());

        let res = extractInfoFromResponse(
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

        let res2 = await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken, "sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(res2.header["access-control-expose-headers"] === "front-token, id-refresh-token, anti-csrf");

        let cookies = extractInfoFromResponse(res2);
        assert(cookies.accessToken !== undefined);
        assert(cookies.refreshToken !== undefined);
        assert(cookies.antiCsrf !== undefined);
        assert(cookies.idRefreshTokenFromHeader !== undefined);
        assert(cookies.idRefreshTokenFromCookie !== undefined);
        assert(cookies.accessTokenExpiry !== undefined);
        assert(cookies.refreshTokenExpiry !== undefined);
        assert(cookies.idRefreshTokenExpiry !== undefined);
        assert(cookies.refreshToken !== undefined);
        assert(cookies.accessTokenDomain === undefined);
        assert(cookies.refreshTokenDomain === undefined);
        assert(cookies.idRefreshTokenDomain === undefined);
        assert(cookies.frontToken !== undefined);
    });

    // check if input cookies are missing, an appropriate error is thrown
    // Failure condition: if valid cookies are set in the refresh call the test will fail
    it("test that if input cookies are missing, an appropriate error is thrown", async function () {
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

        const app = express();
        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, "", {}, {});
            res.status(200).send("");
        });

        app.use(errorHandler());

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

        let res2 = await new Promise((resolve) =>
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
        assert(res2.status === 401);
        assert(JSON.parse(res2.text).message === "unauthorised");
    });

    // check if input cookies are there, no error is thrown
    // Failure condition: if cookies are no set in the refresh call the test will fail
    it("test that if input cookies are there, no error is thrown", async function () {
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

        const app = express();
        app.use(middleware());

        app.post("/create", async (req, res) => {
            await Session.createNewSession(res, "", {}, {});
            res.status(200).send("");
        });

        let res = extractInfoFromResponse(
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

        let res2 = await new Promise((resolve) =>
            request(app)
                .post("/auth/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken, "sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(res2.status === 200);
    });

    //- check for token theft detection
    it("token theft detection", async function () {
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

        try {
            await SessionFunctions.refreshSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
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

    it("token theft detection with API key", async function () {
        await setKeyValueInConfig("api_keys", "shfo3h98308hOIHoei309saiho");
        await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
                apiKey: "shfo3h98308hOIHoei309saiho",
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

        try {
            await SessionFunctions.refreshSession(
                SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
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

    it("query without API key", async function () {
        await setKeyValueInConfig("api_keys", "shfo3h98308hOIHoei309saiho");
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

        try {
            await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion();
            throw new Error("should not have come here");
        } catch (err) {
            if (
                err.message !==
                "SuperTokens core threw an error for a GET request to path: '/apiversion' with status code: 401 and message: Invalid API key\n"
            ) {
                throw err;
            }
        }
    });

    //check basic usage of session
    it("test basic usage of sessions", async function () {
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

        let s = SessionRecipe.getInstanceOrThrowError();

        let response = await SessionFunctions.createNewSession(s.recipeInterfaceImpl, "", {}, {});
        assert(response.session !== undefined);
        assert(response.accessToken !== undefined);
        assert(response.refreshToken !== undefined);
        assert(response.idRefreshToken !== undefined);
        assert(response.antiCsrfToken !== undefined);
        assert(Object.keys(response).length === 5);

        await SessionFunctions.getSession(
            s.recipeInterfaceImpl,
            response.accessToken.token,
            response.antiCsrfToken,
            true,
            response.idRefreshToken.token
        );
        let verifyState3 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1500);
        assert(verifyState3 === undefined);

        let response2 = await SessionFunctions.refreshSession(
            s.recipeInterfaceImpl,
            response.refreshToken.token,
            response.antiCsrfToken
        );
        assert(response2.session !== undefined);
        assert(response2.accessToken !== undefined);
        assert(response2.refreshToken !== undefined);
        assert(response2.idRefreshToken !== undefined);
        assert(response2.antiCsrfToken !== undefined);
        assert(Object.keys(response2).length === 5);

        let response3 = await SessionFunctions.getSession(
            s.recipeInterfaceImpl,
            response2.accessToken.token,
            response2.antiCsrfToken,
            true,
            response.idRefreshToken.token
        );
        let verifyState = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);
        assert(verifyState !== undefined);
        assert(response3.session !== undefined);
        assert(response3.accessToken !== undefined);
        assert(Object.keys(response3).length === 2);

        ProcessState.getInstance().reset();

        let response4 = await SessionFunctions.getSession(
            s.recipeInterfaceImpl,
            response3.accessToken.token,
            response2.antiCsrfToken,
            true,
            response.idRefreshToken.token
        );
        let verifyState2 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1000);
        assert(verifyState2 === undefined);
        assert(response4.session !== undefined);
        assert(response4.accessToken === undefined);
        assert(Object.keys(response4).length === 1);

        let response5 = await SessionFunctions.revokeSession(s.recipeInterfaceImpl, response4.session.handle);
        assert(response5 === true);
    });

    //check session verify for with / without anti-csrf present
    it("test session verify with anti-csrf present", async function () {
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

        let s = SessionRecipe.getInstanceOrThrowError();

        let response = await SessionFunctions.createNewSession(s.recipeInterfaceImpl, "", {}, {});

        let response2 = await SessionFunctions.getSession(
            s.recipeInterfaceImpl,
            response.accessToken.token,
            response.antiCsrfToken,
            true,
            response.idRefreshToken.token
        );
        assert(response2.session != undefined);
        assert(Object.keys(response2.session).length === 3);

        let response3 = await SessionFunctions.getSession(
            s.recipeInterfaceImpl,
            response.accessToken.token,
            response.antiCsrfToken,
            false,
            response.idRefreshToken.token
        );
        assert(response3.session != undefined);
        assert(Object.keys(response3.session).length === 3);
    });

    //check session verify for with / without anti-csrf present**
    it("test session verify without anti-csrf present", async function () {
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

        let s = SessionRecipe.getInstanceOrThrowError();

        let response = await SessionFunctions.createNewSession(s.recipeInterfaceImpl, "", {}, {});

        //passing anti-csrf token as undefined and anti-csrf check as false
        let response2 = await SessionFunctions.getSession(
            s.recipeInterfaceImpl,
            response.accessToken.token,
            undefined,
            false,
            response.idRefreshToken
        );
        assert(response2.session != undefined);
        assert(Object.keys(response2.session).length === 3);

        //passing anti-csrf token as undefined and anti-csrf check as true
        try {
            await SessionFunctions.getSession(
                s.recipeInterfaceImpl,
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

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //create a single session and  revoke using the session handle
        let res = await SessionFunctions.createNewSession(s, "someUniqueUserId", {}, {});
        let res2 = await SessionFunctions.revokeSession(s, res.session.handle);
        assert(res2 === true);

        let res3 = await SessionFunctions.getAllSessionHandlesForUser(s, "someUniqueUserId");
        assert(res3.length === 0);

        //create multiple sessions with the same userID and use revokeAllSessionsForUser to revoke sessions
        await SessionFunctions.createNewSession(s, "someUniqueUserId", {}, {});
        await SessionFunctions.createNewSession(s, "someUniqueUserId", {}, {});

        let sessionIdResponse = await SessionFunctions.getAllSessionHandlesForUser(s, "someUniqueUserId");
        assert(sessionIdResponse.length === 2);

        let response = await SessionFunctions.revokeAllSessionsForUser(s, "someUniqueUserId");
        assert(response.length === 2);

        sessionIdResponse = await SessionFunctions.getAllSessionHandlesForUser(s, "someUniqueUserId");
        assert(sessionIdResponse.length === 0);

        //revoke a session with a session handle that does not exist
        let resp = await SessionFunctions.revokeSession(s, "");
        assert(resp === false);

        //revoke a session with a userId that does not exist
        let resp2 = await SessionFunctions.revokeAllSessionsForUser(s, "random");
        assert(resp2.length === 0);
    });

    //check manipulating session data
    it("test manipulating session data", async function () {
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

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding session data
        let res = await SessionFunctions.createNewSession(s, "", {}, {});
        await SessionFunctions.updateSessionData(s, res.session.handle, { key: "value" });

        let res2 = (await SessionFunctions.getSessionInformation(s, res.session.handle)).sessionData;
        assert.deepEqual(res2, { key: "value" });

        //changing the value of session data with the same key
        await SessionFunctions.updateSessionData(s, res.session.handle, { key: "value 2" });

        let res3 = (await SessionFunctions.getSessionInformation(s, res.session.handle)).sessionData;
        assert.deepEqual(res3, { key: "value 2" });

        //passing invalid session handle when updating session data
        try {
            await SessionFunctions.updateSessionData(s, "random", { key2: "value2" });
            assert(false);
        } catch (error) {
            if (error.type !== Session.Error.UNAUTHORISED) {
                throw error;
            }
        }
    });

    it("test manipulating session data with new get session function", async function () {
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

        let q = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await q.getAPIVersion();

        // Only run test for >= 2.8
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding session data
        let res = await SessionFunctions.createNewSession(s, "", {}, {});
        await SessionFunctions.updateSessionData(s, res.session.handle, { key: "value" });

        let res2 = await SessionFunctions.getSessionInformation(s, res.session.handle);
        assert.deepEqual(res2.sessionData, { key: "value" });

        //changing the value of session data with the same key
        await SessionFunctions.updateSessionData(s, res.session.handle, { key: "value 2" });

        let res3 = await SessionFunctions.getSessionInformation(s, res.session.handle);
        assert.deepEqual(res3.sessionData, { key: "value 2" });

        //passing invalid session handle when updating session data
        try {
            await SessionFunctions.updateSessionData(s, "random", { key2: "value2" });
            assert(false);
        } catch (error) {
            if (error.type !== Session.Error.UNAUTHORISED) {
                throw error;
            }
        }
    });

    it("test null and undefined values passed for session data", async function () {
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

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding session data
        let res = await SessionFunctions.createNewSession(s, "", {}, null);

        let res2 = (await SessionFunctions.getSessionInformation(s, res.session.handle)).sessionData;
        assert.deepStrictEqual(res2, {});

        await SessionFunctions.updateSessionData(s, res.session.handle, { key: "value" });

        let res3 = (await SessionFunctions.getSessionInformation(s, res.session.handle)).sessionData;
        assert.deepStrictEqual(res3, { key: "value" });

        await SessionFunctions.updateSessionData(s, res.session.handle, undefined);

        let res4 = (await SessionFunctions.getSessionInformation(s, res.session.handle)).sessionData;
        assert.deepStrictEqual(res4, {});

        await SessionFunctions.updateSessionData(s, res.session.handle, { key: "value 2" });

        let res5 = (await SessionFunctions.getSessionInformation(s, res.session.handle)).sessionData;
        assert.deepStrictEqual(res5, { key: "value 2" });

        await SessionFunctions.updateSessionData(s, res.session.handle, null);

        let res6 = (await SessionFunctions.getSessionInformation(s, res.session.handle)).sessionData;
        assert.deepStrictEqual(res6, {});
    });

    it("test null and undefined values passed for session data with new get session method", async function () {
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

        let q = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await q.getAPIVersion();

        // Only run test for >= 2.8
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding session data
        let res = await SessionFunctions.createNewSession(s, "", {}, null);

        let res2 = await SessionFunctions.getSessionInformation(s, res.session.handle);
        assert.deepStrictEqual(res2.sessionData, {});

        await SessionFunctions.updateSessionData(s, res.session.handle, { key: "value" });

        let res3 = await SessionFunctions.getSessionInformation(s, res.session.handle);
        assert.deepStrictEqual(res3.sessionData, { key: "value" });

        await SessionFunctions.updateSessionData(s, res.session.handle, undefined);

        let res4 = await SessionFunctions.getSessionInformation(s, res.session.handle);
        assert.deepStrictEqual(res4.sessionData, {});

        await SessionFunctions.updateSessionData(s, res.session.handle, { key: "value 2" });

        let res5 = await SessionFunctions.getSessionInformation(s, res.session.handle);
        assert.deepStrictEqual(res5.sessionData, { key: "value 2" });

        await SessionFunctions.updateSessionData(s, res.session.handle, null);

        let res6 = await SessionFunctions.getSessionInformation(s, res.session.handle);
        assert.deepStrictEqual(res6.sessionData, {});
    });

    //check manipulating jwt payload
    it("test manipulating jwt payload", async function () {
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

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding jwt payload
        let res = await SessionFunctions.createNewSession(s, "", {}, {});

        await SessionFunctions.updateAccessTokenPayload(s, res.session.handle, { key: "value" });

        let res2 = await SessionFunctions.getAccessTokenPayload(s, res.session.handle);
        assert.deepEqual(res2, { key: "value" });

        //changing the value of jwt payload with the same key
        await SessionFunctions.updateAccessTokenPayload(s, res.session.handle, { key: "value 2" });

        let res3 = await SessionFunctions.getAccessTokenPayload(s, res.session.handle);
        assert.deepEqual(res3, { key: "value 2" });

        //passing invalid session handle when updating jwt payload
        try {
            await SessionFunctions.updateAccessTokenPayload(s, "random", { key2: "value2" });
            throw new Error();
        } catch (error) {
            if (error.type !== Session.Error.UNAUTHORISED) {
                throw error;
            }
        }
    });

    it("test manipulating jwt payload with new get session method", async function () {
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

        let q = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await q.getAPIVersion();

        // Only run test for >= 2.8
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding jwt payload
        let res = await SessionFunctions.createNewSession(s, "", {}, {});

        await SessionFunctions.updateAccessTokenPayload(s, res.session.handle, { key: "value" });

        let res2 = await SessionFunctions.getSessionInformation(s, res.session.handle);
        assert.deepEqual(res2.jwtPayload, { key: "value" });

        //changing the value of jwt payload with the same key
        await SessionFunctions.updateAccessTokenPayload(s, res.session.handle, { key: "value 2" });

        let res3 = await SessionFunctions.getSessionInformation(s, res.session.handle);
        assert.deepEqual(res3.jwtPayload, { key: "value 2" });

        //passing invalid session handle when updating jwt payload
        try {
            await SessionFunctions.updateAccessTokenPayload(s, "random", { key2: "value2" });
            throw new Error();
        } catch (error) {
            if (error.type !== Session.Error.UNAUTHORISED) {
                throw error;
            }
        }
    });

    it("test null and undefined values passed for jwt payload", async function () {
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

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding jwt payload
        let res = await SessionFunctions.createNewSession(s, "", null, {});

        let res2 = await SessionFunctions.getAccessTokenPayload(s, res.session.handle);
        assert.deepStrictEqual(res2, {});

        await SessionFunctions.updateAccessTokenPayload(s, res.session.handle, { key: "value" });

        let res3 = await SessionFunctions.getAccessTokenPayload(s, res.session.handle);
        assert.deepStrictEqual(res3, { key: "value" });

        await SessionFunctions.updateAccessTokenPayload(s, res.session.handle);

        let res4 = await SessionFunctions.getAccessTokenPayload(s, res.session.handle, undefined);
        assert.deepStrictEqual(res4, {});

        await SessionFunctions.updateAccessTokenPayload(s, res.session.handle, { key: "value 2" });

        let res5 = await SessionFunctions.getAccessTokenPayload(s, res.session.handle);
        assert.deepStrictEqual(res5, { key: "value 2" });

        await SessionFunctions.updateAccessTokenPayload(s, res.session.handle, null);

        let res6 = await SessionFunctions.getAccessTokenPayload(s, res.session.handle);
        assert.deepStrictEqual(res6, {});
    });

    it("test null and undefined values passed for jwt payload with new get session method", async function () {
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

        let q = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await q.getAPIVersion();

        // Only run test for >= 2.8
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding jwt payload
        let res = await SessionFunctions.createNewSession(s, "", null, {});

        let res2 = await SessionFunctions.getSessionInformation(s, res.session.handle);
        assert.deepStrictEqual(res2.jwtPayload, {});

        await SessionFunctions.updateAccessTokenPayload(s, res.session.handle, { key: "value" });

        let res3 = await SessionFunctions.getSessionInformation(s, res.session.handle);
        assert.deepStrictEqual(res3.jwtPayload, { key: "value" });

        await SessionFunctions.updateAccessTokenPayload(s, res.session.handle);

        let res4 = await SessionFunctions.getSessionInformation(s, res.session.handle, undefined);
        assert.deepStrictEqual(res4.jwtPayload, {});

        await SessionFunctions.updateAccessTokenPayload(s, res.session.handle, { key: "value 2" });

        let res5 = await SessionFunctions.getSessionInformation(s, res.session.handle);
        assert.deepStrictEqual(res5.jwtPayload, { key: "value 2" });

        await SessionFunctions.updateAccessTokenPayload(s, res.session.handle, null);

        let res6 = await SessionFunctions.getSessionInformation(s, res.session.handle);
        assert.deepStrictEqual(res6.jwtPayload, {});
    });

    //if anti-csrf is disabled from ST core, check that not having that in input to verify session is fine**
    it("test that when anti-csrf is disabled from ST core not having that in input to verify session is fine", async function () {
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
                    antiCsrf: "NONE",
                }),
            ],
        });

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        let response = await SessionFunctions.createNewSession(s, "", {}, {});

        //passing anti-csrf token as undefined and anti-csrf check as false
        let response2 = await SessionFunctions.getSession(
            s,
            response.accessToken.token,
            undefined,
            false,
            response.idRefreshToken
        );
        assert(response2.session != undefined);
        assert(Object.keys(response2.session).length === 3);

        //passing anti-csrf token as undefined and anti-csrf check as true
        let response3 = await SessionFunctions.getSession(
            s,
            response.accessToken.token,
            undefined,
            true,
            response.idRefreshToken
        );
        assert(response3.session != undefined);
        assert(Object.keys(response3.session).length === 3);
    });

    it("test that anti-csrf disabled and sameSite none does not throw an error", async function () {
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
                    antiCsrf: "NONE",
                }),
            ],
        });
    });

    it("test that additional property throws an error", async function () {
        await startST();

        try {
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
                        a: "b",
                    }),
                ],
            });
            assert(false);
        } catch (err) {
            if (
                err.message !==
                'Config schema error in session recipe: input config is not allowed to have the additional property "a". Did you mean to set this on the frontend side?'
            ) {
                throw err;
            }
        }
    });

    it("test that anti-csrf disabled and sameSite lax does now throw an error", async function () {
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
                    antiCsrf: "NONE",
                }),
            ],
        });

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        await SessionFunctions.createNewSession(s, "", {}, {});
    });

    it("test that anti-csrf disabled and sameSite strict does now throw an error", async function () {
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
                    antiCsrf: "NONE",
                }),
            ],
        });

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        await SessionFunctions.createNewSession(s, "", {}, {});
    });

    it("test that custom user id is returned correctly", async function () {
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

        let q = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await q.getAPIVersion();

        // Only run test for >= 2.8
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding session data
        let res = await SessionFunctions.createNewSession(s, "customuserid", {}, null);

        let res2 = await SessionFunctions.getSessionInformation(s, res.session.handle);

        assert.strictEqual(res2.userId, "customuserid");
    });

    it("test that get session by session handle payload is correct", async function () {
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

        let q = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await q.getAPIVersion();

        // Only run test for >= 2.8
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding session data
        let res = await SessionFunctions.createNewSession(s, "", {}, null);
        let res2 = await SessionFunctions.getSessionInformation(s, res.session.handle);

        assert(typeof res2.status === "string");
        assert(res2.status === "OK");
        assert(typeof res2.userId === "string");
        assert(typeof res2.sessionData === "object");
        assert(typeof res2.expiry === "number");
        assert(typeof res2.jwtPayload === "object");
        assert(typeof res2.timeCreated === "number");
    });

    it("test that revoked session throws error when calling get session by session handle", async function () {
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

        let q = Querier.getNewInstanceOrThrowError(undefined);
        let apiVersion = await q.getAPIVersion();

        // Only run test for >= 2.8
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        let s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl;
        //adding session data
        let res = await SessionFunctions.createNewSession(s, "someid", {}, null);

        let response = await SessionFunctions.revokeAllSessionsForUser(s, "someid");
        assert(response.length === 1);

        try {
            await SessionFunctions.getSessionInformation(s, res.session.handle);
            assert(false);
        } catch (e) {
            if (e.type !== Session.Error.UNAUTHORISED) {
                throw e;
            }
        }
    });
});
