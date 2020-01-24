const { printPath, setupST, startST, stopST, killAllST, cleanST, extractInfoFromResponse } = require("./utils");
let ST = require("../session");
let STExpress = require("../index");
let assert = require("assert");
const nock = require("nock");
let { version } = require("../lib/build/version");
const express = require("express");
const request = require("supertest");
let { HandshakeInfo } = require("../lib/build/handshakeInfo");
let { ProcessState, PROCESS_STATE } = require("../lib/build/processState");

describe(`session: ${printPath("[test/session.test.js]")}`, function() {
    beforeEach(async function() {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function() {
        await killAllST();
        await cleanST();
    });

    //- check for token theft detection
    it("token theft detection", async function() {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);

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

    //check basic usage of session** W/IE
    it("test basic usage of sessions", async function() {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);

        let response = await ST.createNewSession("", {}, {});
        assert(response.session !== undefined);
        assert(response.accessToken !== undefined);
        assert(response.refreshToken !== undefined);
        assert(response.idRefreshToken !== undefined);
        assert(response.antiCsrfToken !== undefined);
        assert(Object.keys(response).length === 5);

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

        let response5 = await ST.revokeSessionUsingSessionHandle(response4.session.handle);
        assert(response5 === true);
    });

    //check session verify for with / without anti-csrf present**
    it("test session verify with anti-csrf present", async function() {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);
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
    it("test session verify without anti-csrf present", async function() {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);
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

    //check revoking session(s)**
    it("test revoking of sessions", async function() {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);
        //create a single session and  revoke using the session handle
        let res = await ST.createNewSession("", {}, {});
        let res2 = await ST.revokeSessionUsingSessionHandle(res.session.handle);
        assert(res2 === true);

        //create multiple sessions with the same userID and use revokeAllSessionsForUser to revoke sessions
        await ST.createNewSession("id", {}, {});
        await ST.createNewSession("id", {}, {});
        let response = await ST.revokeAllSessionsForUser("id");
        assert(response === 2);

        //revoke a session with a session handle that does not exist
        let resp = await ST.revokeSessionUsingSessionHandle("");
        assert(resp === false);

        //revoke a session with a userId that does not exist
        let resp2 = await ST.revokeAllSessionsForUser("fiefi");
        assert(resp2 === 0);

        //passing json input isntead of the session handle
        try {
            await ST.revokeSessionUsingSessionHandle({ key: "value" });
            throw new Error("should not have come here");
        } catch (error) {
            if (!ST.Error.isErrorFromAuth(error) || error.errType !== ST.Error.GENERAL_ERROR) {
                throw err;
            }
        }
        //passing json input instead of userid
        try {
            await ST.revokeAllSessionsForUser({ key: "value" });
            throw new Error("should not have come here");
        } catch (error) {
            if (!ST.Error.isErrorFromAuth(error) || error.errType !== ST.Error.GENERAL_ERROR) {
                throw err;
            }
        }
    });

    //check manipulating session data**
    it("test manipulating session data", async function() {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);
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
            await ST.getSessionData("randomString90", { key2: "value2" });
        } catch (error) {
            if (!ST.Error.isErrorFromAuth(error) || error.errType !== ST.Error.UNAUTHORISED) {
                throw err;
            }
        }
    });
});
