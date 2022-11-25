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

describe.only(`auth-modes: ${printPath("[test/auth-modes.test.js]")}`, function () {
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
                    await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI: "http://localhost:8080",
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

                    // We check that we will have access token at least as long as we have a refresh token
                    // so verify session can return TRY_REFRESH_TOKEN
                    assert(resp.accessTokenFromHeader.expiry >= resp.refreshTokenFromHeader.expiry);
                });

                it("should default to header based session w/ bad auth-mode header", async function () {
                    await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI: "http://localhost:8080",
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

                    // We check that we will have access token at least as long as we have a refresh token
                    // so verify session can return TRY_REFRESH_TOKEN
                    assert(resp.accessTokenFromHeader.expiry >= resp.refreshTokenFromHeader.expiry);
                });

                it("should use headers if auth-mode specifies it", async function () {
                    await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI: "http://localhost:8080",
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

                    // We check that we will have access token at least as long as we have a refresh token
                    // so verify session can return TRY_REFRESH_TOKEN
                    assert(resp.accessTokenFromHeader.expiry >= resp.refreshTokenFromHeader.expiry);
                });

                it("should use cookies if auth-mode specifies it", async function () {
                    await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI: "http://localhost:8080",
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
                it("should use headers if getTokenTransferMethod returns any", async function () {
                    await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI: "http://localhost:8080",
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
                    assert.strictEqual(resp.accessToken, undefined);
                    assert.strictEqual(resp.refreshToken, undefined);
                    assert.strictEqual(resp.antiCsrf, undefined);
                    assert.notStrictEqual(resp.accessTokenFromHeader, undefined);
                    assert.notStrictEqual(resp.refreshTokenFromHeader, undefined);

                    // We check that we will have access token at least as long as we have a refresh token
                    // so verify session can return TRY_REFRESH_TOKEN
                    assert(resp.accessTokenFromHeader.expiry >= resp.refreshTokenFromHeader.expiry);
                });

                it("should use headers if getTokenTransferMethod returns header", async function () {
                    await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI: "http://localhost:8080",
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

                    // We check that we will have access token at least as long as we have a refresh token
                    // so verify session can return TRY_REFRESH_TOKEN
                    assert(resp.accessTokenFromHeader.expiry >= resp.refreshTokenFromHeader.expiry);
                });

                it("should use cookies if getTokenTransferMethod returns cookie", async function () {
                    await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI: "http://localhost:8080",
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
            });
        });

        describe("verifySession", () => {
            describe("from behaviour table", () => {
                // prettier-ignore
                const behaviourTable = [
                    { getTokenTransferMethodRes: "any",    sessionRequired: false, authHeader: false,   authCookie: false,   output: "undefined" },
                    { getTokenTransferMethodRes: "header", sessionRequired: false, authHeader: false,   authCookie: false,   output: "undefined" },
                    { getTokenTransferMethodRes: "cookie", sessionRequired: false, authHeader: false,   authCookie: false,   output: "undefined" },
                    { getTokenTransferMethodRes: "cookie", sessionRequired: false, authHeader: true,    authCookie: false,   output: "undefined" },
                    { getTokenTransferMethodRes: "header", sessionRequired: false, authHeader: false,   authCookie: true,    output: "undefined" },
                    { getTokenTransferMethodRes: "any",    sessionRequired: true,  authHeader: false,   authCookie: false,   output: "UNAUTHORISED" },
                    { getTokenTransferMethodRes: "header", sessionRequired: true,  authHeader: false,   authCookie: false,   output: "UNAUTHORISED" },
                    { getTokenTransferMethodRes: "cookie", sessionRequired: true,  authHeader: false,   authCookie: false,   output: "UNAUTHORISED" },
                    { getTokenTransferMethodRes: "cookie", sessionRequired: true,  authHeader: true,    authCookie: false,   output: "UNAUTHORISED" },
                    { getTokenTransferMethodRes: "header", sessionRequired: true,  authHeader: false,   authCookie: true,    output: "UNAUTHORISED" },
                    { getTokenTransferMethodRes: "any",    sessionRequired: true,  authHeader: true,    authCookie: true,    output: "validateheader" },
                    { getTokenTransferMethodRes: "any",    sessionRequired: false, authHeader: true,    authCookie: true,    output: "validateheader" },
                    { getTokenTransferMethodRes: "header", sessionRequired: true,  authHeader: true,    authCookie: true,    output: "validateheader" },
                    { getTokenTransferMethodRes: "header", sessionRequired: false, authHeader: true,    authCookie: true,    output: "validateheader" },
                    { getTokenTransferMethodRes: "cookie", sessionRequired: true,  authHeader: true,    authCookie: true,    output: "validatecookie" },
                    { getTokenTransferMethodRes: "cookie", sessionRequired: false, authHeader: true,    authCookie: true,    output: "validatecookie" },
                    { getTokenTransferMethodRes: "any",    sessionRequired: true,  authHeader: true,    authCookie: false,   output: "validateheader" },
                    { getTokenTransferMethodRes: "any",    sessionRequired: false, authHeader: true,    authCookie: false,   output: "validateheader" },
                    { getTokenTransferMethodRes: "header", sessionRequired: true,  authHeader: true,    authCookie: false,   output: "validateheader" },
                    { getTokenTransferMethodRes: "header", sessionRequired: false, authHeader: true,    authCookie: false,   output: "validateheader" },
                    { getTokenTransferMethodRes: "any",    sessionRequired: true,  authHeader: false,   authCookie: true,    output: "validatecookie" },
                    { getTokenTransferMethodRes: "any",    sessionRequired: false, authHeader: false,   authCookie: true,    output: "validatecookie" },
                    { getTokenTransferMethodRes: "cookie", sessionRequired: true,  authHeader: false,   authCookie: true,    output: "validatecookie" },
                    { getTokenTransferMethodRes: "cookie", sessionRequired: false, authHeader: false,   authCookie: true,    output: "validatecookie" },
                ];

                for (let i = 0; i < behaviourTable.length; ++i) {
                    const conf = behaviourTable[i];
                    it(`should match line ${i + 1} with a valid token`, async () => {
                        await startST();
                        SuperTokens.init({
                            supertokens: {
                                connectionURI: "http://localhost:8080",
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
                        await setKeyValueInConfig("access_token_validity", 2);
                        await startST();
                        SuperTokens.init({
                            supertokens: {
                                connectionURI: "http://localhost:8080",
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
                    await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI: "http://localhost:8080",
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

                        req.set("Cookie", ["sAccessToken=" + createInfoCookie.accessTokenFromHeader.value]);
                        if (createInfoCookie.antiCsrf) {
                            req.set("anti-csrf", info.antiCsrf);
                        }
                        req.set(
                            "Authorization",
                            `Bearer ${decodeURIComponent(createInfoHeader.accessTokenFromHeader.value)}`
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
                    await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI: "http://localhost:8080",
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

                        req.set("Cookie", ["sAccessToken=" + createInfoCookie.accessTokenFromHeader.value]);
                        if (createInfoCookie.antiCsrf) {
                            req.set("anti-csrf", info.antiCsrf);
                        }
                        req.set(
                            "Authorization",
                            `Bearer ${decodeURIComponent(createInfoHeader.accessTokenFromHeader.value)}`
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
                    await startST();
                    SuperTokens.init({
                        supertokens: {
                            connectionURI: "http://localhost:8080",
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

                        req.set("Cookie", ["sAccessToken=" + createInfoCookie.accessTokenFromHeader.value]);
                        if (createInfoCookie.antiCsrf) {
                            req.set("anti-csrf", info.antiCsrf);
                        }
                        req.set(
                            "Authorization",
                            `Bearer ${decodeURIComponent(createInfoHeader.accessTokenFromHeader.value)}`
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
                await startST();
                SuperTokens.init({
                    supertokens: {
                        connectionURI: "http://localhost:8080",
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
        });

        describe("mergeIntoAccessTokenPayload", () => {
            it("should update cookies if the session was cookie based", async function () {
                await startST();
                SuperTokens.init({
                    supertokens: {
                        connectionURI: "http://localhost:8080",
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
                assert.notStrictEqual(updateInfo.accessToken, createInfo.accessTokenFromHeader.value);

                // Updated front token
                assert.notStrictEqual(updateInfo.frontToken, undefined);
                assert.notStrictEqual(updateInfo.frontToken, createInfo.frontToken);
            });

            it("should allow headers if the session was header based", async function () {
                await startST();
                SuperTokens.init({
                    supertokens: {
                        connectionURI: "http://localhost:8080",
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
                assert.notStrictEqual(updateInfo.accessTokenFromHeader.value, createInfo.accessToken);

                // Updated front token
                assert.notStrictEqual(updateInfo.frontToken, undefined);
                assert.notStrictEqual(updateInfo.frontToken, createInfo.frontToken);
            });
        });

        describe("refreshSession", () => {
            describe("from behaviour table", () => {
                // prettier-ignore
                const behaviourTable = [
                    { getTokenTransferMethodRes: "any",    authHeader: false, authCookie: false, output: "unauthorised",     setTokens: "none",    clearedTokens: "none" },
                    { getTokenTransferMethodRes: "header", authHeader: false, authCookie: false, output: "unauthorised",     setTokens: "none",    clearedTokens: "none" },
                    { getTokenTransferMethodRes: "cookie", authHeader: false, authCookie: false, output: "unauthorised",     setTokens: "none",    clearedTokens: "none" },
                    { getTokenTransferMethodRes: "any",    authHeader: false, authCookie: true,  output: "validatecookie",   setTokens: "cookies", clearedTokens: "none" },
                    { getTokenTransferMethodRes: "header", authHeader: false, authCookie: true,  output: "unauthorised",     setTokens: "none",    clearedTokens: "none" },
                    { getTokenTransferMethodRes: "cookie", authHeader: false, authCookie: true,  output: "validatecookie",   setTokens: "cookies", clearedTokens: "none" },
                    { getTokenTransferMethodRes: "any",    authHeader: true,  authCookie: false, output: "validateheader",   setTokens: "headers", clearedTokens: "none" },
                    { getTokenTransferMethodRes: "header", authHeader: true,  authCookie: false, output: "validateheader",   setTokens: "headers", clearedTokens: "none" },
                    { getTokenTransferMethodRes: "cookie", authHeader: true,  authCookie: false, output: "unauthorised",     setTokens: "none",    clearedTokens: "none" },
                    { getTokenTransferMethodRes: "any",    authHeader: true,  authCookie: true,  output: "validateheader",   setTokens: "headers", clearedTokens: "cookies" },
                    { getTokenTransferMethodRes: "header", authHeader: true,  authCookie: true,  output: "validateheader",   setTokens: "headers", clearedTokens: "cookies" },
                    { getTokenTransferMethodRes: "cookie", authHeader: true,  authCookie: true,  output: "validatecookie",   setTokens: "cookies", clearedTokens: "headers" },
                ];

                for (let i = 0; i < behaviourTable.length; ++i) {
                    const conf = behaviourTable[i];
                    it(`should match line ${i + 1} with a valid token`, async () => {
                        await startST();
                        SuperTokens.init({
                            supertokens: {
                                connectionURI: "http://localhost:8080",
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
                            assert.strictEqual(refreshRes.accessTokenFromHeader.expiry, 0);
                            assert.strictEqual(refreshRes.accessTokenFromHeader.value, "");
                            assert.strictEqual(refreshRes.refreshTokenFromHeader.expiry, 0);
                            assert.strictEqual(refreshRes.refreshTokenFromHeader.value, "");
                        } else if (conf.clearedTokens === "cookies") {
                            assert.strictEqual(refreshRes.accessToken, "");
                            assert.strictEqual(refreshRes.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                            assert.strictEqual(refreshRes.refreshToken, "");
                            assert.strictEqual(refreshRes.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                        }

                        switch (conf.setTokens) {
                            case "headers":
                                assert.ok(refreshRes.accessTokenFromHeader);
                                assert.notStrictEqual(refreshRes.accessTokenFromHeader.expiry, 0);
                                assert.notStrictEqual(refreshRes.accessTokenFromHeader.value, "");
                                assert.ok(refreshRes.refreshTokenFromHeader);
                                assert.notStrictEqual(refreshRes.refreshTokenFromHeader.expiry, 0);
                                assert.notStrictEqual(refreshRes.refreshTokenFromHeader.value, "");
                                break;
                            case "cookies":
                                assert.notStrictEqual(refreshRes.accessToken, "");
                                assert.notStrictEqual(refreshRes.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                                assert.notStrictEqual(refreshRes.refreshToken, "");
                                assert.notStrictEqual(refreshRes.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
                                break;
                            case "none":
                                if (conf.clearedTokens !== "cookies") {
                                    assert.strictEqual(refreshRes.accessToken, undefined);
                                    assert.strictEqual(refreshRes.accessTokenExpiry, undefined);
                                    assert.strictEqual(refreshRes.refreshToken, undefined);
                                    assert.strictEqual(refreshRes.refreshTokenExpiry, undefined);
                                }
                                if (conf.clearedTokens !== "header") {
                                    assert.strictEqual(refreshRes.accessTokenFromHeader, undefined);
                                    assert.strictEqual(refreshRes.refreshTokenFromHeader, undefined);
                                }
                                break;
                        }
                    });
                }

                for (let i = 0; i < behaviourTable.length; ++i) {
                    const conf = behaviourTable[i];

                    it(`should match line ${i + 1} with a invalid token`, async () => {
                        await startST();
                        SuperTokens.init({
                            supertokens: {
                                connectionURI: "http://localhost:8080",
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
                            assert.strictEqual(refreshRes.accessTokenFromHeader.expiry, 0);
                            assert.strictEqual(refreshRes.accessTokenFromHeader.value, "");
                            assert.strictEqual(refreshRes.refreshTokenFromHeader.expiry, 0);
                            assert.strictEqual(refreshRes.refreshTokenFromHeader.value, "");
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
            const req = request(app).post(body !== undefined ? "create-with-claim" : "/create");
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
            const refreshToken = info.refreshToken || info.refreshTokenFromHeader?.value;

            if (authMode === "both" || authMode === "cookie") {
                req.set("Cookie", ["sRefreshToken=" + refreshToken]);
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
        const accessToken = info.accessToken || info.accessTokenFromHeader?.value;

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
        const session = await Session.createNewSession(req, res, "testing-userId", req.body, {});
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
