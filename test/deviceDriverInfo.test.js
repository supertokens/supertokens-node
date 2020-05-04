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
const { printPath, setupST, startST, stopST, killAllST, cleanST, extractInfoFromResponse } = require("./utils");
let ST = require("../lib/build/session");
let STExpress = require("../index");
let assert = require("assert");
const nock = require("nock");
let { version } = require("../lib/build/version");
const express = require("express");
const request = require("supertest");
let { HandshakeInfo } = require("../lib/build/handshakeInfo");
let { ProcessState } = require("../lib/build/processState");

/* TODO:
- check if output headers and set cookies for create session is fine
- check if output headers and set cookies for refresh session is fine
- check that if signing key changes, things are still fine
- check if input cookies are missing, an appropriate error is thrown
- the opposite of the above condition
- calling createNewSession twice, should overwrite the first call (in terms of cookies)
- calling createNewSession in the case of unauthorised error, should create a proper session
- revoking old session after create new session, should not remove new session's cookies.
- check that if idRefreshToken is not passed to express, verify throws UNAUTHORISED
- check that Access-Control-Expose-Headers header is being set properly during create, use and destroy session**** only for express
*/
describe(`deviceDriverInfo: ${printPath("[test/deviceDriverInfo.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("driver info check without frontendSDKs", async function () {
        await startST();
        const scope = nock("http://localhost:8080", { allowUnmocked: true })
            .post("/session")
            .reply((uri, rb) => {
                let success = false;
                try {
                    let ddi = rb.deviceDriverInfo;
                    if (
                        ddi !== undefined &&
                        ddi.frontendSDK.length === 0 &&
                        ddi.driver.name === "node" &&
                        ddi.driver.version === version
                    ) {
                        success = true;
                    }
                } catch (err) {}
                return [200, { success: success }];
            });
        ST.init([
            {
                hostname: "localhost",
                port: 8080,
            },
        ]);
        let response = await ST.createNewSession("", {}, {});
        assert.equal(response.success, true);
    });

    it("driver info check with frontendSDKs", async function () {
        await startST();
        STExpress.init([
            {
                hostname: "localhost",
                port: 8080,
            },
        ]);
        // server.
        let server;
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

        // calling server..
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
        await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .set("supertokens-sdk-name", "ios")
                .set("supertokens-sdk-version", "0.0.0")
                .end((err, res) => {
                    resolve();
                })
        );

        // with no frontend SDK headers.
        await new Promise((resolve) =>
            request(app)
                .post("/session/verify")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    resolve();
                })
        );

        await new Promise((resolve) =>
            request(app)
                .post("/session/refresh")
                .set("Cookie", ["sRefreshToken=" + res.refreshToken])
                .set("anti-csrf", res.antiCsrf)
                .set("supertokens-sdk-name", "android")
                .set("supertokens-sdk-version", "0.0.1")
                .end((err, res) => {
                    resolve();
                })
        );

        // mocking ST service
        nock("http://localhost:8080", { allowUnmocked: true })
            .post("/session")
            .reply((uri, rb) => {
                let ddi = rb.deviceDriverInfo;
                try {
                    assert.deepEqual(ddi, {
                        frontendSDK: [
                            { name: "ios", version: "0.0.0" },
                            { name: "android", version: "0.0.1" },
                        ],
                        driver: { name: "node", version },
                    });
                    return [200, { success: true }];
                } catch (err) {}
                return [200, { success: false }];
            });
        nock("http://localhost:8080", { allowUnmocked: true })
            .post("/session/verify")
            .reply((uri, rb) => {
                let ddi = rb.deviceDriverInfo;
                try {
                    assert.deepEqual(ddi, {
                        frontendSDK: [
                            { name: "ios", version: "0.0.0" },
                            { name: "android", version: "0.0.1" },
                        ],
                        driver: { name: "node", version },
                    });
                    return [
                        200,
                        { status: "OK", jwtSigningPublicKey: "", jwtSigningPublicKeyExpiryTime: 0, success: true },
                    ];
                } catch (err) {}
                return [200, { success: false }];
            });
        nock("http://localhost:8080", { allowUnmocked: true })
            .post("/session/refresh")
            .reply((uri, rb) => {
                let ddi = rb.deviceDriverInfo;
                try {
                    assert.deepEqual(ddi, {
                        frontendSDK: [
                            { name: "ios", version: "0.0.0" },
                            { name: "android", version: "0.0.1" },
                        ],
                        driver: { name: "node", version },
                    });
                    return [200, { success: true, status: "OK" }];
                } catch (err) {}
                return [200, { success: false }];
            });
        nock("http://localhost:8080", { allowUnmocked: true })
            .post("/handshake")
            .reply((uri, rb) => {
                let ddi = rb.deviceDriverInfo;
                try {
                    assert.deepEqual(ddi, {
                        frontendSDK: [
                            { name: "ios", version: "0.0.0" },
                            { name: "android", version: "0.0.1" },
                        ],
                        driver: { name: "node", version },
                    });
                    return [200, { jwtSigningPublicKey: "true" }];
                } catch (err) {}
                return [200, { jwtSigningPublicKey: "false" }];
            });
        assert.deepEqual(await ST.createNewSession("", {}, {}), { success: true });
        assert.deepEqual(await ST.getSession("", "", false, ""), {
            success: true,
        });
        assert.deepEqual(await ST.refreshSession(""), { success: true });
        HandshakeInfo.reset();
        assert.equal((await HandshakeInfo.getInstance()).jwtSigningPublicKey, "true");
    });

    it("options API", async function () {
        // TODO:
    });
});
