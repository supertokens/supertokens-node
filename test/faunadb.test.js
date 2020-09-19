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

/*
- test that retrieved faunadb token can be used with faunadb
- test that in refresh, new faunadb token is obtained
- test that frontend can read faunadb token
- many general session tests with express to test our middleware
*/

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

        // TODO: retrieved faunadb token can be used with faunadb
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
