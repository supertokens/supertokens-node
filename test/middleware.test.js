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
const { printPath, setupST, startST, killAllST, cleanST, extractInfoFromResponse } = require("./utils");
let ST = require("../session");
let STExpress = require("../index");
let assert = require("assert");
const express = require("express");
const request = require("supertest");
let { Querier } = require("../lib/build/querier");
let { sessionVerify } = require("../lib/build/middleware");
let { ProcessState } = require("../lib/build/processState");

describe(`middleware: ${printPath("[test/middleware.test.js]")}`, function() {
    beforeEach(async function() {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function() {
        await killAllST();
        await cleanST();
    });

    it("test session verify middleware", async function() {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080
            }
        ]);
        if ((await Querier.getInstance().getAPIVersion()) === "1.0") {
            return;
        }
        const app = express();
        app.post("/create", async (req, res) => {
            await STExpress.createNewSession(res, "testing-userId", {}, {});
            res.status(200).json({ message: true });
        });

        app.get("/user/id", sessionVerify(), async (req, res) => {
            res.status(200).json({ message: req.session.getUserId() });
        });

        app.get("/user/handle", sessionVerify(true), async (req, res) => {
            res.status(200).json({ message: req.session.getHandle() });
        });

        app.post("/refresh", sessionVerify(), async (req, res, next) => {
            try {
                await STExpress.refreshSession(req, res);
                res.status(200).json({ message: true });
            } catch (err) {
                next(err);
            }
        });

        app.post("/logout", sessionVerify(), async (req, res) => {
            await req.session.revokeSession();
            res.status(200).json({ message: true });
        });

        app.use((err, req, res, next) => {
            if (ST.Error.isErrorFromAuth(err)) {
                if (err.errType === ST.Error.UNAUTHORISED) {
                    res.statusCode = 440;
                    return res.json({
                        message: "unauthorised"
                    });
                } else if (err.errType === ST.Error.TRY_REFRESH_TOKEN) {
                    res.statusCode = 440;
                    return res.json({
                        message: "try refresh token"
                    });
                } else if (err.errType === ST.Error.TOKEN_THEFT_DETECTED) {
                    res.statusCode = 440;
                    return res.json({
                        message: "token theft detected"
                    });
                } else {
                    res.statusCode = 400;
                    return res.json({
                        message: "general error"
                    });
                }
            } else {
                res.statusCode = 500;
                return res.json({
                    message: "error 500"
                });
            }
        });

        let res1 = extractInfoFromResponse(
            await new Promise(resolve =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        let r1 = await new Promise(resolve =>
            request(app)
                .get("/user/id")
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie
                ])
                .set("anti-csrf", res1.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res.body.message);
                })
        );

        assert(r1 === "testing-userId");

        await new Promise(resolve =>
            request(app)
                .get("/user/handle")
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie
                ])
                .set("anti-csrf", res1.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res.body.message);
                })
        );

        // not passing anit csrf even if requried
        let r2 = await new Promise(resolve =>
            request(app)
                .get("/user/handle")
                .set("Cookie", [
                    "sAccessToken=" + res1.accessToken + ";sIdRefreshToken=" + res1.idRefreshTokenFromCookie
                ])
                .expect(440)
                .end((err, res) => {
                    resolve(res.body.message);
                })
        );
        assert(r2 === "try refresh token");

        // not passing id refresh token
        let r3 = await new Promise(resolve =>
            request(app)
                .get("/user/handle")
                .expect(440)
                .set("Cookie", ["sAccessToken=" + res1.accessToken])
                .set("anti-csrf", res1.antiCsrf)
                .end((err, res) => {
                    resolve(res.body.message);
                })
        );
        assert(r3 === "unauthorised");

        let res2 = extractInfoFromResponse(
            await new Promise(resolve =>
                request(app)
                    .post("/refresh")
                    .expect(200)
                    .set("Cookie", ["sRefreshToken=" + res1.refreshToken])
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        let res3 = extractInfoFromResponse(
            await new Promise(resolve =>
                request(app)
                    .get("/user/id")
                    .set("Cookie", [
                        "sAccessToken=" + res2.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie
                    ])
                    .set("anti-csrf", res2.antiCsrf)
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        await new Promise(resolve =>
            request(app)
                .get("/user/handle")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie
                ])
                .set("anti-csrf", res2.antiCsrf)
                .expect(200)
                .end((err, res) => {
                    resolve(res.body.message);
                })
        );

        let r4 = await new Promise(resolve =>
            request(app)
                .post("/refresh")
                .set("Cookie", ["sRefreshToken=" + res1.refreshToken])
                .expect(440)
                .end((err, res) => {
                    resolve(res.body.message);
                })
        );
        assert(r4 === "token theft detected");

        let res4 = extractInfoFromResponse(
            await new Promise(resolve =>
                request(app)
                    .post("/logout")
                    .set("Cookie", [
                        "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res2.idRefreshTokenFromCookie
                    ])
                    .set("anti-csrf", res2.antiCsrf)
                    .expect(200)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        assert.deepEqual(res4.antiCsrf, undefined);
        assert.deepEqual(res4.accessToken, "");
        assert.deepEqual(res4.refreshToken, "");
        assert.deepEqual(res4.idRefreshTokenFromHeader, "remove");
        assert.deepEqual(res4.idRefreshTokenFromCookie, "");
        assert.deepEqual(res4.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(res4.idRefreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.deepEqual(res4.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");

        let r5 = await new Promise(resolve =>
            request(app)
                .get("/user/handle")
                .set("Cookie", [
                    "sAccessToken=" + res4.accessToken + ";sIdRefreshToken=" + res4.idRefreshTokenFromCookie
                ])
                .expect(440)
                .end((err, res) => {
                    resolve(res.body.message);
                })
        );
        console.log(r5);
        assert(r5 === "try refresh token");
    });
});
