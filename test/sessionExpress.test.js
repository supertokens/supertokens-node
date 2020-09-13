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
const nock = require("nock");
let { version } = require("../lib/build/version");
const express = require("express");
const request = require("supertest");
let { Querier } = require("../lib/build/querier");
let { HandshakeInfo } = require("../lib/build/handshakeInfo");
let { ProcessState, PROCESS_STATE } = require("../lib/build/processState");
let { maxVersion } = require("../lib/build/utils");

describe(`sessionExpress: ${printPath("[test/sessionExpress.test.js]")}`, function () {
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
    it("express token theft detection", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });

        const app = express();
        app.post("/create", async (req, res) => {
            await STExpress.createNewSession(res, "", {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", async (req, res) => {
            await STExpress.getSession(req, res, true);
            res.status(200).send("");
        });

        app.post("/session/refresh", async (req, res) => {
            try {
                await STExpress.refreshSession(req, res);
                res.status(200).send(JSON.stringify({ success: false }));
            } catch (err) {
                res.status(200).json({
                    success: ST.Error.isErrorFromAuth(err) && err.errType === ST.Error.TOKEN_THEFT_DETECTED,
                });
            }
        });

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", [
                    "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", res2.antiCsrf)
                .end((err, res) => {
                    resolve();
                })
        );

        let res3 = await new Promise((resolve) =>
            request(app)
                .post("/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    resolve(res);
                })
        );
        assert.deepEqual(res3.body.success, true);

        let cookies = extractInfoFromResponse(res3);
        assert.deepEqual(cookies.antiCsrf, undefined);
        assert.deepEqual(cookies.accessToken, "");
        assert.deepEqual(cookies.refreshToken, "");
        assert.deepEqual(cookies.idRefreshTokenFromHeader, "remove");
        assert.deepEqual(cookies.idRefreshTokenFromCookie, "");
        assert.deepEqual(cookies.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(cookies.idRefreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(cookies.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        let currCDIVersion = await Querier.getInstance().getAPIVersion();
        if (maxVersion(currCDIVersion, "2.1") === "2.1") {
            assert(cookies.accessTokenDomain === "localhost" || cookies.accessTokenDomain === "supertokens.io");
            assert(cookies.refreshTokenDomain === "localhost" || cookies.refreshTokenDomain === "supertokens.io");
            assert(cookies.idRefreshTokenDomain === "localhost" || cookies.idRefreshTokenDomain === "supertokens.io");
        } else {
            assert(cookies.accessTokenDomain === undefined);
            assert(cookies.refreshTokenDomain === undefined);
            assert(cookies.idRefreshTokenDomain === undefined);
        }
    });

    //- check for token theft detection
    it("express token theft detection with auto refresh middleware", async function () {
        await startST();
        const app = express();

        app.use(
            STExpress.init({
                hosts: "http://localhost:8080",
                refreshTokenPath: "/session/refresh",
            })
        );

        app.post("/create", async (req, res) => {
            await STExpress.createNewSession(res, "", {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", STExpress.middleware(), async (req, res) => {
            res.status(200).send("");
        });

        app.use(STExpress.errorHandler());

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", [
                    "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", res2.antiCsrf)
                .end((err, res) => {
                    resolve();
                })
        );

        let res3 = await new Promise((resolve) =>
            request(app)
                .post("/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    resolve(res);
                })
        );
        assert(res3.status === 440 || res3.status === 401);
        assert.deepEqual(res3.text, '{"message":"token theft detected"}');

        let cookies = extractInfoFromResponse(res3);
        assert.deepEqual(cookies.antiCsrf, undefined);
        assert.deepEqual(cookies.accessToken, "");
        assert.deepEqual(cookies.refreshToken, "");
        assert.deepEqual(cookies.idRefreshTokenFromHeader, "remove");
        assert.deepEqual(cookies.idRefreshTokenFromCookie, "");
        assert.deepEqual(cookies.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(cookies.idRefreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(cookies.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
    });

    //check basic usage of session
    it("test basic usage of express sessions", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });

        const app = express();

        app.post("/create", async (req, res) => {
            await STExpress.createNewSession(res, "", {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", async (req, res) => {
            await STExpress.getSession(req, res, true);
            res.status(200).send("");
        });
        app.post("/session/refresh", async (req, res) => {
            await STExpress.refreshSession(req, res);
            res.status(200).send("");
        });
        app.post("/session/revoke", async (req, res) => {
            let session = await STExpress.getSession(req, res, true);
            await session.revokeSession();
            res.status(200).send("");
        });

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.idRefreshTokenFromCookie !== undefined);
        assert(res.idRefreshTokenFromHeader !== undefined);
        assert(res.refreshToken !== undefined);

        await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    resolve(res);
                })
        );

        let verifyState3 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1500);
        assert(verifyState3 === undefined);

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        assert(res2.accessToken !== undefined);
        assert(res2.antiCsrf !== undefined);
        assert(res2.idRefreshTokenFromCookie !== undefined);
        assert(res2.idRefreshTokenFromHeader !== undefined);
        assert(res2.refreshToken !== undefined);

        let res3 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/session/verify")
                    .set("Cookie", [
                        "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res2.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );
        let verifyState = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);
        assert(verifyState !== undefined);
        assert(res3.accessToken !== undefined);

        ProcessState.getInstance().reset();

        await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res3.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", res2.antiCsrf)
                .end((err, res) => {
                    resolve(res);
                })
        );
        let verifyState2 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1000);
        assert(verifyState2 === undefined);

        let sessionRevokedResponse = await new Promise((resolve) =>
            request(app)
                .post("/session/revoke")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res3.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", res2.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );
        let sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.idRefreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromCookie === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromHeader === "remove");
    });

    //check basic usage of session
    it("test basic usage of express sessions with auto refresh", async function () {
        await startST();
        const app = express();

        app.use(
            STExpress.init({
                hosts: "http://localhost:8080",
                refreshTokenPath: "/session/refresh",
            })
        );

        app.post("/create", async (req, res) => {
            await STExpress.createNewSession(res, "", {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", STExpress.middleware(), async (req, res) => {
            res.status(200).send("");
        });

        app.post("/session/revoke", STExpress.middleware(), async (req, res) => {
            let session = req.session;
            await session.revokeSession();
            res.status(200).send("");
        });

        app.use(STExpress.errorHandler());

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        assert(res.accessToken !== undefined);
        assert(res.antiCsrf !== undefined);
        assert(res.idRefreshTokenFromCookie !== undefined);
        assert(res.idRefreshTokenFromHeader !== undefined);
        assert(res.refreshToken !== undefined);

        await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    resolve(res);
                })
        );

        let verifyState3 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1500);
        assert(verifyState3 === undefined);

        let res2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        assert(res2.accessToken !== undefined);
        assert(res2.antiCsrf !== undefined);
        assert(res2.idRefreshTokenFromCookie !== undefined);
        assert(res2.idRefreshTokenFromHeader !== undefined);
        assert(res2.refreshToken !== undefined);

        let res3 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/session/verify")
                    .set("Cookie", [
                        "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res2.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );
        let verifyState = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);
        assert(verifyState !== undefined);
        assert(res3.accessToken !== undefined);

        ProcessState.getInstance().reset();

        await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res3.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", res2.antiCsrf)
                .end((err, res) => {
                    resolve(res);
                })
        );
        let verifyState2 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1000);
        assert(verifyState2 === undefined);

        let sessionRevokedResponse = await new Promise((resolve) =>
            request(app)
                .post("/session/revoke")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res3.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", res2.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );
        let sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.idRefreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromCookie === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromHeader === "remove");
    });

    //check session verify for with / without anti-csrf present
    it("test express session verify with anti-csrf present", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });

        const app = express();
        app.post("/create", async (req, res) => {
            await STExpress.createNewSession(res, "id1", {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", async (req, res) => {
            let sessionResponse = await STExpress.getSession(req, res, true);
            res.status(200).json({ userId: sessionResponse.userId });
        });

        app.post("/session/verifyAntiCsrfFalse", async (req, res) => {
            let sessionResponse = await STExpress.getSession(req, res, false);
            res.status(200).json({ userId: sessionResponse.userId });
        });

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        let res2 = await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    resolve(res);
                })
        );
        assert.deepEqual(res2.body.userId, "id1");

        let res3 = await new Promise((resolve) =>
            request(app)
                .post("/session/verifyAntiCsrfFalse")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    resolve(res);
                })
        );
        assert.deepEqual(res3.body.userId, "id1");
    });

    // check session verify for with / without anti-csrf present
    it("test session verify without anti-csrf present express", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });

        const app = express();

        app.post("/create", async (req, res) => {
            await STExpress.createNewSession(res, "id1", {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", async (req, res) => {
            try {
                let sessionResponse = await STExpress.getSession(req, res, true);
                res.status(200).json({ success: false });
            } catch (err) {
                res.status(200).json({
                    success: ST.Error.isErrorFromAuth(err) && err.errType === ST.Error.TRY_REFRESH_TOKEN,
                });
            }
        });

        app.post("/session/verifyAntiCsrfFalse", async (req, res) => {
            let sessionResponse = await STExpress.getSession(req, res, false);
            res.status(200).json({ userId: sessionResponse.userId });
        });

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        let response2 = await new Promise((resolve) =>
            request(app)
                .post("/session/verifyAntiCsrfFalse")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .end((err, res) => {
                    resolve(res);
                })
        );
        assert.deepEqual(response2.body.userId, "id1");

        let response = await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .end((err, res) => {
                    resolve(res);
                })
        );
        assert.deepEqual(response.body.success, true);
    });

    //check revoking session(s)**
    it("test revoking express sessions", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        const app = express();
        app.post("/create", async (req, res) => {
            await STExpress.createNewSession(res, "", {}, {});
            res.status(200).send("");
        });
        app.post("/usercreate", async (req, res) => {
            await STExpress.createNewSession(res, "someUniqueUserId", {}, {});
            res.status(200).send("");
        });
        app.post("/session/revoke", async (req, res) => {
            let session = await STExpress.getSession(req, res, true);
            await session.revokeSession();
            res.status(200).send("");
        });

        app.post("/session/revokeUserid", async (req, res) => {
            let session = await STExpress.getSession(req, res, true);
            await STExpress.revokeAllSessionsForUser(session.getUserId());
            res.status("200").send("");
        });

        //create an api call get sesssions from a userid "id1" that returns all the sessions for that userid
        app.post("/session/getSessionsWithUserId1", async (req, res) => {
            let sessionHandles = await STExpress.getAllSessionHandlesForUser("someUniqueUserId");
            res.status(200).json(sessionHandles);
        });

        let response = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );
        let sessionRevokedResponse = await new Promise((resolve) =>
            request(app)
                .post("/session/revoke")
                .set("Cookie", [
                    "sAccessToken=" + response.accessToken + ";sIdRefreshToken=" + response.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );
        let sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.idRefreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromCookie === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromHeader === "remove");

        await new Promise((resolve) =>
            request(app)
                .post("/usercreate")
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );
        let userCreateResponse = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/usercreate")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        await new Promise((resolve) =>
            request(app)
                .post("/session/revokeUserid")
                .set("Cookie", [
                    "sAccessToken=" +
                        userCreateResponse.accessToken +
                        ";sIdRefreshToken=" +
                        userCreateResponse.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", userCreateResponse.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );
        let sessionHandleResponse = await new Promise((resolve) =>
            request(app)
                .post("/session/getSessionsWithUserId1")
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );
        assert(sessionHandleResponse.body.length === 0);
    });

    //check manipulating session data
    it("test manipulating session data with express", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        const app = express();
        app.post("/create", async (req, res) => {
            await STExpress.createNewSession(res, "", {}, {});
            res.status(200).send("");
        });
        app.post("/updateSessionData", async (req, res) => {
            let session = await STExpress.getSession(req, res, true);
            await session.updateSessionData({ key: "value" });
            res.status(200).send("");
        });
        app.post("/getSessionData", async (req, res) => {
            let session = await STExpress.getSession(req, res, true);
            let sessionData = await session.getSessionData();
            res.status(200).json(sessionData);
        });

        app.post("/updateSessionData2", async (req, res) => {
            let session = await STExpress.getSession(req, res, true);
            await session.updateSessionData({ key: "value2" });
            res.status(200).send("");
        });

        app.post("/updateSessionDataInvalidSessionHandle", async (req, res) => {
            try {
                await STExpress.updateSessionData("InvalidHandle", { key: "value3" });
                res.status(200).json({ success: false });
            } catch (err) {
                res.status(200).json({
                    success: ST.Error.isErrorFromAuth(err) && err.errType === ST.Error.UNAUTHORISED,
                });
            }
        });

        //create a new session
        let response = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        //call the updateSessionData api to add session data
        await new Promise((resolve) =>
            request(app)
                .post("/updateSessionData")
                .set("Cookie", [
                    "sAccessToken=" + response.accessToken + ";sIdRefreshToken=" + response.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );

        //call the getSessionData api to get session data
        let response2 = await new Promise((resolve) =>
            request(app)
                .post("/getSessionData")
                .set("Cookie", [
                    "sAccessToken=" + response.accessToken + ";sIdRefreshToken=" + response.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );

        //check that the session data returned is valid
        assert.deepEqual(response2.body.key, "value");

        // change the value of the inserted session data
        await new Promise((resolve) =>
            request(app)
                .post("/updateSessionData2")
                .set("Cookie", [
                    "sAccessToken=" + response.accessToken + ";sIdRefreshToken=" + response.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );
        //retrieve the changed session data
        response2 = await new Promise((resolve) =>
            request(app)
                .post("/getSessionData")
                .set("Cookie", [
                    "sAccessToken=" + response.accessToken + ";sIdRefreshToken=" + response.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );

        //check the value of the retrieved
        assert.deepEqual(response2.body.key, "value2");

        //invalid session handle when updating the session data
        let invalidSessionResponse = await new Promise((resolve) =>
            request(app)
                .post("/updateSessionDataInvalidSessionHandle")
                .set("Cookie", [
                    "sAccessToken=" + response.accessToken + ";sIdRefreshToken=" + response.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );
        assert.deepEqual(invalidSessionResponse.body.success, true);
    });

    //check manipulating jwt payload
    it("test manipulating jwt payload with express", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        const app = express();
        app.post("/create", async (req, res) => {
            await STExpress.createNewSession(res, "user1", {}, {});
            res.status(200).send("");
        });
        if ((await Querier.getInstance().getAPIVersion()) !== "1.0") {
            app.post("/updateJWTPayload", async (req, res) => {
                let session = await STExpress.getSession(req, res, true);
                let accessTokenBefore = session.accessToken;
                await session.updateJWTPayload({ key: "value" });
                let accessTokenAfter = session.accessToken;
                let statusCode =
                    accessTokenBefore !== accessTokenAfter && typeof accessTokenAfter === "string" ? 200 : 500;
                res.status(statusCode).send("");
            });
            app.post("/session/refresh", async (req, res) => {
                await STExpress.refreshSession(req, res);
                res.status(200).send("");
            });
            app.post("/getJWTPayload", async (req, res) => {
                let session = await STExpress.getSession(req, res, true);
                let jwtPayload = session.getJWTPayload();
                res.status(200).json(jwtPayload);
            });

            app.post("/updateJWTPayload2", async (req, res) => {
                let session = await STExpress.getSession(req, res, true);
                await session.updateJWTPayload({ key: "value2" });
                res.status(200).send("");
            });

            app.post("/updateJWTPayloadInvalidSessionHandle", async (req, res) => {
                try {
                    await STExpress.updateJWTPayload("InvalidHandle", { key: "value3" });
                } catch (err) {
                    res.status(200).json({
                        success: ST.Error.isErrorFromAuth(err) && err.errType === ST.Error.UNAUTHORISED,
                    });
                }
            });

            //create a new session
            let response = extractInfoFromResponse(
                await new Promise((resolve) =>
                    request(app)
                        .post("/create")
                        .expect(200)
                        .end((err, res) => {
                            resolve(res);
                        })
                )
            );

            let frontendInfo = JSON.parse(new Buffer.from(response.frontToken, "base64").toString());
            assert(frontendInfo.uid === "user1");
            assert.deepEqual(frontendInfo.up, {});

            //call the updateJWTPayload api to add jwt payload
            let updatedResponse = extractInfoFromResponse(
                await new Promise((resolve) =>
                    request(app)
                        .post("/updateJWTPayload")
                        .set("Cookie", [
                            "sAccessToken=" +
                                response.accessToken +
                                ";sIdRefreshToken=" +
                                response.idRefreshTokenFromCookie,
                        ])
                        .set("anti-csrf", response.antiCsrf)
                        .expect(200)
                        .end((err, res) => {
                            resolve(res);
                        })
                )
            );

            frontendInfo = JSON.parse(new Buffer.from(updatedResponse.frontToken, "base64").toString());
            assert(frontendInfo.uid === "user1");
            assert.deepEqual(frontendInfo.up, { key: "value" });

            //call the getJWTPayload api to get jwt payload
            let response2 = await new Promise((resolve) =>
                request(app)
                    .post("/getJWTPayload")
                    .set("Cookie", [
                        "sAccessToken=" +
                            updatedResponse.accessToken +
                            ";sIdRefreshToken=" +
                            response.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", response.antiCsrf)
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            );
            //check that the jwt payload returned is valid
            assert.deepEqual(response2.body.key, "value");

            // refresh session
            response2 = extractInfoFromResponse(
                await new Promise((resolve) =>
                    request(app)
                        .post("/session/refresh")
                        .set("Cookie", [
                            "sRefreshToken=" +
                                response.refreshToken +
                                ";sIdRefreshToken=" +
                                response.idRefreshTokenFromCookie,
                        ])
                        .set("anti-csrf", response.antiCsrf)
                        .expect(200)
                        .end((err, res) => {
                            resolve(res);
                        })
                )
            );

            frontendInfo = JSON.parse(new Buffer.from(response2.frontToken, "base64").toString());
            assert(frontendInfo.uid === "user1");
            assert.deepEqual(frontendInfo.up, { key: "value" });

            // change the value of the inserted jwt payload
            let updatedResponse2 = extractInfoFromResponse(
                await new Promise((resolve) =>
                    request(app)
                        .post("/updateJWTPayload2")
                        .set("Cookie", [
                            "sAccessToken=" +
                                response2.accessToken +
                                ";sIdRefreshToken=" +
                                response2.idRefreshTokenFromCookie,
                        ])
                        .set("anti-csrf", response2.antiCsrf)
                        .expect(200)
                        .end((err, res) => {
                            resolve(res);
                        })
                )
            );

            frontendInfo = JSON.parse(new Buffer.from(updatedResponse2.frontToken, "base64").toString());
            assert(frontendInfo.uid === "user1");
            assert.deepEqual(frontendInfo.up, { key: "value2" });

            //retrieve the changed jwt payload
            response2 = await new Promise((resolve) =>
                request(app)
                    .post("/getJWTPayload")
                    .set("Cookie", [
                        "sAccessToken=" +
                            updatedResponse2.accessToken +
                            ";sIdRefreshToken=" +
                            response2.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", response2.antiCsrf)
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            );

            //check the value of the retrieved
            assert.deepEqual(response2.body.key, "value2");
            //invalid session handle when updating the jwt payload
            let invalidSessionResponse = await new Promise((resolve) =>
                request(app)
                    .post("/updateJWTPayloadInvalidSessionHandle")
                    .set("Cookie", [
                        "sAccessToken=" +
                            updatedResponse2.accessToken +
                            ";sIdRefreshToken=" +
                            response.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", response.antiCsrf)
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            );
            assert.deepEqual(invalidSessionResponse.body.success, true);
        } else {
            app.post("/updateJWTPayload", async (req, res) => {
                let session = await STExpress.getSession(req, res, true);
                try {
                    await session.updateJWTPayload({ key: "value" });
                } catch (err) {
                    return res.status(200).send("");
                }
                return res.status(200).send("");
            });
            app.post("/getJWTPayload", async (req, res) => {
                let session = await STExpress.getSession(req, res, true);
                let jwtPayload = await session.getJWTPayload();
                res.status(200).json(jwtPayload);
            });
        }
    });

    // test with existing header params being there and that the lib appends to those and not overrides those
    it("test that express appends to existing header params and does not override", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        const app = express();
        app.post("/create", async (req, res) => {
            res.header("testHeader", "testValue");
            res.header("Access-Control-Expose-Headers", "customValue");
            await STExpress.createNewSession(res, "", {}, {});
            res.status(200).send("");
        });

        //create a new session

        let response = await new Promise((resolve) =>
            request(app)
                .post("/create")
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );
        assert.deepEqual(response.headers.testheader, "testValue");
        assert.deepEqual(
            response.headers["access-control-expose-headers"],
            "customValue, front-token, id-refresh-token, anti-csrf"
        );

        //normal session headers
        let extractInfo = extractInfoFromResponse(response);
        assert(extractInfo.accessToken !== undefined);
        assert(extractInfo.refreshToken != undefined);
        assert(extractInfo.idRefreshTokenFromCookie !== undefined);
        assert(extractInfo.idRefreshTokenFromHeader !== undefined);
        assert(extractInfo.antiCsrf !== undefined);
    });

    //if anti-csrf is disabled from ST core, check that not having that in input to verify session is fine**
    it("test that when anti-csrf is disabled from from ST core, not having to input in verify session is fine in express", async function () {
        await setKeyValueInConfig("enable_anti_csrf", "false");
        await startST();
        ST.init({ hosts: "http://localhost:8080" });

        const app = express();
        app.post("/create", async (req, res) => {
            await STExpress.createNewSession(res, "id1", {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", async (req, res) => {
            let sessionResponse = await STExpress.getSession(req, res, true);
            res.status(200).json({ userId: sessionResponse.userId });
        });
        app.post("/session/verifyAntiCsrfFalse", async (req, res) => {
            let sessionResponse = await STExpress.getSession(req, res, false);
            res.status(200).json({ userId: sessionResponse.userId });
        });

        let res = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        let res2 = await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .end((err, res) => {
                    resolve(res);
                })
        );
        assert.deepEqual(res2.body.userId, "id1");

        let res3 = await new Promise((resolve) =>
            request(app)
                .post("/session/verifyAntiCsrfFalse")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .end((err, res) => {
                    resolve(res);
                })
        );
        assert.deepEqual(res3.body.userId, "id1");
    });

    // test no duplicate Access-Control-Allow-Credentials header
    it("test no duplicate Access-Control-Allow-Credentials header", async function () {
        const app = express();
        app.post("/header", async (req, res) => {
            res.header("Access-Control-Allow-Credentials", "true");
            await STExpress.setRelevantHeadersForOptionsAPI(res);
            res.status(200).send("");
        });

        let response = await new Promise((resolve) =>
            request(app)
                .post("/header")
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );
        assert.deepEqual(response.headers["access-control-allow-credentials"], "true");
    });
});
