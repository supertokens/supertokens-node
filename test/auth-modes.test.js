/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
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
    killAllST,
    cleanST,
    extractInfoFromResponse,
    setKeyValueInConfig,
    delay,
} = require("./utils");
const assert = require("assert");
const { ProcessState } = require("../lib/build/processState");
const SuperTokens = require("../");
const Session = require("../recipe/session");
const { verifySession } = require("../recipe/session/framework/express");
const { middleware, errorHandler } = require("../framework/express");
const express = require("express");
const request = require("supertest");
const sinon = require("sinon");

const exampleJWT =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

describe(`auth-modes: ${printPath("[test/auth-modes.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    afterEach(function () {
        sinon.restore();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("with default getTokenTransferMethod", () => {
        describe("createNewSession", () => {
            describe("with default getTokenTransferMethod", () => {
                it("should default to header based session w/ no auth-mode header", async function () {
                    const connectionURI = await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            apiDomain: "api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [Session.init({ antiCsrf: "VIA_TOKEN" })],
                    });

                    const app = getTestApp();

                    const resp = await createSession(app);
                    assert.strictEqual(resp.accessToken, undefined);
                    assert.strictEqual(resp.refreshToken, undefined);
                    assert.strictEqual(resp.antiCsrf, undefined);
                    assert.notStrictEqual(resp.accessTokenFromHeader, undefined);
                    assert.notStrictEqual(resp.refreshTokenFromHeader, undefined);
                });

                it("should default to header based session w/ bad auth-mode header", async function () {
                    const connectionURI = await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            apiDomain: "api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [Session.init({ antiCsrf: "VIA_TOKEN" })],
                    });

                    const app = getTestApp();

                    const resp = await createSession(app, "lol");
                    assert.strictEqual(resp.accessToken, undefined);
                    assert.strictEqual(resp.refreshToken, undefined);
                    assert.strictEqual(resp.antiCsrf, undefined);
                    assert.notStrictEqual(resp.accessTokenFromHeader, undefined);
                    assert.notStrictEqual(resp.refreshTokenFromHeader, undefined);
                });

                it("should use headers if auth-mode specifies it", async function () {
                    const connectionURI = await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            apiDomain: "api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [Session.init({ antiCsrf: "VIA_TOKEN" })],
                    });

                    const app = getTestApp();

                    const resp = await createSession(app, "header");
                    assert.strictEqual(resp.accessToken, undefined);
                    assert.strictEqual(resp.refreshToken, undefined);
                    assert.strictEqual(resp.antiCsrf, undefined);
                    assert.notStrictEqual(resp.accessTokenFromHeader, undefined);
                    assert.notStrictEqual(resp.refreshTokenFromHeader, undefined);
                });

                it("should use cookies if auth-mode specifies it", async function () {
                    const connectionURI = await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            apiDomain: "api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [Session.init({ antiCsrf: "VIA_TOKEN" })],
                    });

                    const app = getTestApp();

                    const resp = await createSession(app, "cookie");
                    assert.notStrictEqual(resp.accessToken, undefined);
                    assert.notStrictEqual(resp.refreshToken, undefined);
                    assert.notStrictEqual(resp.antiCsrf, undefined);
                    assert.strictEqual(resp.accessTokenFromHeader, undefined);
                    assert.strictEqual(resp.refreshTokenFromHeader, undefined);

                    // We check that we will have access token at least as long as we have a refresh token
                    // so verify session can return TRY_REFRESH_TOKEN
                    assert(Date.parse(resp.accessTokenExpiry) >= Date.parse(resp.refreshTokenExpiry));
                });
            });

            describe("with user provided getTokenTransferMethod", () => {
                it("should use headers if getTokenTransferMethod returns any and there is no st-auth-mode header", async function () {
                    const connectionURI = await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            apiDomain: "api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [Session.init({ antiCsrf: "VIA_TOKEN", getTokenTransferMethod: () => "any" })],
                    });

                    const app = getTestApp();

                    const resp = await createSession(app, undefined);
                    assert.strictEqual(resp.accessToken, undefined);
                    assert.strictEqual(resp.refreshToken, undefined);
                    assert.strictEqual(resp.antiCsrf, undefined);
                    assert.notStrictEqual(resp.accessTokenFromHeader, undefined);
                    assert.notStrictEqual(resp.refreshTokenFromHeader, undefined);
                });

                it("should use cookies if getTokenTransferMethod returns any and st-auth-mode is set to cookie", async function () {
                    const connectionURI = await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            apiDomain: "api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [Session.init({ antiCsrf: "VIA_TOKEN", getTokenTransferMethod: () => "any" })],
                    });

                    const app = getTestApp();

                    const resp = await createSession(app, "cookie");
                    assert.notStrictEqual(resp.accessToken, undefined);
                    assert.notStrictEqual(resp.refreshToken, undefined);
                    assert.notStrictEqual(resp.antiCsrf, undefined);
                    assert.strictEqual(resp.accessTokenFromHeader, undefined);
                    assert.strictEqual(resp.refreshTokenFromHeader, undefined);
                });

                it("should use headers if getTokenTransferMethod returns any and st-auth-mode is set to header", async function () {
                    const connectionURI = await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            apiDomain: "api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [Session.init({ antiCsrf: "VIA_TOKEN", getTokenTransferMethod: () => "any" })],
                    });

                    const app = getTestApp();

                    const resp = await createSession(app, "header");
                    assert.strictEqual(resp.accessToken, undefined);
                    assert.strictEqual(resp.refreshToken, undefined);
                    assert.strictEqual(resp.antiCsrf, undefined);
                    assert.notStrictEqual(resp.accessTokenFromHeader, undefined);
                    assert.notStrictEqual(resp.refreshTokenFromHeader, undefined);
                });

                it("should use headers if getTokenTransferMethod returns header", async function () {
                    const connectionURI = await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            apiDomain: "api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [Session.init({ antiCsrf: "VIA_TOKEN", getTokenTransferMethod: () => "header" })],
                    });

                    const app = getTestApp();

                    const resp = await createSession(app, "cookie");
                    assert.strictEqual(resp.accessToken, undefined);
                    assert.strictEqual(resp.refreshToken, undefined);
                    assert.strictEqual(resp.antiCsrf, undefined);
                    assert.notStrictEqual(resp.accessTokenFromHeader, undefined);
                    assert.notStrictEqual(resp.refreshTokenFromHeader, undefined);
                });

                it("should use clear cookies (if present) if getTokenTransferMethod returns header", async function () {
                    const connectionURI = await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            apiDomain: "api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [Session.init({ antiCsrf: "VIA_TOKEN", getTokenTransferMethod: () => "header" })],
                    });

                    const app = getTestApp();

                    const resp = extractInfoFromResponse(
                        await new Promise((resolve, reject) => {
                            const req = request(app).post("/create");
                            req.set("st-auth-mode", "header");
                            return req
                                .set("Cookie", ["sAccessToken=" + exampleJWT])
                                .send(undefined)
                                .expect(200)
                                .end((err, res) => {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve(res);
                                    }
                                });
                        })
                    );
                    assert.strictEqual(resp.accessToken, "");
                    assert.strictEqual(resp.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                    assert.strictEqual(resp.refreshToken, "");
                    assert.strictEqual(resp.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                    assert.strictEqual(resp.antiCsrf, undefined);
                });

                it("should use cookies if getTokenTransferMethod returns cookie", async function () {
                    const connectionURI = await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            apiDomain: "api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [Session.init({ antiCsrf: "VIA_TOKEN", getTokenTransferMethod: () => "cookie" })],
                    });

                    const app = getTestApp();

                    const resp = await createSession(app, "header");
                    assert.notStrictEqual(resp.accessToken, undefined);
                    assert.notStrictEqual(resp.refreshToken, undefined);
                    assert.notStrictEqual(resp.antiCsrf, undefined);
                    assert.strictEqual(resp.accessTokenFromHeader, undefined);
                    assert.strictEqual(resp.refreshTokenFromHeader, undefined);

                    // We check that we will have access token at least as long as we have a refresh token
                    // so verify session can return TRY_REFRESH_TOKEN
                    assert(Date.parse(resp.accessTokenExpiry) >= Date.parse(resp.refreshTokenExpiry));
                });

                it("should clear headers (if present) if getTokenTransferMethod returns cookie", async function () {
                    const connectionURI = await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            apiDomain: "api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [Session.init({ antiCsrf: "VIA_TOKEN", getTokenTransferMethod: () => "cookie" })],
                    });

                    const app = getTestApp();

                    const resp = extractInfoFromResponse(
                        await new Promise((resolve, reject) => {
                            const req = request(app).post("/create");
                            req.set("st-auth-mode", "header");
                            return req
                                .set("Authorization", `Bearer ${exampleJWT}`)
                                .send(undefined)
                                .expect(200)
                                .end((err, res) => {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve(res);
                                    }
                                });
                        })
                    );

                    assert.strictEqual(resp.accessTokenFromHeader, "");
                    assert.strictEqual(resp.refreshTokenFromHeader, "");
                });
            });
        });

        describe("verifySession", () => {
            describe("from behaviour table", () => {
                // prettier-ignore
                const behaviourTable = [
                    { getTokenTransferMethodRes: "any", sessionRequired: false, authHeader: false, authCookie: false, output: "undefined" },
                    { getTokenTransferMethodRes: "header", sessionRequired: false, authHeader: false, authCookie: false, output: "undefined" },
                    { getTokenTransferMethodRes: "cookie", sessionRequired: false, authHeader: false, authCookie: false, output: "undefined" },
                    { getTokenTransferMethodRes: "cookie", sessionRequired: false, authHeader: true, authCookie: false, output: "undefined" },
                    { getTokenTransferMethodRes: "header", sessionRequired: false, authHeader: false, authCookie: true, output: "undefined" },
                    { getTokenTransferMethodRes: "any", sessionRequired: true, authHeader: false, authCookie: false, output: "UNAUTHORISED" },
                    { getTokenTransferMethodRes: "header", sessionRequired: true, authHeader: false, authCookie: false, output: "UNAUTHORISED" },
                    { getTokenTransferMethodRes: "cookie", sessionRequired: true, authHeader: false, authCookie: false, output: "UNAUTHORISED" },
                    { getTokenTransferMethodRes: "cookie", sessionRequired: true, authHeader: true, authCookie: false, output: "UNAUTHORISED" },
                    { getTokenTransferMethodRes: "header", sessionRequired: true, authHeader: false, authCookie: true, output: "UNAUTHORISED" },
                    { getTokenTransferMethodRes: "any", sessionRequired: true, authHeader: true, authCookie: true, output: "validateheader" },
                    { getTokenTransferMethodRes: "any", sessionRequired: false, authHeader: true, authCookie: true, output: "validateheader" },
                    { getTokenTransferMethodRes: "header", sessionRequired: true, authHeader: true, authCookie: true, output: "validateheader" },
                    { getTokenTransferMethodRes: "header", sessionRequired: false, authHeader: true, authCookie: true, output: "validateheader" },
                    { getTokenTransferMethodRes: "cookie", sessionRequired: true, authHeader: true, authCookie: true, output: "validatecookie" },
                    { getTokenTransferMethodRes: "cookie", sessionRequired: false, authHeader: true, authCookie: true, output: "validatecookie" },
                    { getTokenTransferMethodRes: "any", sessionRequired: true, authHeader: true, authCookie: false, output: "validateheader" },
                    { getTokenTransferMethodRes: "any", sessionRequired: false, authHeader: true, authCookie: false, output: "validateheader" },
                    { getTokenTransferMethodRes: "header", sessionRequired: true, authHeader: true, authCookie: false, output: "validateheader" },
                    { getTokenTransferMethodRes: "header", sessionRequired: false, authHeader: true, authCookie: false, output: "validateheader" },
                    { getTokenTransferMethodRes: "any", sessionRequired: true, authHeader: false, authCookie: true, output: "validatecookie" },
                    { getTokenTransferMethodRes: "any", sessionRequired: false, authHeader: false, authCookie: true, output: "validatecookie" },
                    { getTokenTransferMethodRes: "cookie", sessionRequired: true, authHeader: false, authCookie: true, output: "validatecookie" },
                    { getTokenTransferMethodRes: "cookie", sessionRequired: false, authHeader: false, authCookie: true, output: "validatecookie" },
                ];

                for (let i = 0; i < behaviourTable.length; ++i) {
                    const conf = behaviourTable[i];
                    it(`should match line ${i + 1} with a valid token`, async () => {
                        const connectionURI = await startST();
                        SuperTokens.init({
                            supertokens: {
                                connectionURI,
                            },
                            appInfo: {
                                apiDomain: "api.supertokens.io",
                                appName: "SuperTokens",
                                websiteDomain: "supertokens.io",
                            },
                            recipeList: [
                                Session.init({
                                    getTokenTransferMethod: () => conf.getTokenTransferMethodRes,
                                    antiCsrf: "VIA_TOKEN",
                                }),
                            ],
                        });

                        const app = getTestApp();

                        const createInfo = await createSession(app, "cookie");

                        const authMode =
                            conf.authCookie && conf.authHeader
                                ? "both"
                                : conf.authCookie
                                ? "cookie"
                                : conf.authHeader
                                ? "header"
                                : "none";

                        const res = await testGet(
                            app,
                            createInfo,
                            conf.sessionRequired ? "/verify" : "/verify-optional",
                            conf.output === "UNAUTHORISED" ? 401 : 200,
                            authMode
                        );
                        switch (conf.output) {
                            case "undefined":
                                assert.strictEqual(res.body.sessionExists, false);
                                break;
                            case "UNAUTHORISED":
                                assert.deepStrictEqual(res.body, { message: "unauthorised" });
                                break;
                            case "validatecookie":
                            case "validateheader":
                                assert.strictEqual(res.body.sessionExists, true);
                        }
                    });

                    it(`should match line ${i + 1} with a expired token`, async () => {
                        const connectionURI = await startST({ coreConfig: { access_token_validity: 2 } });
                        SuperTokens.init({
                            supertokens: {
                                connectionURI,
                            },
                            appInfo: {
                                apiDomain: "api.supertokens.io",
                                appName: "SuperTokens",
                                websiteDomain: "supertokens.io",
                            },
                            recipeList: [
                                Session.init({
                                    getTokenTransferMethod: () => conf.getTokenTransferMethodRes,
                                    antiCsrf: "VIA_TOKEN",
                                }),
                            ],
                        });

                        const app = getTestApp();

                        const createInfo = await createSession(app, "cookie");
                        await delay(3);
                        const authMode =
                            conf.authCookie && conf.authHeader
                                ? "both"
                                : conf.authCookie
                                ? "cookie"
                                : conf.authHeader
                                ? "header"
                                : "none";

                        const res = await testGet(
                            app,
                            createInfo,
                            conf.sessionRequired ? "/verify" : "/verify-optional",
                            conf.output !== "undefined" ? 401 : 200,
                            authMode
                        );
                        switch (conf.output) {
                            case "undefined":
                                assert.strictEqual(res.body.sessionExists, false);
                                break;
                            case "UNAUTHORISED":
                                assert.deepStrictEqual(res.body, { message: "unauthorised" });
                                break;
                            case "validatecookie":
                            case "validateheader":
                                assert.deepStrictEqual(res.body, { message: "try refresh token" });
                        }
                    });
                }
            });

            describe("with access tokens in both headers and cookies", () => {
                it("should use the value from headers if getTokenTransferMethod returns any", async () => {
                    const connectionURI = await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            apiDomain: "api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [
                            Session.init({
                                getTokenTransferMethod: () => "any",
                                antiCsrf: "VIA_TOKEN",
                            }),
                        ],
                    });

                    const app = getTestApp();

                    const createInfoCookie = await createSession(app, "header");
                    const createInfoHeader = await createSession(app, "header");

                    const resp = await new Promise((resolve, reject) => {
                        const req = request(app).get("/verify");

                        req.set("Cookie", ["sAccessToken=" + createInfoCookie.accessTokenFromHeader]);
                        if (createInfoCookie.antiCsrf) {
                            req.set("anti-csrf", info.antiCsrf);
                        }
                        req.set(
                            "Authorization",
                            `Bearer ${decodeURIComponent(createInfoHeader.accessTokenFromHeader)}`
                        );
                        req.expect(200).end((err, res) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(res);
                            }
                        });
                    });

                    assert.strictEqual(resp.body.sessionHandle, createInfoHeader.body.sessionHandle);
                });

                it("should use the value from headers if getTokenTransferMethod returns header", async () => {
                    const connectionURI = await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            apiDomain: "api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [
                            Session.init({
                                getTokenTransferMethod: ({ forCreateNewSession }) =>
                                    forCreateNewSession ? "any" : "header",
                                antiCsrf: "VIA_TOKEN",
                            }),
                        ],
                    });

                    const app = getTestApp();

                    const createInfoCookie = await createSession(app, "header");
                    const createInfoHeader = await createSession(app, "header");

                    const resp = await new Promise((resolve, reject) => {
                        const req = request(app).get("/verify");

                        req.set("Cookie", ["sAccessToken=" + createInfoCookie.accessTokenFromHeader]);
                        if (createInfoCookie.antiCsrf) {
                            req.set("anti-csrf", info.antiCsrf);
                        }
                        req.set(
                            "Authorization",
                            `Bearer ${decodeURIComponent(createInfoHeader.accessTokenFromHeader)}`
                        );
                        req.expect(200).end((err, res) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(res);
                            }
                        });
                    });

                    assert.strictEqual(resp.body.sessionHandle, createInfoHeader.body.sessionHandle);
                });

                it("should use the value from cookies if getTokenTransferMethod returns cookie", async () => {
                    const connectionURI = await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            apiDomain: "api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [
                            Session.init({
                                getTokenTransferMethod: ({ forCreateNewSession }) =>
                                    forCreateNewSession ? "any" : "cookie",
                                antiCsrf: "VIA_TOKEN",
                            }),
                        ],
                    });

                    const app = getTestApp();

                    const createInfoCookie = await createSession(app, "header");
                    const createInfoHeader = await createSession(app, "header");

                    const resp = await new Promise((resolve, reject) => {
                        const req = request(app).get("/verify");

                        req.set("Cookie", ["sAccessToken=" + createInfoCookie.accessTokenFromHeader]);
                        if (createInfoCookie.antiCsrf) {
                            req.set("anti-csrf", info.antiCsrf);
                        }
                        req.set(
                            "Authorization",
                            `Bearer ${decodeURIComponent(createInfoHeader.accessTokenFromHeader)}`
                        );
                        req.expect(200).end((err, res) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(res);
                            }
                        });
                    });

                    assert.strictEqual(resp.body.sessionHandle, createInfoCookie.body.sessionHandle);
                });
            });

            it("should reject requests with sIdRefreshToken", async () => {
                const connectionURI = await startST();
                SuperTokens.init({
                    supertokens: {
                        connectionURI,
                    },
                    appInfo: {
                        apiDomain: "api.supertokens.io",
                        appName: "SuperTokens",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [
                        Session.init({
                            antiCsrf: "VIA_TOKEN",
                        }),
                    ],
                });

                const app = getTestApp();

                const createInfo = await createSession(app, "cookie");

                const res = await new Promise((resolve, reject) =>
                    request(app)
                        .get("/verify")
                        .set("Cookie", [
                            "sAccessToken=" + createInfo.accessToken,
                            "sIdRefreshToken=" + createInfo.refreshToken, // The value doesn't actually matter
                        ])
                        .set("anti-csrf", createInfo.antiCsrf)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );
                assert.strictEqual(res.status, 401);
                assert.deepStrictEqual(res.body, { message: "try refresh token" });
            });

            describe("with non ST in Authorize header", () => {
                it("should use the value from cookies if present and getTokenTransferMethod returns any", async () => {
                    const connectionURI = await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            apiDomain: "api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [
                            Session.init({
                                getTokenTransferMethod: () => "any",
                                antiCsrf: "VIA_TOKEN",
                            }),
                        ],
                    });

                    const app = getTestApp();

                    const createInfoCookie = await createSession(app, "header");

                    const resp = await new Promise((resolve, reject) => {
                        const req = request(app).get("/verify");

                        req.set("Cookie", ["sAccessToken=" + createInfoCookie.accessTokenFromHeader]);
                        if (createInfoCookie.antiCsrf) {
                            req.set("anti-csrf", info.antiCsrf);
                        }
                        req.set("Authorization", `Bearer ${exampleJWT}`);
                        req.expect(200).end((err, res) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(res);
                            }
                        });
                    });

                    assert.strictEqual(resp.body.sessionHandle, createInfoCookie.body.sessionHandle);
                });

                it("should reject with UNAUTHORISED if getTokenTransferMethod returns header", async () => {
                    const connectionURI = await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            apiDomain: "api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [
                            Session.init({
                                getTokenTransferMethod: ({ forCreateNewSession }) =>
                                    forCreateNewSession ? "any" : "header",
                                antiCsrf: "VIA_TOKEN",
                            }),
                        ],
                    });

                    const app = getTestApp();

                    const createInfoCookie = await createSession(app, "header");

                    const resp = await new Promise((resolve, reject) => {
                        const req = request(app).get("/verify");

                        req.set("Cookie", ["sAccessToken=" + createInfoCookie.accessTokenFromHeader]);
                        if (createInfoCookie.antiCsrf) {
                            req.set("anti-csrf", info.antiCsrf);
                        }
                        req.set("Authorization", `Bearer ${exampleJWT}`);
                        req.end((err, res) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(res);
                            }
                        });
                    });
                    assert.strictEqual(resp.status, 401);
                    assert.deepStrictEqual(resp.body, { message: "unauthorised" });
                });

                it("should reject with UNAUTHORISED if cookies are not present", async () => {
                    const connectionURI = await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            apiDomain: "api.supertokens.io",
                            appName: "SuperTokens",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [
                            Session.init({
                                getTokenTransferMethod: ({}) => "any",
                                antiCsrf: "VIA_TOKEN",
                            }),
                        ],
                    });

                    const app = getTestApp();

                    const resp = await new Promise((resolve, reject) => {
                        const req = request(app).get("/verify");

                        req.set("Authorization", `Bearer ${exampleJWT}`);
                        req.end((err, res) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(res);
                            }
                        });
                    });

                    assert.strictEqual(resp.status, 401);
                    assert.deepStrictEqual(resp.body, { message: "unauthorised" });
                });
            });
        });

        describe("mergeIntoAccessTokenPayload", () => {
            it("should update cookies if the session was cookie based", async function () {
                const connectionURI = await startST();
                SuperTokens.init({
                    supertokens: {
                        connectionURI,
                    },
                    appInfo: {
                        apiDomain: "api.supertokens.io",
                        appName: "SuperTokens",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [Session.init({ antiCsrf: "VIA_TOKEN" })],
                });

                const app = getTestApp();

                const createInfo = await createSession(app, "header");

                const updateInfo = extractInfoFromResponse(
                    await testGet(app, createInfo, "/update-payload", 200, "cookie", undefined)
                );

                // Didn't update
                assert.strictEqual(updateInfo.refreshToken, undefined);
                assert.strictEqual(updateInfo.antiCsrf, undefined);
                assert.strictEqual(updateInfo.accessTokenFromHeader, undefined);
                assert.strictEqual(updateInfo.refreshTokenFromHeader, undefined);

                // Updated access token
                assert.notStrictEqual(updateInfo.accessToken, undefined);
                assert.notStrictEqual(updateInfo.accessToken, createInfo.accessTokenFromHeader);

                // Updated front token
                assert.notStrictEqual(updateInfo.frontToken, undefined);
                assert.notStrictEqual(updateInfo.frontToken, createInfo.frontToken);
            });

            it("should allow headers if the session was header based", async function () {
                const connectionURI = await startST();
                SuperTokens.init({
                    supertokens: {
                        connectionURI,
                    },
                    appInfo: {
                        apiDomain: "api.supertokens.io",
                        appName: "SuperTokens",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [Session.init({ antiCsrf: "VIA_TOKEN" })],
                });

                const app = getTestApp();

                const createInfo = await createSession(app, "cookie");

                const updateInfo = extractInfoFromResponse(
                    await testGet(app, createInfo, "/update-payload", 200, "header", undefined)
                );

                // Didn't update
                assert.strictEqual(updateInfo.accessToken, undefined);
                assert.strictEqual(updateInfo.refreshToken, undefined);
                assert.strictEqual(updateInfo.antiCsrf, undefined);
                assert.strictEqual(updateInfo.refreshTokenFromHeader, undefined);

                // Updated access token
                assert.notStrictEqual(updateInfo.accessTokenFromHeader, undefined);
                assert.notStrictEqual(updateInfo.accessTokenFromHeader, createInfo.accessToken);

                // Updated front token
                assert.notStrictEqual(updateInfo.frontToken, undefined);
                assert.notStrictEqual(updateInfo.frontToken, createInfo.frontToken);
            });
        });

        describe("refreshSession", () => {
            describe("from behaviour table", () => {
                // prettier-ignore
                const behaviourTable = [
                    { getTokenTransferMethodRes: "any", authHeader: false, authCookie: false, output: "unauthorised", setTokens: "none", clearedTokens: "none" },
                    { getTokenTransferMethodRes: "header", authHeader: false, authCookie: false, output: "unauthorised", setTokens: "none", clearedTokens: "none" },
                    { getTokenTransferMethodRes: "cookie", authHeader: false, authCookie: false, output: "unauthorised", setTokens: "none", clearedTokens: "none" },
                    { getTokenTransferMethodRes: "any", authHeader: false, authCookie: true, output: "validatecookie", setTokens: "cookies", clearedTokens: "none" },
                    { getTokenTransferMethodRes: "header", authHeader: false, authCookie: true, output: "unauthorised", setTokens: "none", clearedTokens: "none" }, // 5
                    { getTokenTransferMethodRes: "cookie", authHeader: false, authCookie: true, output: "validatecookie", setTokens: "cookies", clearedTokens: "none" },
                    { getTokenTransferMethodRes: "any", authHeader: true, authCookie: false, output: "validateheader", setTokens: "headers", clearedTokens: "none" },
                    { getTokenTransferMethodRes: "header", authHeader: true, authCookie: false, output: "validateheader", setTokens: "headers", clearedTokens: "none" },
                    { getTokenTransferMethodRes: "cookie", authHeader: true, authCookie: false, output: "unauthorised", setTokens: "none", clearedTokens: "none" }, // 9
                    { getTokenTransferMethodRes: "any", authHeader: true, authCookie: true, output: "validateheader", setTokens: "headers", clearedTokens: "cookies" },
                    { getTokenTransferMethodRes: "header", authHeader: true, authCookie: true, output: "validateheader", setTokens: "headers", clearedTokens: "cookies" },
                    { getTokenTransferMethodRes: "cookie", authHeader: true, authCookie: true, output: "validatecookie", setTokens: "cookies", clearedTokens: "headers" }, // 12
                ];

                for (let i = 0; i < behaviourTable.length; ++i) {
                    const conf = behaviourTable[i];
                    it(`should match line ${i + 1} with a valid token`, async () => {
                        const connectionURI = await startST();
                        SuperTokens.init({
                            supertokens: {
                                connectionURI,
                            },
                            appInfo: {
                                apiDomain: "api.supertokens.io",
                                appName: "SuperTokens",
                                websiteDomain: "supertokens.io",
                            },
                            recipeList: [
                                Session.init({
                                    getTokenTransferMethod: () => conf.getTokenTransferMethodRes,
                                    antiCsrf: "VIA_TOKEN",
                                }),
                            ],
                        });

                        const app = getTestApp();

                        // Which we create doesn't really matter, since the token is the same
                        const createInfo = await createSession(app, "header");

                        const authMode =
                            conf.authCookie && conf.authHeader
                                ? "both"
                                : conf.authCookie
                                ? "cookie"
                                : conf.authHeader
                                ? "header"
                                : "none";

                        const refreshRes = await refreshSession(
                            app,
                            conf.getTokenTransferMethodRes,
                            authMode,
                            createInfo
                        );

                        if (conf.output === "unauthorised") {
                            assert.strictEqual(refreshRes.status, 401);
                            assert.deepStrictEqual(refreshRes.body, { message: "unauthorised" });
                        } else {
                            assert.strictEqual(refreshRes.status, 200);
                        }

                        if (conf.clearedTokens === "headers") {
                            assert.strictEqual(refreshRes.accessTokenFromHeader, "");
                            assert.strictEqual(refreshRes.refreshTokenFromHeader, "");
                        } else if (conf.clearedTokens === "cookies") {
                            assert.strictEqual(refreshRes.accessToken, "");
                            assert.strictEqual(refreshRes.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                            assert.strictEqual(refreshRes.refreshToken, "");
                            assert.strictEqual(refreshRes.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                        }

                        switch (conf.setTokens) {
                            case "headers":
                                assert.ok(refreshRes.accessTokenFromHeader);
                                assert.notStrictEqual(refreshRes.accessTokenFromHeader, "");
                                assert.ok(refreshRes.refreshTokenFromHeader);
                                assert.notStrictEqual(refreshRes.refreshTokenFromHeader, "");
                                break;
                            case "cookies":
                                assert.notStrictEqual(refreshRes.accessToken, "");
                                assert.notStrictEqual(refreshRes.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                                assert.notStrictEqual(refreshRes.refreshToken, "");
                                assert.notStrictEqual(refreshRes.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                                break;
                            case "none":
                                if (conf.clearedTokens === "none") {
                                    assert.strictEqual(refreshRes.frontToken, undefined);
                                }
                                break;
                        }
                        if (conf.setTokens !== "cookies" && conf.clearedTokens !== "cookies") {
                            assert.strictEqual(refreshRes.accessToken, undefined);
                            assert.strictEqual(refreshRes.accessTokenExpiry, undefined);
                            assert.strictEqual(refreshRes.refreshToken, undefined);
                            assert.strictEqual(refreshRes.refreshTokenExpiry, undefined);
                        }
                        if (conf.setTokens !== "headers" && conf.clearedTokens !== "headers") {
                            assert.strictEqual(refreshRes.accessTokenFromHeader, undefined);
                            assert.strictEqual(refreshRes.refreshTokenFromHeader, undefined);
                        }
                    });
                }

                for (let i = 0; i < behaviourTable.length; ++i) {
                    const conf = behaviourTable[i];

                    it(`should match line ${i + 1} with a invalid token`, async () => {
                        const connectionURI = await startST();
                        SuperTokens.init({
                            supertokens: {
                                connectionURI,
                            },
                            appInfo: {
                                apiDomain: "api.supertokens.io",
                                appName: "SuperTokens",
                                websiteDomain: "supertokens.io",
                            },
                            recipeList: [
                                Session.init({
                                    getTokenTransferMethod: () => conf.getTokenTransferMethodRes,
                                    antiCsrf: "VIA_TOKEN",
                                }),
                            ],
                        });

                        const app = getTestApp();

                        const infoWithInvalidRefreshToken = {
                            refreshToken: "asdf",
                        };

                        const authMode =
                            conf.authCookie && conf.authHeader
                                ? "both"
                                : conf.authCookie
                                ? "cookie"
                                : conf.authHeader
                                ? "header"
                                : "none";

                        const refreshRes = await refreshSession(
                            app,
                            conf.getTokenTransferMethodRes,
                            authMode,
                            infoWithInvalidRefreshToken
                        );

                        assert.strictEqual(refreshRes.status, 401);
                        assert.deepStrictEqual(refreshRes.body, { message: "unauthorised" });
                        if (conf.output === "validateheader") {
                            assert.strictEqual(refreshRes.accessTokenFromHeader, "");
                            assert.strictEqual(refreshRes.refreshTokenFromHeader, "");
                        } else if (conf.output === "validatecookie") {
                            assert.strictEqual(refreshRes.accessToken, "");
                            assert.strictEqual(refreshRes.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                            assert.strictEqual(refreshRes.refreshToken, "");
                            assert.strictEqual(refreshRes.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                        }
                    });
                }
            });
        });
    });
});

async function createSession(app, authModeHeader, body) {
    return extractInfoFromResponse(
        await new Promise((resolve, reject) => {
            const req = request(app).post("/create");
            if (authModeHeader) {
                req.set("st-auth-mode", authModeHeader);
            }
            return req
                .send(body)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
        })
    );
}

async function refreshSession(app, authModeHeader, authMode, info) {
    return extractInfoFromResponse(
        await new Promise((resolve, reject) => {
            const req = request(app).post("/auth/session/refresh");
            if (authModeHeader) {
                req.set("st-auth-mode", authModeHeader);
            }

            const accessToken = info.accessToken || info.accessTokenFromHeader;
            const refreshToken = info.refreshToken || info.refreshTokenFromHeader;

            if (authMode === "both" || authMode === "cookie") {
                req.set("Cookie", ["sAccessToken=" + accessToken, "sRefreshToken=" + refreshToken]);
                if (info.antiCsrf) {
                    req.set("anti-csrf", info.antiCsrf);
                }
            }
            if (authMode === "both" || authMode === "header") {
                req.set("Authorization", `Bearer ${decodeURIComponent(refreshToken)}`);
            }
            return req.send().end((err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        })
    );
}

function testGet(app, info, url, expectedStatus, authMode, authModeHeader) {
    return new Promise((resolve, reject) => {
        const req = request(app).get(url);
        const accessToken = info.accessToken || info.accessTokenFromHeader;

        if (authModeHeader) {
            req.set("st-auth-mode", authModeHeader);
        }
        if (authMode === "cookie" || authMode === "both") {
            req.set("Cookie", ["sAccessToken=" + accessToken]);
            if (info.antiCsrf) {
                req.set("anti-csrf", info.antiCsrf);
            }
        }
        if (authMode === "header" || authMode === "both") {
            req.set("Authorization", `Bearer ${decodeURIComponent(accessToken)}`);
        }
        return req.expect(expectedStatus).end((err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
}

function getTestApp(endpoints) {
    const app = express();

    app.use(middleware());

    app.use(express.json());

    app.post("/create", async (req, res) => {
        const session = await Session.createNewSession(
            req,
            res,
            "public",
            SuperTokens.convertToRecipeUserId("testing-userId"),
            req.body,
            {}
        );
        res.status(200).json({ message: true, sessionHandle: session.getHandle() });
    });

    app.get("/update-payload", verifySession(), async (req, res) => {
        await req.session.mergeIntoAccessTokenPayload({ newValue: "test" });
        res.status(200).json({ message: true });
    });

    app.get("/verify", verifySession(), async (req, res) => {
        res.status(200).json({ message: true, sessionHandle: req.session.getHandle(), sessionExists: true });
    });

    app.get("/verify-optional", verifySession({ sessionRequired: false }), async (req, res) => {
        res.status(200).json({
            message: true,
            sessionHandle: req.session && req.session.getHandle(),
            sessionExists: !!req.session,
        });
    });

    if (endpoints !== undefined) {
        for (const { path, overrideGlobalClaimValidators } of endpoints) {
            app.get(path, verifySession({ overrideGlobalClaimValidators }), async (req, res) => {
                res.status(200).json({ message: req.session.getHandle() });
            });
        }
    }

    app.post("/logout", verifySession(), async (req, res) => {
        await req.session.revokeSession();
        res.status(200).json({ message: true });
    });

    app.use(errorHandler());
    return app;
}
