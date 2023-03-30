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
        it("should create a V3 token", async function () {
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
            assert.strictEqual(parsedToken.version, 3);

            const parsedHeader = JSON.parse(Buffer.from(parsedToken.header, "base64").toString());
            assert.strictEqual(typeof parsedHeader.kid, "string");
            assert(parsedHeader.kid.startsWith("d-"));
        });

        it("should create a V3 token signed by a static key if set in session recipe config", async function () {
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
            assert.strictEqual(parsedToken.version, 3);

            const parsedHeader = JSON.parse(Buffer.from(parsedToken.header, "base64").toString());
            assert.strictEqual(typeof parsedHeader.kid, "string");
            assert(parsedHeader.kid.startsWith("s-"));
        });

        it("should throw an error when adding protected props", async function () {
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
                    .expect(400)
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
        });

        it("should make sign in/up return a 500 when adding protected props", async function () {
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
                    EmailPassword.init(),
                    Session.init({
                        override: {
                            functions: (oI) => ({
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
                }
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

            assert.strictEqual(parseJWTWithoutSignatureVerification(cookiesAfterRefresh.accessTokenFromAny).version, 3);

            const parsedTokenAfterRefresh = parseJWTWithoutSignatureVerification(
                cookiesAfterRefresh.accessTokenFromAny
            );
            assert.strictEqual(parsedTokenAfterRefresh.version, 3);
            assert.strictEqual(parsedTokenAfterRefresh.payload.sub, "test-user-id");
            assert.strictEqual(parsedTokenAfterRefresh.payload.appSub, "asdf");

            const parsedHeaderAfterRefresh = JSON.parse(
                Buffer.from(parsedTokenAfterRefresh.header, "base64").toString()
            );
            assert.strictEqual(typeof parsedHeaderAfterRefresh.kid, "string");
            assert(parsedHeaderAfterRefresh.kid.startsWith("d-"));
        });

        it("should help migrating a v2 token using protected props when called using session handle", async () => {
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
                }
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

            assert.strictEqual(parseJWTWithoutSignatureVerification(cookies.accessTokenFromAny).version, 3);

            const parsedToken = parseJWTWithoutSignatureVerification(cookies.accessTokenFromAny);
            assert.strictEqual(parsedToken.version, 3);
            assert.strictEqual(parsedToken.payload.sub, "test-user-id");
            assert.strictEqual(parsedToken.payload.appSub, "asdf");

            const parsedHeader = JSON.parse(Buffer.from(parsedToken.header, "base64").toString());
            assert.strictEqual(typeof parsedHeader.kid, "string");
            assert(parsedHeader.kid.startsWith("d-"));
        });
    });

    describe("verifySession", () => {
        it("should validate v2 tokens", async function () {
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
                }
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
                sessionExists: true,
                sessionHandle: legacySessionResp.session.handle,
            });
        });

        it("should validate v2 tokens with check database enabled", async function () {
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
                }
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
                sessionHandle: legacySessionResp.session.handle,
            });
        });

        it("should validate v3 tokens with check database enabled", async function () {
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
                    connectionURI: "http://localhost:8080",
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
                }
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

            assert.strictEqual(parseJWTWithoutSignatureVerification(cookies.accessTokenFromAny).version, 3);
        });

        it("should throw when refreshing legacy session with protected prop in payload", async function () {
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
                }
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
});

function getTestExpressApp() {
    const app = express();

    app.use(middleware());
    app.use(json());

    app.post("/create", async (req, res) => {
        try {
            await Session.createNewSession(req, res, "", req.body.payload, {});
            res.status(200).send("");
        } catch (ex) {
            res.status(400).json({ message: ex.message });
        }
    });

    app.get("/verify", verifySession(), async (req, res) => {
        res.status(200).json({ message: true, sessionHandle: req.session.getHandle(), sessionExists: true });
    });

    app.get("/verify-checkdb", verifySession({ checkDatabase: true }), async (req, res) => {
        res.status(200).json({ message: true, sessionHandle: req.session.getHandle(), sessionExists: true });
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
