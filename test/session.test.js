/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
    stopST,
    killAllST,
    cleanST,
    extractInfoFromResponse,
    setKeyValueInConfig,
} = require("./utils");
let ST = require("../lib/build/session");
let STExpress = require("../index");
let assert = require("assert");
let { Querier } = require("../lib/build/querier");
const nock = require("nock");
let { version } = require("../lib/build/version");
const express = require("express");
const request = require("supertest");
let { HandshakeInfo } = require("../lib/build/handshakeInfo");
let { ProcessState, PROCESS_STATE } = require("../lib/build/processState");

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

    //- check for token theft detection
    it("token theft detection", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });

        let response = await ST.createNewSession("", {}, {});

        let response2 = await ST.refreshSession(response.refreshToken.token);

        await ST.getSession(response2.accessToken.token, response2.antiCsrfToken, true, response2.idRefreshToken.token);

        try {
            await ST.refreshSession(response.refreshToken.token);
            throw new Error("should not have come here");
        } catch (err) {
            if (!ST.Error.isErrorFromAuth(err) || err.errType !== ST.Error.TOKEN_THEFT_DETECTED) {
                throw err;
            }
        }
    });

    it("token theft detection with API key", async function () {
        await setKeyValueInConfig("api_keys", "shfo3h98308hOIHoei309saiho");
        await startST();
        ST.init({
            hosts: "http://localhost:8080",
            apiKey: "shfo3h98308hOIHoei309saiho",
        });

        let response = await ST.createNewSession("", {}, {});

        let response2 = await ST.refreshSession(response.refreshToken.token);

        await ST.getSession(response2.accessToken.token, response2.antiCsrfToken, true, response2.idRefreshToken.token);

        try {
            await ST.refreshSession(response.refreshToken.token);
            throw new Error("should not have come here");
        } catch (err) {
            if (!ST.Error.isErrorFromAuth(err) || err.errType !== ST.Error.TOKEN_THEFT_DETECTED) {
                throw err;
            }
        }
    });

    it("query without API key", async function () {
        await setKeyValueInConfig("api_keys", "shfo3h98308hOIHoei309saiho");
        await startST();
        ST.init({
            hosts: "http://localhost:8080",
        });
        try {
            let version = await Querier.getInstance().getAPIVersion();
            if (version !== "1.0" && version !== "2.0") {
                throw new Error("should not have come here");
            }
        } catch (err) {
            if (
                !ST.Error.isErrorFromAuth(err) ||
                err.errType !== ST.Error.GENERAL_ERROR ||
                err.err.message !== "Request failed with status code 401"
            ) {
                throw err;
            }
        }
    });

    //check basic usage of session
    it("test basic usage of sessions", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });

        let response = await ST.createNewSession("", {}, {});
        assert(response.session !== undefined);
        assert(response.accessToken !== undefined);
        assert(response.refreshToken !== undefined);
        assert(response.idRefreshToken !== undefined);
        assert(response.antiCsrfToken !== undefined);
        assert(Object.keys(response).length === 5);

        await ST.getSession(response.accessToken.token, response.antiCsrfToken, true, response.idRefreshToken.token);
        let verifyState3 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1500);
        assert(verifyState3 === undefined);

        let response2 = await ST.refreshSession(response.refreshToken.token);
        assert(response2.session !== undefined);
        assert(response2.accessToken !== undefined);
        assert(response2.refreshToken !== undefined);
        assert(response2.idRefreshToken !== undefined);
        assert(response2.antiCsrfToken !== undefined);
        assert(Object.keys(response2).length === 5);

        let response3 = await ST.getSession(
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

        let response4 = await ST.getSession(
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

        let response5 = await ST.revokeSession(response4.session.handle);
        assert(response5 === true);
    });

    //check session verify for with / without anti-csrf present
    it("test session verify with anti-csrf present", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        let response = await ST.createNewSession("", {}, {});

        let response2 = await ST.getSession(
            response.accessToken.token,
            response.antiCsrfToken,
            true,
            response.idRefreshToken.token
        );
        assert(response2.session != undefined);
        assert(Object.keys(response2.session).length === 3);

        let response3 = await ST.getSession(
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
        ST.init({ hosts: "http://localhost:8080" });
        let response = await ST.createNewSession("", {}, {});

        //passing anti-csrf token as undefined and anti-csrf check as false
        let response2 = await ST.getSession(response.accessToken.token, undefined, false, response.idRefreshToken);
        assert(response2.session != undefined);
        assert(Object.keys(response2.session).length === 3);

        //passing anti-csrf token as undefined and anti-csrf check as true
        try {
            await ST.getSession(response.accessToken.token, undefined, true, response.idRefreshToken);
            throw new Error("should not have come here");
        } catch (err) {
            if (!ST.Error.isErrorFromAuth(err) || err.errType !== ST.Error.TRY_REFRESH_TOKEN) {
                throw err;
            }
        }
    });

    //check revoking session(s)
    it("test revoking of sessions", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        //create a single session and  revoke using the session handle
        let res = await ST.createNewSession("someUniqueUserId", {}, {});
        let res2 = await ST.revokeSession(res.session.handle);
        assert(res2 === true);
        const CDI_VERSION = await Querier.getInstance().getAPIVersion();

        let res3 = await ST.getAllSessionHandlesForUser("someUniqueUserId");
        assert(res3.length === 0);

        //create multiple sessions with the same userID and use revokeAllSessionsForUser to revoke sessions
        await ST.createNewSession("someUniqueUserId", {}, {});
        await ST.createNewSession("someUniqueUserId", {}, {});

        let sessionIdResponse = await ST.getAllSessionHandlesForUser("someUniqueUserId");
        assert(sessionIdResponse.length === 2);

        let response = await ST.revokeAllSessionsForUser("someUniqueUserId");
        if (CDI_VERSION !== "1.0") {
            assert(response.length === 2);
        } else {
            assert(response === 2);
        }

        sessionIdResponse = await ST.getAllSessionHandlesForUser("someUniqueUserId");
        assert(sessionIdResponse.length === 0);

        //revoke a session with a session handle that does not exist
        let resp = await ST.revokeSession("");
        assert(resp === false);

        //revoke a session with a userId that does not exist
        let resp2 = await ST.revokeAllSessionsForUser("random");
        if (CDI_VERSION !== "1.0") {
            assert(resp2.length === 0);
        } else {
            assert(resp2 === 0);
        }
    });

    //check manipulating session data
    it("test manipulating session data", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        //adding session data
        let res = await ST.createNewSession("", {}, {});
        await ST.updateSessionData(res.session.handle, { key: "value" });

        let res2 = await ST.getSessionData(res.session.handle);
        assert.deepEqual(res2, { key: "value" });

        //changing the value of session data with the same key
        await ST.updateSessionData(res.session.handle, { key: "value 2" });

        let res3 = await ST.getSessionData(res.session.handle);
        assert.deepEqual(res3, { key: "value 2" });

        //passing invalid session handle when updating session data
        try {
            await ST.updateSessionData("random", { key2: "value2" });
        } catch (error) {
            if (!ST.Error.isErrorFromAuth(error) || error.errType !== ST.Error.UNAUTHORISED) {
                throw error;
            }
        }
    });

    //check manipulating jwt payload
    it("test manipulating jwt payload", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        //adding jwt payload
        let res = await ST.createNewSession("", {}, {});

        if ((await Querier.getInstance().getAPIVersion()) !== "1.0") {
            await ST.updateJWTPayload(res.session.handle, { key: "value" });

            let res2 = await ST.getJWTPayload(res.session.handle);
            assert.deepEqual(res2, { key: "value" });

            //changing the value of jwt payload with the same key
            await ST.updateJWTPayload(res.session.handle, { key: "value 2" });

            let res3 = await ST.getJWTPayload(res.session.handle);
            assert.deepEqual(res3, { key: "value 2" });

            //passing invalid session handle when updating jwt payload
            try {
                await ST.updateJWTPayload("random", { key2: "value2" });
                throw new Error();
            } catch (error) {
                if (!ST.Error.isErrorFromAuth(error) || error.errType !== ST.Error.UNAUTHORISED) {
                    throw error;
                }
            }
        } else {
            //passing valid session handle when updating jwt payload
            try {
                await ST.updateJWTPayload(res.session.handle, { key2: "value2" });
                throw new Error();
            } catch (error) {
                if (!ST.Error.isErrorFromAuth(error) || error.errType !== ST.Error.GENERAL_ERROR) {
                    throw error;
                }
            }
            //passing valid session handle when getting jwt payload
            try {
                await ST.getJWTPayload(res.session.handle);
                throw new Error();
            } catch (error) {
                if (!ST.Error.isErrorFromAuth(error) || error.errType !== ST.Error.GENERAL_ERROR) {
                    throw error;
                }
            }
        }
    });

    //if anti-csrf is disabled from ST core, check that not having that in input to verify session is fine**
    it("test that when anti-csrf is disabled from ST core not having that in input to verify session is fine", async function () {
        await setKeyValueInConfig("enable_anti_csrf", "false");
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        let response = await ST.createNewSession("", {}, {});

        //passing anti-csrf token as undefined and anti-csrf check as false
        let response2 = await ST.getSession(response.accessToken.token, undefined, false, response.idRefreshToken);
        assert(response2.session != undefined);
        assert(Object.keys(response2.session).length === 3);

        //passing anti-csrf token as undefined and anti-csrf check as true
        let response3 = await ST.getSession(response.accessToken.token, undefined, true, response.idRefreshToken);
        assert(response3.session != undefined);
        assert(Object.keys(response3.session).length === 3);
    });
});
