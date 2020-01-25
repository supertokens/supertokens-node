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

    //- check for token theft detection
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
                    .set("anti-csrf", res.antiCsrf) // TODO: do not need this
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
                .set("anti-csrf", res.antiCsrf) // TODO: remove this
                .end((err, res) => {
                    resolve(res);
                })
        );

        assert.deepEqual(res3.text, '{"success":true}'); // compare like res3.data.success, true

        let cookies = extractInfoFromResponse(res3);
        assert.deepEqual(cookies.antiCsrf, undefined);
        assert.deepEqual(cookies.accessToken, "");
        assert.deepEqual(cookies.refreshToken, "");
        assert.deepEqual(cookies.idRefreshTokenFromHeader, "remove");
        assert.deepEqual(cookies.idRefreshTokenFromCookie, "");
        // TODO: check expiry time of cookies as well!
    });

    //check basic usage of session
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

        // TODO: call verify session and make sure it doenst go to PROCESS_STATE.CALLING_IN_VERIFY

        let res2 = extractInfoFromResponse(
            await new Promise(resolve =>
                request(app)
                    .post("/session/refresh")
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                    .set("anti-csrf", res.antiCsrf) // TODO: dont need anti-csrf
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

        // TODO: what happened to revoke session? In the non-express, you are calling that!
    });

    //check session verify for with / without anti-csrf present**
    // TODO: redo this test from non-express!!! exactly!
    // it("test express session verify with anti-csrf present", async function () {
    //     await startST();
    //     STExpress.init([
    //         {
    //             hostname: "localhost",
    //             port: 8080
    //         }
    //     ]);

    //     const app = express();

    //     app.post("/create", async (req, res) => {
    //         await STExpress.createNewSession(res, "", {}, {});
    //         res.status(200).send("");
    //     });

    //     // TODO: you don't need refresh API for this test!
    //     app.post("/session/refresh", async (req, res) => {
    //         await STExpress.refreshSession(req, res);
    //         res.status(200).send("");
    //     });

    //     app.post("/session/verify", async (req, res) => {
    //         await STExpress.getSession(req, res, true);
    //         res.status(200).send("");
    //     });

    //     let res = extractInfoFromResponse(
    //         await new Promise(resolve =>
    //             request(app)
    //                 .post("/create")
    //                 .expect(200)
    //                 .end((err, res) => {
    //                     resolve(res);
    //                 })
    //         )
    //     );

    //     // TODO: why do u need todo refresh here?
    //     let res2 = extractInfoFromResponse(
    //         await new Promise(resolve =>
    //             request(app)
    //                 .post("/session/refresh")
    //                 .set("Cookie", ["sRefreshToken=" + res.refreshToken])
    //                 .set("anti-csrf", res.antiCsrf)
    //                 .end((err, res) => {
    //                     resolve(res);
    //                 })
    //         )
    //     );
    //     //with anti-csrf present
    //     let res3 = extractInfoFromResponse(
    //         await new Promise(resolve =>
    //             request(app)
    //                 .post("/session/verify")
    //                 .set("Cookie", [
    //                     "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie
    //                 ])
    //                 .set("anti-csrf", res2.antiCsrf)
    //                 .end((err, res) => {
    //                     resolve(res);
    //                 })
    //         )
    //     );
    //     assert(res3.accessToken !== undefined);

    //     // TODO: what about the case where you do not provide anti-csrf?
    // });

    // //check session verify for with / without anti-csrf present**
    // it("test session verify without anti-csrf present express", async function () {
    //     await startST();
    //     STExpress.init([
    //         {
    //             hostname: "localhost",
    //             port: 8080
    //         }
    //     ]);

    //     const app = express();

    //     app.post("/create", async (req, res) => {
    //         await STExpress.createNewSession(res, "", {}, {});
    //         res.status(200).send("");
    //     });

    //     app.post("/session/verify", async (req, res) => {
    //         try {
    //             await STExpress.getSession(req, res, true);
    //             res.status(200).send("");
    //         } catch (err) {
    //             if (!ST.Error.isErrorFromAuth(err) || err.errType !== ST.Error.TRY_REFRESH_TOKEN) {
    //                 throw err;  // TODO: this is not actually going to fail the test! this will just not respond from the API!
    //             }
    //             res.status(200).send(JSON.stringify({ success: true }));
    //         }
    //     });

    //     let res = extractInfoFromResponse(
    //         await new Promise(resolve =>
    //             request(app)
    //                 .post("/create")
    //                 .expect(200)
    //                 .end((err, res) => {
    //                     resolve(res);
    //                 })
    //         )
    //     );

    //     //without anti-csrf present

    //     let response = await new Promise(resolve =>
    //         request(app)
    //             .post("/session/verify")
    //             .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
    //             .end((err, res) => {
    //                 resolve(res);
    //             })
    //     );
    //     assert(response.text === JSON.stringify({ success: true }));    // TODO: check JSON properly.. not like this!
    // });

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

        //create an api call get sesssions from a userid "id1" that returns all the sessions for that userid
        app.post("/session/getSessionsWithUserId1", async (req, res) => {
            let sessionHandles = await STExpress.getAllSessionHandlesForUser("id1");
            assert(sessionHandles.length === 0);
            res.status(200).send("");
        });

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
                .post("/session/getSessionsWithUserId1") // TODO: Ideally, this API should return an array of session handles and here you should check that it is empty
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );
    });

    //check manipulating session data
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
                res.status(200).send(
                    JSON.stringify({ success: ST.Error.isErrorFromAuth(err) && err.errType === ST.Error.UNAUTHORISED })
                );
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
        assert(response2.text === JSON.stringify({ key: "value" })); // TODO: normal JSON check!

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

        // TODO: check the response is success = true...??
    });

    // test with existing header params being there and that the lib appends to those and not overrides those
    it("test that express appends to existing header params and does not override", async function() {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);
        const app = express();
        app.post("/create", async (req, res) => {
            res.header("testHeader", "testValue");
            res.header("Access-Control-Expose-Headers", "customValue");
            await STExpress.createNewSession(res, "", {}, {});
            res.status(200).send("");
        });

        //create a new session

        let response = await new Promise(resolve =>
            request(app)
                .post("/create")
                .expect(200)
                .set("testHeader", ["testValue"]) // TODO: no need for this
                .end((err, res) => {
                    resolve(res);
                })
        );
        // TODO: check that response header has the custom thing + normal session headers
        assert(response["req"]["_header"].split("\r\n").includes("testHeader: testValue"));
        assert(response["req"]["_header"].split("\r\n").length > 1);
    });

    // TODO: this should not be there anymore.. follow the non-express test for this.
    // // - if anti-csrf is disabled, check that not having that in input to verify / refresh session is fine
    // // - the opposite of the above condition
    // it("test that anti-csrf is disabled and check that not having to input verify/refresh is fine express", async function () {
    //     await startST();
    //     STExpress.init([
    //         {
    //             hostname: "localhost",
    //             port: 8080
    //         }
    //     ]);
    //     const app = express();
    //     app.post("/create", async (req, res) => {
    //         await STExpress.createNewSession(res, "", {}, {});
    //         res.status(200).send("");
    //     });

    //     app.post("/session/refresh", async (req, res) => {
    //         await STExpress.refreshSession(req, res);
    //         res.status(200).send("");
    //     });

    //     app.post("/session/verify", async (req, res) => {
    //         await STExpress.getSession(req, res, false);
    //         res.status(200).send("");
    //     });

    //     //create a new session
    //     let response = extractInfoFromResponse(
    //         await new Promise(resolve =>
    //             request(app)
    //                 .post("/create")
    //                 .expect(200)
    //                 .end((err, res) => {
    //                     resolve(res);
    //                 })
    //         )
    //     );

    //     let res2 = extractInfoFromResponse(
    //         await new Promise(resolve =>
    //             request(app)
    //                 .post("/session/refresh")
    //                 .set("Cookie", ["sRefreshToken=" + response.refreshToken])
    //                 .end((err, res) => {
    //                     resolve(res);
    //                 })
    //         )
    //     );
    //     //check the response of session / refresh is correct without anti-csrf
    //     assert(res2.antiCsrf !== undefined);
    //     assert(res2.accessToken !== undefined);
    //     assert(res2.refreshToken !== undefined);
    //     assert(res2.idRefreshTokenFromHeader !== undefined);
    //     assert(res2.idRefreshTokenFromCookie !== undefined);
    //     assert(res2.accessTokenExpiry !== undefined);
    //     assert(res2.refreshTokenExpiry !== undefined);
    //     assert(res2.idRefreshTokenExpiry !== undefined);

    //     let response3 = extractInfoFromResponse(
    //         await new Promise(resolve =>
    //             request(app)
    //                 .post("/session/verify")
    //                 .set("Cookie", [
    //                     "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie
    //                 ])
    //                 .end((err, res) => {
    //                     resolve(res);
    //                 })
    //         )
    //     );
    //     //check the response of session verify is correct without anti-csrf
    //     assert(response3.antiCsrf === undefined);
    //     assert(response3.accessToken != undefined);
    //     assert(response3.accessTokenExpiry != undefined);
    //     assert(response3.refreshToken === undefined);
    //     assert(response3.idRefreshTokenFromHeader === undefined);
    //     assert(response3.idRefreshTokenFromCookie === undefined);
    //     assert(response3.refreshTokenExpiry === undefined);
    //     assert(response3.idRefreshTokenExpiry === undefined);
    // });
});
