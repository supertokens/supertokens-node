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
const { printPath, setupST, startST, killAllST, cleanST, extractInfoFromResponse, resetAll } = require("../utils");
const assert = require("assert");
const { Querier } = require("../../lib/build/querier");
const express = require("express");
const request = require("supertest");
const { ProcessState, PROCESS_STATE } = require("../../lib/build/processState");
const SuperTokens = require("../../");
const Session = require("../../recipe/session");
const EmailPassword = require("../../recipe/emailpassword");
const { parseJWTWithoutSignatureVerification } = require("../../lib/build/recipe/session/jwt");
const { middleware, errorHandler } = require("../../framework/express");
const { default: NormalisedURLPath } = require("../../lib/build/normalisedURLPath");
const { verifySession } = require("../../recipe/session/framework/express");
const { json } = require("body-parser");
const { validateAccessTokenStructure } = require("../../lib/build/recipe/session/accessToken");

describe(`AccessToken versions: ${printPath("[test/session/accessTokenVersions.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("createNewSession", () => {
        it("should create a V5 token", async function () {
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
                recipeList: [Session.init()],
            });

            const app = getTestExpressApp();

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            let cookies = extractInfoFromResponse(res);
            assert(cookies.accessTokenFromAny !== undefined);
            assert(cookies.refreshTokenFromAny !== undefined);
            assert(cookies.frontToken !== undefined);

            const parsedToken = parseJWTWithoutSignatureVerification(cookies.accessTokenFromAny);
            assert.strictEqual(parsedToken.version, 5);

            const parsedHeader = JSON.parse(Buffer.from(parsedToken.header, "base64").toString());
            assert.strictEqual(typeof parsedHeader.kid, "string");
            assert(parsedHeader.kid.startsWith("d-"));
        });

        it("should create a V5 token signed by a static key if set in session recipe config", async function () {
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
                        useDynamicAccessTokenSigningKey: false,
                    }),
                ],
            });

            const app = getTestExpressApp();

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            let cookies = extractInfoFromResponse(res);
            assert(cookies.accessTokenFromAny !== undefined);
            assert(cookies.refreshTokenFromAny !== undefined);
            assert(cookies.frontToken !== undefined);

            const parsedToken = parseJWTWithoutSignatureVerification(cookies.accessTokenFromAny);
            assert.strictEqual(parsedToken.version, 5);

            const parsedHeader = JSON.parse(Buffer.from(parsedToken.header, "base64").toString());
            assert.strictEqual(typeof parsedHeader.kid, "string");
            assert(parsedHeader.kid.startsWith("s-"));
        });

        it("should ignore protected props", async function () {
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
                recipeList: [Session.init()],
            });

            const app = getTestExpressApp();

            let res = await new Promise((res, rej) =>
                request(app)
                    .post("/create")
                    .type("application/json")
                    .send(
                        JSON.stringify({
                            payload: {
                                sub: "asdf",
                            },
                        })
                    )
                    .expect(200)
                    .end((err, resp) => {
                        if (err) {
                            rej(err);
                        } else {
                            res(resp);
                        }
                    })
            );

            let cookies = extractInfoFromResponse(res);
            assert.notEqual(cookies.accessTokenFromAny, undefined);
            assert.notEqual(cookies.refreshTokenFromAny, undefined);
            assert.notEqual(cookies.frontToken, undefined);

            const parsedToken = parseJWTWithoutSignatureVerification(cookies.accessTokenFromAny);
            assert.notEqual(parsedToken.payload.sub, "asdf");
        });

        it("should ignore protected props when creating from prev payload", async function () {
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
                recipeList: [Session.init()],
            });

            const app = getTestExpressApp();

            const testPropValue = Date.now();
            let res = await new Promise((res, rej) =>
                request(app)
                    .post("/create")
                    .type("application/json")
                    .send(
                        JSON.stringify({
                            payload: {
                                custom: testPropValue,
                            },
                            userId: "user1",
                        })
                    )
                    .expect(200)
                    .end((err, resp) => {
                        if (err) {
                            rej(err);
                        } else {
                            res(resp);
                        }
                    })
            );

            let cookies = extractInfoFromResponse(res);
            assert.notEqual(cookies.accessTokenFromAny, undefined);
            assert.notEqual(cookies.refreshTokenFromAny, undefined);
            assert.notEqual(cookies.frontToken, undefined);

            const parsedToken = parseJWTWithoutSignatureVerification(cookies.accessTokenFromAny);
            assert.equal(parsedToken.payload.sub, "user1");

            let res2 = await new Promise((res, rej) =>
                request(app)
                    .post("/create")
                    .type("application/json")
                    .send(
                        JSON.stringify({
                            payload: {
                                ...parsedToken.payload,
                            },
                            userId: "user2",
                        })
                    )
                    .expect(200)
                    .end((err, resp) => {
                        if (err) {
                            rej(err);
                        } else {
                            res(resp);
                        }
                    })
            );

            let cookies2 = extractInfoFromResponse(res2);
            assert.notEqual(cookies2.accessTokenFromAny, undefined);
            assert.notEqual(cookies2.refreshTokenFromAny, undefined);
            assert.notEqual(cookies2.frontToken, undefined);

            const parsedToken2 = parseJWTWithoutSignatureVerification(cookies2.accessTokenFromAny);
            assert.notEqual(parsedToken2.payload.sessionHandle, parsedToken.payload.sessionHandle);
            assert.equal(parsedToken2.payload.sub, "user2");
            assert.equal(parsedToken2.payload.custom, testPropValue);
        });

        it("should make sign in/up return a 500 when adding protected props", async function () {
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
                    EmailPassword.init(),
                    Session.init({
                        override: {
                            functions: (oI) => ({
                                ...oI,
                                createNewSession: (input) => {
                                    input.accessTokenPayload = {
                                        ...input.accessTokenPayload,
                                        sub: "asdf",
                                    };

                                    return oI.createNewSession(input);
                                },
                            }),
                        },
                    }),
                ],
            });

            const app = getTestExpressApp();

            let res = await new Promise((res, rej) =>
                request(app)
                    .post("/auth/signup")
                    .type("application/json")
                    .send(
                        JSON.stringify({
                            formFields: [
                                { id: "email", value: `test-${Date.now()}@supertokens.com` },
                                { id: "password", value: "Asdf12.." },
                            ],
                        })
                    )
                    .expect(500)
                    .end((err, resp) => {
                        if (err) {
                            rej(err);
                        } else {
                            res(resp);
                        }
                    })
            );

            let cookies = extractInfoFromResponse(res);
            assert.strictEqual(cookies.accessTokenFromAny, undefined);
            assert.strictEqual(cookies.refreshTokenFromAny, undefined);
            assert.strictEqual(cookies.frontToken, undefined);

            assert(res.text.includes("The user payload contains protected field"));
        });
    });

    describe("mergeIntoAccessTokenPayload", () => {
        it("should help migrating a v2 token using protected props", async () => {
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
                recipeList: [Session.init()],
            });

            // This CDI version is no longer supported by this SDK, but we want to ensure that sessions keep working after the upgrade
            // We can hard-code the structure of the request&response, since this is a fixed CDI version and it's not going to change
            Querier.apiVersion = "2.18";
            const legacySessionResp = await Querier.getNewInstanceOrThrowError().sendPostRequest(
                new NormalisedURLPath("/recipe/session"),
                {
                    userId: "test-user-id",
                    enableAntiCsrf: false,
                    userDataInJWT: {
                        sub: "asdf",
                    },
                    userDataInDatabase: {},
                },
                {}
            );
            Querier.apiVersion = undefined;

            const legacyAccessToken = legacySessionResp.accessToken.token;
            const legacyRefreshToken = legacySessionResp.refreshToken.token;

            const app = getTestExpressApp();
            let mergeRes = await new Promise((res, rej) =>
                request(app)
                    .post("/merge-into-payload")
                    .set("Authorization", `Bearer ${legacyAccessToken}`)
                    .type("application/json")
                    .send(
                        JSON.stringify({
                            payload: {
                                sub: null,
                                appSub: "asdf",
                            },
                        })
                    )
                    .expect(200)
                    .end((err, resp) => {
                        if (err) {
                            rej(err);
                        } else {
                            res(resp);
                        }
                    })
            );

            let mergeCookies = extractInfoFromResponse(mergeRes);
            assert(mergeCookies.accessTokenFromAny !== undefined);
            assert(mergeCookies.refreshTokenFromAny === undefined);
            assert(mergeCookies.frontToken !== undefined);

            const parsedTokenAfterMerge = parseJWTWithoutSignatureVerification(mergeCookies.accessTokenFromAny);
            assert.strictEqual(parsedTokenAfterMerge.version, 2);

            let res = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Authorization", `Bearer ${legacyRefreshToken}`)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            let cookiesAfterRefresh = extractInfoFromResponse(res);
            assert(cookiesAfterRefresh.accessTokenFromAny !== undefined);
            assert(cookiesAfterRefresh.refreshTokenFromAny !== undefined);
            assert(cookiesAfterRefresh.frontToken !== undefined);

            assert.strictEqual(parseJWTWithoutSignatureVerification(cookiesAfterRefresh.accessTokenFromAny).version, 5);

            const parsedTokenAfterRefresh = parseJWTWithoutSignatureVerification(
                cookiesAfterRefresh.accessTokenFromAny
            );
            assert.strictEqual(parsedTokenAfterRefresh.version, 5);
            assert.strictEqual(parsedTokenAfterRefresh.payload.sub, "test-user-id");
            assert.strictEqual(parsedTokenAfterRefresh.payload.appSub, "asdf");

            const parsedHeaderAfterRefresh = JSON.parse(
                Buffer.from(parsedTokenAfterRefresh.header, "base64").toString()
            );
            assert.strictEqual(typeof parsedHeaderAfterRefresh.kid, "string");
            assert(parsedHeaderAfterRefresh.kid.startsWith("d-"));
        });

        it("should help migrating a v2 token using protected props when called using session handle", async () => {
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
                recipeList: [Session.init()],
            });

            // This CDI version is no longer supported by this SDK, but we want to ensure that sessions keep working after the upgrade
            // We can hard-code the structure of the request&response, since this is a fixed CDI version and it's not going to change
            Querier.apiVersion = "2.18";
            const legacySessionResp = await Querier.getNewInstanceOrThrowError().sendPostRequest(
                new NormalisedURLPath("/recipe/session"),
                {
                    userId: "test-user-id",
                    enableAntiCsrf: false,
                    userDataInJWT: {
                        sub: "asdf",
                    },
                    userDataInDatabase: {},
                },
                {}
            );
            Querier.apiVersion = undefined;

            const legacyRefreshToken = legacySessionResp.refreshToken.token;

            const app = getTestExpressApp();

            await Session.mergeIntoAccessTokenPayload(legacySessionResp.session.handle, { sub: null, appSub: "asdf" });
            let res = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Authorization", `Bearer ${legacyRefreshToken}`)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            let cookies = extractInfoFromResponse(res);
            assert(cookies.accessTokenFromAny !== undefined);
            assert(cookies.refreshTokenFromAny !== undefined);
            assert(cookies.frontToken !== undefined);

            assert.strictEqual(parseJWTWithoutSignatureVerification(cookies.accessTokenFromAny).version, 5);

            const parsedToken = parseJWTWithoutSignatureVerification(cookies.accessTokenFromAny);
            assert.strictEqual(parsedToken.version, 5);
            assert.strictEqual(parsedToken.payload.sub, "test-user-id");
            assert.strictEqual(parsedToken.payload.appSub, "asdf");

            const parsedHeader = JSON.parse(Buffer.from(parsedToken.header, "base64").toString());
            assert.strictEqual(typeof parsedHeader.kid, "string");
            assert(parsedHeader.kid.startsWith("d-"));
        });
    });

    describe("verifySession", () => {
        it("should validate v2 tokens", async function () {
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
                recipeList: [Session.init()],
            });

            // This CDI version is no longer supported by this SDK, but we want to ensure that sessions keep working after the upgrade
            // We can hard-code the structure of the request&response, since this is a fixed CDI version and it's not going to change
            Querier.apiVersion = "2.18";
            const legacySessionResp = await Querier.getNewInstanceOrThrowError().sendPostRequest(
                new NormalisedURLPath("/recipe/session"),
                {
                    userId: "test-user-id",
                    enableAntiCsrf: false,
                    userDataInJWT: {},
                    userDataInDatabase: {},
                },
                {}
            );
            Querier.apiVersion = undefined;

            const legacyToken = legacySessionResp.accessToken.token;

            const app = getTestExpressApp();

            let res = await new Promise((resolve, reject) =>
                request(app)
                    .get("/verify")
                    .set("Authorization", `Bearer ${legacyToken}`)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.notEqual(
                await ProcessState.getInstance().waitForEvent(PROCESS_STATE.MULTI_JWKS_VALIDATION, 1500),
                undefined
            );

            assert.deepStrictEqual(res.body, {
                message: true,
                payload: {},
                sessionExists: true,
                sessionHandle: legacySessionResp.session.handle,
            });
        });

        it("should validate v2 tokens with check database enabled", async function () {
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
                recipeList: [Session.init()],
            });

            // This CDI version is no longer supported by this SDK, but we want to ensure that sessions keep working after the upgrade
            // We can hard-code the structure of the request&response, since this is a fixed CDI version and it's not going to change
            Querier.apiVersion = "2.18";
            const legacySessionResp = await Querier.getNewInstanceOrThrowError().sendPostRequest(
                new NormalisedURLPath("/recipe/session"),
                {
                    userId: "test-user-id",
                    enableAntiCsrf: false,
                    userDataInJWT: {},
                    userDataInDatabase: {},
                },
                {}
            );
            Querier.apiVersion = undefined;

            const legacyToken = legacySessionResp.accessToken.token;

            const app = getTestExpressApp();

            await new Promise((resolve, reject) =>
                request(app)
                    .get("/revoke-session")
                    .set("Authorization", `Bearer ${legacyToken}`)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            let resDBCheck = await new Promise((resolve, reject) =>
                request(app)
                    .get("/verify-checkdb")
                    .set("Authorization", `Bearer ${legacyToken}`)
                    .expect(401)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert.deepStrictEqual(resDBCheck.body, { message: "unauthorised" });

            let resNoDBCheck = await new Promise((resolve, reject) =>
                request(app)
                    .get("/verify")
                    .set("Authorization", `Bearer ${legacyToken}`)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.notEqual(
                await ProcessState.getInstance().waitForEvent(PROCESS_STATE.MULTI_JWKS_VALIDATION, 1500),
                undefined
            );

            assert.deepStrictEqual(resNoDBCheck.body, {
                message: true,
                sessionExists: true,
                payload: {},
                sessionHandle: legacySessionResp.session.handle,
            });
        });

        it("should validate v4 tokens", async function () {
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
                recipeList: [Session.init()],
            });

            // This CDI version is no longer supported by this SDK, but we want to ensure that sessions keep working after the upgrade
            // We can hard-code the structure of the request&response, since this is a fixed CDI version and it's not going to change
            Querier.apiVersion = "3.0";
            const legacySessionResp = await Querier.getNewInstanceOrThrowError().sendPostRequest(
                new NormalisedURLPath("/recipe/session"),
                {
                    userId: "test-user-id",
                    enableAntiCsrf: false,
                    userDataInJWT: {},
                    userDataInDatabase: {},
                },
                {}
            );
            Querier.apiVersion = undefined;

            const legacyToken = legacySessionResp.accessToken.token;

            const app = getTestExpressApp();

            let res = await new Promise((resolve, reject) =>
                request(app)
                    .get("/verify")
                    .set("Authorization", `Bearer ${legacyToken}`)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert.deepStrictEqual(
                new Set(Object.keys(res.body.payload)),
                new Set([
                    "antiCsrfToken",
                    "exp",
                    "iat",
                    "parentRefreshTokenHash1",
                    "refreshTokenHash1",
                    "sessionHandle",
                    "sub",
                    "tId",
                ])
            );
            delete res.body.payload;
            assert.deepStrictEqual(res.body, {
                message: true,
                sessionExists: true,
                sessionHandle: legacySessionResp.session.handle,
            });
        });

        it("should validate v4 tokens with check database enabled", async function () {
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
                recipeList: [Session.init()],
            });

            // This CDI version is no longer supported by this SDK, but we want to ensure that sessions keep working after the upgrade
            // We can hard-code the structure of the request&response, since this is a fixed CDI version and it's not going to change
            Querier.apiVersion = "3.0";
            const legacySessionResp = await Querier.getNewInstanceOrThrowError().sendPostRequest(
                new NormalisedURLPath("/recipe/session"),
                {
                    userId: "test-user-id",
                    enableAntiCsrf: false,
                    userDataInJWT: {},
                    userDataInDatabase: {},
                },
                {}
            );
            Querier.apiVersion = undefined;

            const legacyToken = legacySessionResp.accessToken.token;

            const app = getTestExpressApp();

            await new Promise((resolve, reject) =>
                request(app)
                    .get("/revoke-session")
                    .set("Authorization", `Bearer ${legacyToken}`)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            let resDBCheck = await new Promise((resolve, reject) =>
                request(app)
                    .get("/verify-checkdb")
                    .set("Authorization", `Bearer ${legacyToken}`)
                    .expect(401)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert.deepStrictEqual(resDBCheck.body, { message: "unauthorised" });

            let resNoDBCheck = await new Promise((resolve, reject) =>
                request(app)
                    .get("/verify")
                    .set("Authorization", `Bearer ${legacyToken}`)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert.deepStrictEqual(
                new Set(Object.keys(resNoDBCheck.body.payload)),
                new Set([
                    "antiCsrfToken",
                    "exp",
                    "iat",
                    "parentRefreshTokenHash1",
                    "refreshTokenHash1",
                    "sessionHandle",
                    "sub",
                    "tId",
                ])
            );
            delete resNoDBCheck.body.payload;

            assert.deepStrictEqual(resNoDBCheck.body, {
                message: true,
                sessionExists: true,
                sessionHandle: legacySessionResp.session.handle,
            });
        });

        it("should validate v5 tokens with check database enabled", async function () {
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
                recipeList: [Session.init()],
            });

            const app = getTestExpressApp();

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            let cookies = extractInfoFromResponse(res);

            assert(cookies.accessTokenFromAny !== undefined);
            assert(cookies.refreshTokenFromAny !== undefined);
            assert(cookies.frontToken !== undefined);

            await new Promise((resolve, reject) =>
                request(app)
                    .get("/revoke-session")
                    .set("Authorization", `Bearer ${cookies.accessTokenFromAny}`)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            let resDBCheck = await new Promise((resolve, reject) =>
                request(app)
                    .get("/verify-checkdb")
                    .set("Authorization", `Bearer ${cookies.accessTokenFromAny}`)
                    .expect(401)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert.deepStrictEqual(resDBCheck.body, { message: "unauthorised" });

            let resNoDBCheck = await new Promise((resolve, reject) =>
                request(app)
                    .get("/verify")
                    .set("Authorization", `Bearer ${cookies.accessTokenFromAny}`)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert.notDeepStrictEqual(resNoDBCheck.body, { message: "unauthorised" });
        });

        it("should not validate token signed by a static key if not set in session recipe config", async function () {
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
                        useDynamicAccessTokenSigningKey: false,
                    }),
                ],
            });

            const app = getTestExpressApp();

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/create")
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            let cookies = extractInfoFromResponse(res);
            assert(cookies.accessTokenFromAny !== undefined);
            assert(cookies.refreshTokenFromAny !== undefined);
            assert(cookies.frontToken !== undefined);

            resetAll();
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
                        useDynamicAccessTokenSigningKey: true,
                    }),
                ],
            });

            const resDBCheck = await new Promise((resolve, reject) =>
                request(app)
                    .get("/verify")
                    .set("Authorization", `Bearer ${cookies.accessTokenFromAny}`)
                    .expect(401)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert.deepStrictEqual(resDBCheck.body, { message: "try refresh token" });
        });
    });

    describe("refresh session", () => {
        it("should refresh legacy sessions to new version", async function () {
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
                recipeList: [Session.init()],
            });

            // This CDI version is no longer supported by this SDK, but we want to ensure that sessions keep working after the upgrade
            // We can hard-code the structure of the request&response, since this is a fixed CDI version and it's not going to change
            Querier.apiVersion = "2.18";
            const legacySessionResp = await Querier.getNewInstanceOrThrowError().sendPostRequest(
                new NormalisedURLPath("/recipe/session"),
                {
                    userId: "test-user-id",
                    enableAntiCsrf: false,
                    userDataInJWT: {},
                    userDataInDatabase: {},
                },
                {}
            );
            Querier.apiVersion = undefined;

            const legacyRefreshToken = legacySessionResp.refreshToken.token;

            const app = getTestExpressApp();

            let res = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Authorization", `Bearer ${legacyRefreshToken}`)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            let cookies = extractInfoFromResponse(res);
            assert(cookies.accessTokenFromAny !== undefined);
            assert(cookies.refreshTokenFromAny !== undefined);
            assert(cookies.frontToken !== undefined);

            assert.strictEqual(parseJWTWithoutSignatureVerification(cookies.accessTokenFromAny).version, 5);
        });

        it("should throw when refreshing legacy session with protected prop in payload", async function () {
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
                recipeList: [Session.init()],
            });

            // This CDI version is no longer supported by this SDK, but we want to ensure that sessions keep working after the upgrade
            // We can hard-code the structure of the request&response, since this is a fixed CDI version and it's not going to change
            Querier.apiVersion = "2.18";
            const legacySessionResp = await Querier.getNewInstanceOrThrowError().sendPostRequest(
                new NormalisedURLPath("/recipe/session"),
                {
                    userId: "test-user-id",
                    enableAntiCsrf: false,
                    userDataInJWT: {
                        sub: "asdf",
                    },
                    userDataInDatabase: {},
                },
                {}
            );
            Querier.apiVersion = undefined;

            const legacyRefreshToken = legacySessionResp.refreshToken.token;

            const app = getTestExpressApp();

            let res = await new Promise((resolve, reject) =>
                request(app)
                    .post("/auth/session/refresh")
                    .set("Authorization", `Bearer ${legacyRefreshToken}`)
                    .expect(401)
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            let cookies = extractInfoFromResponse(res);
            assert.strictEqual(cookies.accessTokenFromAny, "");
            assert.strictEqual(cookies.refreshTokenFromAny, "");
            assert.strictEqual(cookies.frontToken, "remove");
        });
    });

    describe("validateAccessTokenStructure", () => {
        /**
            We want to make sure that for access token claims that can be null, the SDK does not fail access token validation if the
            core does not send them as part of the payload.
            For this we verify that validation passes when the keys are nil, empty or a different type
            For now this test checks for:
            - antiCsrfToken
            - parentRefreshTokenHash1
            But this test should be updated to include any keys that the core considers optional in the payload (i.e either it sends
            JSON null or skips them entirely)
        */
        it("should accept skipped nullable props (v3)", () => {
            validateAccessTokenStructure(
                {
                    sessionHandle: "",
                    sub: "",
                    refreshTokenHash1: "",
                    exp: 0,
                    iat: 0,
                },
                3
            );

            validateAccessTokenStructure(
                {
                    sessionHandle: "",
                    sub: "",
                    refreshTokenHash1: "",
                    exp: 0,
                    iat: 0,
                    parentRefreshTokenHash1: "",
                    antiCsrfToken: "",
                },
                3
            );

            validateAccessTokenStructure(
                {
                    sessionHandle: "",
                    sub: "",
                    refreshTokenHash1: "",
                    exp: 0,
                    iat: 0,
                    parentRefreshTokenHash1: 1,
                    antiCsrfToken: 1,
                },
                3
            );
        });
    });
});

function getTestExpressApp() {
    const app = express();

    app.use(middleware());
    app.use(json());

    app.post("/create", async (req, res) => {
        const userId = req.body.userId || "";
        try {
            await Session.createNewSession(
                req,
                res,
                "public",
                SuperTokens.convertToRecipeUserId(userId),
                req.body.payload,
                {}
            );
            res.status(200).send("");
        } catch (ex) {
            res.status(400).json({ message: ex.message });
        }
    });

    app.get("/verify", verifySession(), async (req, res) => {
        res.status(200).json({
            message: true,
            sessionHandle: req.session.getHandle(),
            sessionExists: true,
            payload: req.session.getAccessTokenPayload(),
        });
    });

    app.get("/verify-checkdb", verifySession({ checkDatabase: true }), async (req, res) => {
        res.status(200).json({
            message: true,
            sessionHandle: req.session.getHandle(),
            sessionExists: true,
            payload: req.session.getAccessTokenPayload(),
        });
    });

    app.get("/verify-optional", verifySession({ sessionRequired: false }), async (req, res) => {
        res.status(200).json({
            message: true,
            sessionHandle: req.session && req.session.getHandle(),
            sessionExists: !!req.session,
        });
    });

    app.post("/merge-into-payload", verifySession(), async (req, res) => {
        await req.session.mergeIntoAccessTokenPayload(req.body.payload);
        res.status(200).json({
            message: true,
            sessionHandle: req.session && req.session.getHandle(),
            sessionExists: !!req.session,
            newPayload: await req.session.getAccessTokenPayload(),
        });
    });

    app.get("/revoke-session", verifySession(), async (req, res) => {
        res.status(200).json({ message: await req.session.revokeSession(), sessionHandle: req.session.getHandle() });
    });

    app.use(errorHandler());
    return app;
}
