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
const { printPath, setupST, startST, killAllST, extractInfoFromResponse, constants } = require("./utils");
let ST = require("../lib/build/session");
let STExpress = require("../index");
let assert = require("assert");
let { ProcessState } = require("../lib/build/processState");
const nock = require("nock");
const express = require("express");
const supertest = require("supertest");
const axios = require("axios");
let cookieParser = require("cookie-parser");
let bodyParser = require("body-parser");
let urlencodedParser = bodyParser.urlencoded({ limit: "20mb", extended: true, parameterLimit: 20000 });
let jsonParser = bodyParser.json({ limit: "20mb" });

describe(`Auth0Handler: ${printPath("[test/auth0Handler.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    it("test auth0Handler login, no callback", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        nock(`https://${constants.AUTH0_DOMAIN}`)
            .post("/oauth/token")
            .reply(200, {
                id_token: constants.TEST_ID_TOKEN,
                expires_in: Date.now() + 30000,
                access_token: "test-access-token",
                refresh_token: "test-refresh-token",
            });

        let app = express();
        app.use(urlencodedParser);
        app.use(jsonParser);
        app.use(cookieParser());
        app.post("/create", async (req, res, next) => {
            try {
                return await STExpress.auth0Handler(
                    req,
                    res,
                    next,
                    constants.AUTH0_DOMAIN,
                    constants.AUTH0_CLIENT_ID,
                    constants.AUTH0_CLIENT_SECRET
                );
            } catch (err) {
                next(err);
            }
        });
        app.use((err, req, res, next) => {
            res.statusCode = 500;
            res.json({
                err: err.message,
            });
        });
        let response1 = await supertest(app).post("/create").send({
            action: "login",
            redirect_uri: "http://localhost:3000",
            code: "randomString",
        });
        assert.strictEqual(response1.body.id_token, constants.TEST_ID_TOKEN);
    });

    it("test auth0Handler login, with callback, no error thrown", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        nock(`https://${constants.AUTH0_DOMAIN}`)
            .post("/oauth/token")
            .reply(200, {
                id_token: constants.TEST_ID_TOKEN,
                expires_in: Date.now() + 30000,
                access_token: "test-access-token",
                refresh_token: "test-refresh-token",
            });

        let app = express();
        app.use(urlencodedParser);
        app.use(jsonParser);
        app.use(cookieParser());
        app.post("/create", async (req, res, next) => {
            return await STExpress.auth0Handler(
                req,
                res,
                next,
                constants.AUTH0_DOMAIN,
                constants.AUTH0_CLIENT_ID,
                constants.AUTH0_CLIENT_SECRET,
                async (userId, idToken, accessToken, refreshToken) => {
                    await STExpress.createNewSession(
                        res,
                        userId,
                        { accessToken, refreshToken },
                        {
                            refresh_token: refreshToken,
                            accessToken,
                        }
                    );
                }
            );
        });
        app.post("/sessionData", STExpress.middleware(), async (req, res) => {
            res.json(await req.session.getSessionData());
        });
        app.use((err, req, res, next) => {
            res.statusCode = 500;
            res.json({
                err: err.message,
            });
        });
        let response1 = extractInfoFromResponse(
            await supertest(app).post("/create").send({
                action: "login",
                redirect_uri: "http://localhost:3000",
                code: "randomString",
            })
        );
        await supertest(app)
            .post("/sessionData")
            .set("Cookie", [
                "sAccessToken=" + response1.accessToken + ";sIdRefreshToken=" + response1.idRefreshTokenFromCookie,
            ])
            .set("anti-csrf", response1.antiCsrf)
            .expect(200, {
                refresh_token: "test-refresh-token",
                accessToken: "test-access-token",
            });
    });

    it("test auth0Handler login, with callback, error thrown", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        nock(`https://${constants.AUTH0_DOMAIN}`)
            .post("/oauth/token")
            .reply(200, {
                id_token: constants.TEST_ID_TOKEN,
                expires_in: Date.now() + 30000,
                access_token: "test-access-token",
                refresh_token: "test-refresh-token",
            });

        let app = express();
        app.use(urlencodedParser);
        app.use(jsonParser);
        app.use(cookieParser());
        app.post("/create", async (req, res, next) => {
            return await STExpress.auth0Handler(
                req,
                res,
                next,
                constants.AUTH0_DOMAIN,
                constants.AUTH0_CLIENT_ID,
                constants.AUTH0_CLIENT_SECRET,
                async (userId, idToken, accessToken, refreshToken) => {
                    if (accessToken === "test-access-token") {
                        throw Error("access token not matching");
                    }
                }
            );
        });
        app.use((err, req, res, next) => {
            res.statusCode = 500;
            res.json({
                err: err.message,
            });
        });
        await supertest(app)
            .post("/create")
            .send({
                action: "login",
                redirect_uri: "http://localhost:3000",
                code: "randomString",
            })
            .expect(500, {
                err: "access token not matching",
            });
    });

    it("test auth0Handler login, non 200 response", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        nock(`https://${constants.AUTH0_DOMAIN}`).post("/oauth/token").reply(403, {});

        let app = express();
        app.use(urlencodedParser);
        app.use(jsonParser);
        app.use(cookieParser());
        app.post("/create", async (req, res, next) => {
            return await STExpress.auth0Handler(
                req,
                res,
                next,
                constants.AUTH0_DOMAIN,
                constants.AUTH0_CLIENT_ID,
                constants.AUTH0_CLIENT_SECRET
            );
        });
        app.use((err, req, res, next) => {
            res.statusCode = 500;
            res.json({
                err: err.message,
            });
        });
        await supertest(app)
            .post("/create")
            .send({
                action: "login",
                redirect_uri: "http://localhost:3000",
                code: "randomString",
            })
            .expect(403);
    });

    it("test auth0Handler login, invalid id_token", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        nock(`https://${constants.AUTH0_DOMAIN}`)
            .post("/oauth/token")
            .reply(200, {
                id_token: "invalid token",
                expires_in: Date.now() + 30000,
                access_token: "test-access-token",
                refresh_token: "test-refresh-token",
            });

        let app = express();
        app.use(urlencodedParser);
        app.use(jsonParser);
        app.use(cookieParser());
        app.post("/create", async (req, res, next) => {
            return await STExpress.auth0Handler(
                req,
                res,
                next,
                constants.AUTH0_DOMAIN,
                constants.AUTH0_CLIENT_ID,
                constants.AUTH0_CLIENT_SECRET
            );
        });
        app.use((err, req, res, next) => {
            res.statusCode = 500;
            res.json({
                err: err.message,
            });
        });
        await supertest(app)
            .post("/create")
            .send({
                action: "login",
                redirect_uri: "http://localhost:3000",
                code: "randomString",
            })
            .expect(500, {
                err: "invalid payload while decoding auth0 idToken",
            });
    });

    it("test auth0Handler logout, with middleware", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        nock(`https://${constants.AUTH0_DOMAIN}`)
            .post("/oauth/token")
            .reply(200, {
                id_token: constants.TEST_ID_TOKEN,
                expires_in: Date.now() + 30000,
                access_token: "test-access-token",
                refresh_token: "test-refresh-token",
            });

        let app = express();
        app.use(urlencodedParser);
        app.use(jsonParser);
        app.use(cookieParser());
        app.post("/create", async (req, res, next) => {
            return await STExpress.auth0Handler(
                req,
                res,
                next,
                constants.AUTH0_DOMAIN,
                constants.AUTH0_CLIENT_ID,
                constants.AUTH0_CLIENT_SECRET
            );
        });
        app.post("/logout", STExpress.middleware(), async (req, res, next) => {
            return await STExpress.auth0Handler(
                req,
                res,
                next,
                constants.AUTH0_DOMAIN,
                constants.AUTH0_CLIENT_ID,
                constants.AUTH0_CLIENT_SECRET
            );
        });
        app.post("/sessionData", STExpress.middleware(), async (req, res) => {
            res.json(await req.session.getSessionData());
        });
        app.use((err, req, res, next) => {
            res.statusCode = 500;
            res.json({
                err: err.message,
            });
        });
        let response1 = extractInfoFromResponse(
            await supertest(app).post("/create").send({
                action: "login",
                redirect_uri: "http://localhost:3000",
                code: "randomString",
            })
        );
        await supertest(app)
            .post("/sessionData")
            .set("Cookie", [
                "sAccessToken=" + response1.accessToken + ";sIdRefreshToken=" + response1.idRefreshTokenFromCookie,
            ])
            .set("anti-csrf", response1.antiCsrf)
            .expect(200, {
                refresh_token: "test-refresh-token",
            });
        let sessionRevokedResponse = await supertest(app)
            .post("/logout")
            .send({
                action: "logout",
            })
            .set("Cookie", [
                "sAccessToken=" + response1.accessToken + ";sIdRefreshToken=" + response1.idRefreshTokenFromCookie,
            ])
            .set("anti-csrf", response1.antiCsrf);
        let sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.idRefreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromCookie === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromHeader === "remove");
    });

    it("test auth0Handler logout, without middleware", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        nock(`https://${constants.AUTH0_DOMAIN}`)
            .post("/oauth/token")
            .reply(200, {
                id_token: constants.TEST_ID_TOKEN,
                expires_in: Date.now() + 30000,
                access_token: "test-access-token",
                refresh_token: "test-refresh-token",
            });

        let app = express();
        app.use(urlencodedParser);
        app.use(jsonParser);
        app.use(cookieParser());
        app.post("/create", async (req, res, next) => {
            return await STExpress.auth0Handler(
                req,
                res,
                next,
                constants.AUTH0_DOMAIN,
                constants.AUTH0_CLIENT_ID,
                constants.AUTH0_CLIENT_SECRET
            );
        });
        app.post("/logout", async (req, res, next) => {
            try {
                return await STExpress.auth0Handler(
                    req,
                    res,
                    constants.AUTH0_DOMAIN,
                    constants.AUTH0_CLIENT_ID,
                    constants.AUTH0_CLIENT_SECRET
                );
            } catch (err) {
                next(err);
            }
        });
        app.post("/sessionData", STExpress.middleware(), async (req, res) => {
            res.json(await req.session.getSessionData());
        });
        app.use((err, req, res, next) => {
            console.log(err);
            res.statusCode = 500;
            res.json({
                err: err.message,
            });
        });
        let response1 = extractInfoFromResponse(
            await supertest(app).post("/create").send({
                action: "login",
                redirect_uri: "http://localhost:3000",
                code: "randomString",
            })
        );
        await supertest(app)
            .post("/sessionData")
            .set("Cookie", [
                "sAccessToken=" + response1.accessToken + ";sIdRefreshToken=" + response1.idRefreshTokenFromCookie,
            ])
            .set("anti-csrf", response1.antiCsrf)
            .expect(200, {
                refresh_token: "test-refresh-token",
            });
        let sessionRevokedResponse = await supertest(app)
            .post("/logout")
            .send({
                action: "logout",
            })
            .set("Cookie", [
                "sAccessToken=" + response1.accessToken + ";sIdRefreshToken=" + response1.idRefreshTokenFromCookie,
            ])
            .set("anti-csrf", response1.antiCsrf);
        let sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse);
        assert(sessionRevokedResponseExtracted.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.idRefreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(sessionRevokedResponseExtracted.accessToken === "");
        assert(sessionRevokedResponseExtracted.refreshToken === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromCookie === "");
        assert(sessionRevokedResponseExtracted.idRefreshTokenFromHeader === "remove");
    });

    it("test auth0Handler refresh, with session data", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        nock(`https://${constants.AUTH0_DOMAIN}`)
            .post("/oauth/token")
            .reply(200, {
                id_token: constants.TEST_ID_TOKEN,
                expires_in: Date.now() + 30000,
                access_token: "test-access-token",
                refresh_token: "test-refresh-token",
            });

        let app = express();
        app.use(urlencodedParser);
        app.use(jsonParser);
        app.use(cookieParser());
        app.post("/create", async (req, res, next) => {
            return await STExpress.auth0Handler(
                req,
                res,
                next,
                constants.AUTH0_DOMAIN,
                constants.AUTH0_CLIENT_ID,
                constants.AUTH0_CLIENT_SECRET
            );
        });
        app.post("/refresh-auth0", async (req, res, next) => {
            return await STExpress.auth0Handler(
                req,
                res,
                next,
                constants.AUTH0_DOMAIN,
                constants.AUTH0_CLIENT_ID,
                constants.AUTH0_CLIENT_SECRET
            );
        });
        app.post("/sessionData", STExpress.middleware(), async (req, res) => {
            res.json(await req.session.getSessionData());
        });
        app.use((err, req, res, next) => {
            console.log(err);
            res.statusCode = 500;
            res.json({
                err: err.message,
            });
        });
        let response1 = extractInfoFromResponse(
            await supertest(app).post("/create").send({
                action: "login",
                redirect_uri: "http://localhost:3000",
                code: "randomString",
            })
        );
        await supertest(app)
            .post("/sessionData")
            .set("Cookie", [
                "sAccessToken=" + response1.accessToken + ";sIdRefreshToken=" + response1.idRefreshTokenFromCookie,
            ])
            .set("anti-csrf", response1.antiCsrf)
            .expect(200, {
                refresh_token: "test-refresh-token",
            });

        nock(`https://${constants.AUTH0_DOMAIN}`)
            .post("/oauth/token")
            .reply(200, {
                id_token: "custom",
                expires_in: Date.now() + 30000,
                access_token: "test-access-token-1",
                refresh_token: "test-refresh-token-1",
            });
        let response2 = await supertest(app)
            .post("/refresh-auth0")
            .send({
                action: "refresh",
            })
            .set("Cookie", [
                "sAccessToken=" + response1.accessToken + ";sIdRefreshToken=" + response1.idRefreshTokenFromCookie,
            ])
            .set("anti-csrf", response1.antiCsrf)
            .expect(200);
        assert.strictEqual(response2.body.id_token, "custom");
    });

    it("test auth0Handler refresh, no session data", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        nock(`https://${constants.AUTH0_DOMAIN}`)
            .post("/oauth/token")
            .reply(200, {
                id_token: constants.TEST_ID_TOKEN,
                expires_in: Date.now() + 30000,
                access_token: "test-access-token",
                refresh_token: "test-refresh-token",
            });

        let app = express();
        app.use(urlencodedParser);
        app.use(jsonParser);
        app.use(cookieParser());
        app.post("/create", async (req, res, next) => {
            return await STExpress.auth0Handler(
                req,
                res,
                next,
                constants.AUTH0_DOMAIN,
                constants.AUTH0_CLIENT_ID,
                constants.AUTH0_CLIENT_SECRET,
                async (userId, idToken, accessToken, refreshToken) => {
                    await STExpress.createNewSession(res, userId, {}, {});
                }
            );
        });
        app.post("/refresh-auth0", async (req, res, next) => {
            return await STExpress.auth0Handler(
                req,
                res,
                next,
                constants.AUTH0_DOMAIN,
                constants.AUTH0_CLIENT_ID,
                constants.AUTH0_CLIENT_SECRET
            );
        });
        app.post("/sessionData", STExpress.middleware(), async (req, res) => {
            res.json(await req.session.getSessionData());
        });
        app.use((err, req, res, next) => {
            console.log(err);
            res.statusCode = 500;
            res.json({
                err: err.message,
            });
        });
        let response1 = extractInfoFromResponse(
            await supertest(app).post("/create").send({
                action: "login",
                redirect_uri: "http://localhost:3000",
                code: "randomString",
            })
        );
        await supertest(app)
            .post("/sessionData")
            .set("Cookie", [
                "sAccessToken=" + response1.accessToken + ";sIdRefreshToken=" + response1.idRefreshTokenFromCookie,
            ])
            .set("anti-csrf", response1.antiCsrf)
            .expect(200, {});
        await supertest(app)
            .post("/refresh-auth0")
            .send({
                action: "refresh",
            })
            .set("Cookie", [
                "sAccessToken=" + response1.accessToken + ";sIdRefreshToken=" + response1.idRefreshTokenFromCookie,
            ])
            .set("anti-csrf", response1.antiCsrf)
            .expect(403, {});
    });

    it("test auth0Handler refresh, non 200 response", async function () {
        await startST();
        ST.init({ hosts: "http://localhost:8080" });
        nock(`https://${constants.AUTH0_DOMAIN}`)
            .post("/oauth/token")
            .reply(200, {
                id_token: constants.TEST_ID_TOKEN,
                expires_in: Date.now() + 30000,
                access_token: "test-access-token",
                refresh_token: "test-refresh-token",
            });

        let app = express();
        app.use(urlencodedParser);
        app.use(jsonParser);
        app.use(cookieParser());
        app.post("/create", async (req, res, next) => {
            return await STExpress.auth0Handler(
                req,
                res,
                next,
                constants.AUTH0_DOMAIN,
                constants.AUTH0_CLIENT_ID,
                constants.AUTH0_CLIENT_SECRET
            );
        });
        app.post("/refresh-auth0", async (req, res, next) => {
            return await STExpress.auth0Handler(
                req,
                res,
                next,
                constants.AUTH0_DOMAIN,
                constants.AUTH0_CLIENT_ID,
                constants.AUTH0_CLIENT_SECRET
            );
        });
        app.post("/sessionData", STExpress.middleware(), async (req, res) => {
            res.json(await req.session.getSessionData());
        });
        app.use((err, req, res, next) => {
            console.log(err);
            res.statusCode = 500;
            res.json({
                err: err.message,
            });
        });
        let response1 = extractInfoFromResponse(
            await supertest(app).post("/create").send({
                action: "login",
                redirect_uri: "http://localhost:3000",
                code: "randomString",
            })
        );
        await supertest(app)
            .post("/sessionData")
            .set("Cookie", [
                "sAccessToken=" + response1.accessToken + ";sIdRefreshToken=" + response1.idRefreshTokenFromCookie,
            ])
            .set("anti-csrf", response1.antiCsrf)
            .expect(200, {
                refresh_token: "test-refresh-token",
            });

        nock(`https://${constants.AUTH0_DOMAIN}`).post("/oauth/token").reply(403, {});
        await supertest(app)
            .post("/refresh-auth0")
            .send({
                action: "refresh",
            })
            .set("Cookie", [
                "sAccessToken=" + response1.accessToken + ";sIdRefreshToken=" + response1.idRefreshTokenFromCookie,
            ])
            .set("anti-csrf", response1.antiCsrf)
            .expect(403);
    });
});
