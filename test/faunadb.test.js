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
let STExpress = require("../faunadb");
let assert = require("assert");
const nock = require("nock");
let { version } = require("../lib/build/version");
const express = require("express");
const request = require("supertest");
let { Querier } = require("../lib/build/querier");
let { HandshakeInfo } = require("../lib/build/handshakeInfo");
let { ProcessState, PROCESS_STATE } = require("../lib/build/processState");
let { maxVersion } = require("../lib/build/utils");
let faunadb = require("faunadb");
const q = faunadb.query;

/*
- many general session tests with express to test our middleware
- test lifetime of fauna db token is 30 secs + lifetime of access token
*/

describe(`faunaDB: ${printPath("[test/sessionExpress.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("getting FDAT from JWT payload", async function () {
        await startST();

        const app = express();
        app.use(
            STExpress.init({
                hosts: "http://localhost:8080",
                faunadbSecret: "fnAD2HH-Q6ACBSJxMjwU5YT7hvkaVo6Te8PJWqsT",
                userCollectionName: "users",
                accessFaunadbTokenFromFrontend: true,
            })
        );

        app.post("/create", async (req, res) => {
            await STExpress.createNewSession(res, "277082848991642117", {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", STExpress.middleware(), async (req, res) => {
            let jwtPayload = req.session.getJWTPayload();
            let token = await req.session.getFaunadbToken();
            if (token === undefined) {
                res.status(200).send("fail");
            } else {
                if (token === jwtPayload.faunadbToken) {
                    res.status(200).send("pass");
                } else {
                    res.status(200).send("fail");
                }
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

        res2 = await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    resolve(res.text);
                })
        );

        assert(res2 === "pass");

        let frontToken = JSON.parse(Buffer.from(res.frontToken, "base64").toString());

        let token = frontToken.up.faunadbToken;

        let faunaDBClient = new faunadb.Client({
            secret: token,
        });

        let faunaResponse = await faunaDBClient.query(q.Get(q.Ref(q.Collection("users"), "277082848991642117")));

        assert(faunaResponse.data.name === "test user 1");

        // refresh session and repeat the above
        let res3 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/refresh")
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                    .set("anti-csrf", res.antiCsrf)
                    .end((err, res) => {
                        resolve(res);
                    })
            )
        );

        res4 = await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", [
                    "sAccessToken=" + res3.accessToken + ";sIdRefreshToken=" + res3.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", res3.antiCsrf)
                .end((err, res) => {
                    resolve(res.text);
                })
        );

        assert(res4 === "pass");

        let frontToken2 = JSON.parse(Buffer.from(res3.frontToken, "base64").toString());

        let token2 = frontToken2.up.faunadbToken;

        assert(token2 !== token);

        faunaDBClient = new faunadb.Client({
            secret: token2,
        });

        faunaResponse = await faunaDBClient.query(q.Get(q.Ref(q.Collection("users"), "277082848991642117")));

        assert(faunaResponse.data.name === "test user 1");
    });

    it("getting FDAT from session data", async function () {
        await startST();

        const app = express();
        app.use(
            STExpress.init({
                hosts: "http://localhost:8080",
                faunadbSecret: "fnAD2HH-Q6ACBSJxMjwU5YT7hvkaVo6Te8PJWqsT",
                userCollectionName: "users",
            })
        );

        app.post("/create", async (req, res) => {
            await STExpress.createNewSession(res, "277082848991642117", {}, {});
            res.status(200).send("");
        });

        app.post("/session/verify", STExpress.middleware(), async (req, res) => {
            let sessionData = await req.session.getSessionData();
            let token = await req.session.getFaunadbToken();
            if (token === undefined) {
                res.status(200).send("fail");
            } else {
                if (token === sessionData.faunadbToken) {
                    res.status(200).send("pass");
                } else {
                    res.status(200).send("fail");
                }
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

        res = await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    resolve(res.text);
                })
        );

        assert(res === "pass");
    });
});
