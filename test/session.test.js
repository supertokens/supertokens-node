const { printPath, setupST, startST, stopST, killAllST, cleanST, extractInfoFromResponse } = require("./utils");
let ST = require("../session");
let STExpress = require("../index");
let assert = require("assert");
const nock = require("nock");
let { version } = require("../lib/build/version");
const express = require("express");
const request = require("supertest");
let { HandshakeInfo } = require("../lib/build/handshakeInfo");

describe(`session: ${printPath("[test/session.test.js]")}`, function() {
    beforeEach(async function() {
        await killAllST();
        await setupST();
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
        assert(response3.session !== undefined);
        assert(response3.accessToken !== undefined);
        assert(Object.keys(response3).length === 2);

        let response4 = await ST.revokeSessionUsingSessionHandle(response3.session.handle);
        assert(response4 === true);
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
        app.post("session/revoke", async (req, res) => {
            await STExpress.revokeSessionUsingSessionHandle("");
            req.status(200).send("");
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
        assert(Object.keys(res).length === 5);

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
        assert(Object.keys(res2).length === 5);

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
        assert(res3.accessToken != undefined);
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
            } catch (err) {
                if (!ST.Error.isErrorFromAuth(err) || err.errType !== ST.Error.TRY_REFRESH_TOKEN) {
                    throw err;
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

        //without anti-csrf present

        new Promise(resolve =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .end((err, res) => {
                    resolve(res);
                })
        );
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

        let response2 = extractInfoFromResponse(
            await new Promise(resolve =>
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
            )
        );
        assert(response2.idRefreshTokenFromHeader === "remove");

        let temp2 = extractInfoFromResponse(
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
                .post("/usercreate")
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );

        let temp3 = await new Promise(resolve =>
            request(app)
                .post("/session/revokeUserid")
                .set("Cookie", [
                    "sAccessToken=" + temp2.accessToken + ";sIdRefreshToken=" + temp2.idRefreshTokenFromCookie
                ])
                .set("anti-csrf", temp2.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );
        console.log(temp3);
    });

    //testing create new session
    it("test create new session", async function() {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);
        const app = express();
        app.post("/create", async (req, res) => {
            try {
                await STExpress.createNewSession(res, undefined, undefined, undefined);
                res.status(200).send("");
            } catch (error) {
                console.log(error);
            }
        });

        await new Promise(resolve =>
            request(app)
                .post("/create")
                .expect(200)
                .end((err, res) => {
                    resolve(res);
                })
        );
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
