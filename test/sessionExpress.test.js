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

describe(`sessionExpress: ${printPath("[test/sessionExpress.test.js]")}`, function() {
    beforeEach(async function() {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function() {
        await killAllST();
        await cleanST();
    });

    //- express check token theft detection
    it("express token theft detection", async function() {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);

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
                if (ST.Error.isErrorFromAuth(err) && err.errType === ST.Error.TOKEN_THEFT_DETECTED) {
                    res.status(200).send(JSON.stringify({ success: true }));
                } else {
                    res.status(200).send(JSON.stringify({ success: false }));
                }
            }
        });

        let res = extractInfoFromResponse(
            await new Promise(resolve =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        let res2 = extractInfoFromResponse(
            await new Promise(resolve =>
                request(app)
                    .post("/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        await new Promise(resolve =>
            request(app)
                .post("/session/verify")
                .set("Cookie", [
                    "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie
                ])
                .set("anti-csrf", res2.antiCsrf)
                .end((err, res) => {
                    resolve();
                })
        );

        let res3 = await new Promise(resolve =>
            request(app)
                .post("/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    resolve(res);
                })
        );

        assert.deepEqual(res3.text, '{"success":true}');

        let cookies = extractInfoFromResponse(res3);
        assert.deepEqual(cookies.antiCsrf, undefined);
        assert.deepEqual(cookies.accessToken, "");
        assert.deepEqual(cookies.refreshToken, "");
        assert.deepEqual(cookies.idRefreshTokenFromHeader, "remove");
        assert.deepEqual(cookies.idRefreshTokenFromCookie, "");
    });

    //check basic usage of session** W/IE
    it("test basic usage of express sessions", async function() {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);

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

        let res = extractInfoFromResponse(
            await new Promise(resolve =>
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

        let res2 = extractInfoFromResponse(
            await new Promise(resolve =>
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
            await new Promise(resolve =>
                request(app)
                    .post("/session/verify")
                    .set("Cookie", [
                        "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie
                    ])
                    .set("anti-csrf", res2.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );
        let verifyState = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY);
        assert(verifyState !== undefined);
        assert(res3.accessToken != undefined);

        ProcessState.getInstance().reset();

        await new Promise(resolve =>
            request(app)
                .post("/session/verify")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res3.idRefreshTokenFromCookie
                ])
                .set("anti-csrf", res2.antiCsrf)
                .end((err, res) => {
                    resolve(res);
                })
        );
        let verifyState2 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1000);
        assert(verifyState2 === undefined);
    });

    //check session verify for with / without anti-csrf present**
    it("test express session verify with anti-csrf present", async function() {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);

        const app = express();

        app.post("/create", async (req, res) => {
            await STExpress.createNewSession(res, "", {}, {});
            res.status(200).send("");
        });

        app.post("/session/refresh", async (req, res) => {
            await STExpress.refreshSession(req, res);
            res.status(200).send("");
        });

        app.post("/session/verify", async (req, res) => {
            await STExpress.getSession(req, res, true);
            res.status(200).send("");
        });

        let res = extractInfoFromResponse(
            await new Promise(resolve =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        let res2 = extractInfoFromResponse(
            await new Promise(resolve =>
                request(app)
                    .post("/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );
        //with anti-csrf present
        let res3 = extractInfoFromResponse(
            await new Promise(resolve =>
                request(app)
                    .post("/session/verify")
                    .set("Cookie", [
                        "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie
                    ])
                    .set("anti-csrf", res2.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );
        assert(res3.accessToken !== undefined);
    });

    //check session verify for with / without anti-csrf present**
    it("test session verify without anti-csrf present express", async function() {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);

        const app = express();

        app.post("/create", async (req, res) => {
            await STExpress.createNewSession(res, "", {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", async (req, res) => {
            try {
                await STExpress.getSession(req, res, true);
                res.status(200).send("");
            } catch (err) {
                if (!ST.Error.isErrorFromAuth(err) || err.errType !== ST.Error.TRY_REFRESH_TOKEN) {
                    throw err;
                }
                res.status(200).send(JSON.stringify({ success: true }));
            }
        });

        let res = extractInfoFromResponse(
            await new Promise(resolve =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        //without anti-csrf present

        let response = await new Promise(resolve =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .end((err, res) => {
                    resolve(res);
                })
        );
        assert(response.text === JSON.stringify({ success: true }));
    });

    //check revoking session(s)**
    it("test revoking express sessions", async function() {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);
        const app = express();
        app.post("/create", async (req, res) => {
            await STExpress.createNewSession(res, "", {}, {});
            res.status(200).send("");
        });
        app.post("/usercreate", async (req, res) => {
            await STExpress.createNewSession(res, "id1", {}, {});
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
        app.post("/session/getSessionsWithUserId1", async (req, res) => {
            let sessionHandles = await STExpress.getAllSessionHandlesForUser("id1");
            assert(sessionHandles.length === 0);
            res.status(200).send("");
        });

        //create an api call get sesssions from a userid "id1" that returns all the sessions for that userid
        let response = extractInfoFromResponse(
            await new Promise(resolve =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );
        let sessionRevokedResponse = await new Promise(resolve =>
            request(app)
                .post("/session/revoke")
                .set("Cookie", [
                    "sAccessToken=" + response.accessToken + ";sIdRefreshToken=" + response.idRefreshTokenFromCookie
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

        await new Promise(resolve =>
            request(app)
                .post("/usercreate")
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );
        let userCreateResponse = extractInfoFromResponse(
            await new Promise(resolve =>
                request(app)
                    .post("/usercreate")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        await new Promise(resolve =>
            request(app)
                .post("/session/revokeUserid")
                .set("Cookie", [
                    "sAccessToken=" +
                        userCreateResponse.accessToken +
                        ";sIdRefreshToken=" +
                        userCreateResponse.idRefreshTokenFromCookie
                ])
                .set("anti-csrf", userCreateResponse.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );
        new Promise(resolve =>
            request(app)
                .post("/session/getSessionsWithUserId1")
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );
    });

    //check manipulating session data**
    it("test manipulating session data with express", async function() {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);
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
            res.send(JSON.stringify(sessionData));
        });

        app.post("/updateSessionData2", async (req, res) => {
            let session = await STExpress.getSession(req, res, true);
            await session.updateSessionData({ key: "value2" });
            res.status(200).send("");
        });

        app.post("/updateSessionDataInvalidSessionHandle", async (req, res) => {
            try {
                await STExpress.updateSessionData("InvalidHandle", { key: "value3" });
                res.status(200).send(JSON.stringify({ success: false }));
            } catch (err) {
                if (ST.Error.isErrorFromAuth(err) && err.errType === ST.Error.UNAUTHORISED) {
                    res.status(200).send(JSON.stringify({ success: true }));
                } else {
                    res.status(200).send(JSON.stringify({ success: false }));
                }
            }
        });

        //create a new session
        let response = extractInfoFromResponse(
            await new Promise(resolve =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        //call the updateSessionData api to add session data
        await new Promise(resolve =>
            request(app)
                .post("/updateSessionData")
                .set("Cookie", [
                    "sAccessToken=" + response.accessToken + ";sIdRefreshToken=" + response.idRefreshTokenFromCookie
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );

        //call the getSessionData api to get session data
        let response2 = await new Promise(resolve =>
            request(app)
                .post("/getSessionData")
                .set("Cookie", [
                    "sAccessToken=" + response.accessToken + ";sIdRefreshToken=" + response.idRefreshTokenFromCookie
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );

        //check that the session data returned is valid
        assert(response2.text === JSON.stringify({ key: "value" }));

        // change the value of the inserted session data
        await new Promise(resolve =>
            request(app)
                .post("/updateSessionData2")
                .set("Cookie", [
                    "sAccessToken=" + response.accessToken + ";sIdRefreshToken=" + response.idRefreshTokenFromCookie
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );
        //retrieve the changed session data
        response2 = await new Promise(resolve =>
            request(app)
                .post("/getSessionData")
                .set("Cookie", [
                    "sAccessToken=" + response.accessToken + ";sIdRefreshToken=" + response.idRefreshTokenFromCookie
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );

        //check the value of the retrieved
        assert(response2.text === JSON.stringify({ key: "value2" }));

        //invalid session handle when updating the session data
        await new Promise(resolve =>
            request(app)
                .post("/updateSessionDataInvalidSessionHandle")
                .set("Cookie", [
                    "sAccessToken=" + response.accessToken + ";sIdRefreshToken=" + response.idRefreshTokenFromCookie
                ])
                .set("anti-csrf", response.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );
    });

    // test with existing header params being there and that the lib appends to those and not overrides those**E
    it("test that express apprends to existing header params and does not override", async function() {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);
        const app = express();
        app.post("/create", async (req, res) => {
            await STExpress.createNewSession(res, "", {}, {});
            res.status(200).send("");
        });

        //create a new session

        let response = await new Promise(resolve =>
            request(app)
                .post("/create")
                .expect(200)
                .set("testHeader", ["testValue"])
                .end((err, res) => {
                    resolve(res);
                })
        );
        assert(response["req"]["_header"].split("\r\n").includes("testHeader: testValue"));
        assert(response["req"]["_header"].split("\r\n").length > 1);
    });
});
