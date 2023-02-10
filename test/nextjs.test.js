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

const { printPath, setupST, startST, killAllST, cleanST } = require("./utils");
let assert = require("assert");
const httpMocks = require("node-mocks-http");
let { ProcessState } = require("../lib/build/processState");
let SuperTokens = require("../lib/build/").default;
let { middleware } = require("../framework/express");
const Session = require("../lib/build/recipe/session");
const EmailPassword = require("../lib/build/recipe/emailpassword");
const ThirdPartyEmailPassword = require("../lib/build/recipe/thirdpartyemailpassword");
const superTokensMiddleware = require("../lib/build/nextjs").superTokensMiddleware;
const superTokensNextWrapper = require("../lib/build/nextjs").superTokensNextWrapper;
let { verifySession } = require("../recipe/session/framework/express");

describe(`NextJS Middleware Test: ${printPath("[test/nextjs.test.js]")}`, function () {
    describe("with superTokensNextWrapper", function () {
        before(async function () {
            process.env.user = undefined;
            await killAllST();
            await setupST();
            await startST();
            ProcessState.getInstance().reset();
            SuperTokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    apiBasePath: "/api/auth",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailPassword.init(),
                    Session.init({
                        override: {
                            functions: (oI) => {
                                return {
                                    ...oI,
                                    createNewSession: async (input) => {
                                        let response = await oI.createNewSession(input);
                                        process.env.user = response.getUserId();
                                        return response;
                                    },
                                };
                            },
                        },
                    }),
                ],
            });
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        it("Sign Up", function (done) {
            const request = httpMocks.createRequest({
                method: "POST",
                headers: {
                    rid: "emailpassword",
                },
                url: "/api/auth/signup/",
                body: {
                    formFields: [
                        {
                            id: "email",
                            value: "john.doe@supertokens.io",
                        },
                        {
                            id: "password",
                            value: "P@sSW0rd",
                        },
                    ],
                },
            });

            const response = httpMocks.createResponse({
                eventEmitter: require("events").EventEmitter,
            });

            response.on("end", () => {
                assert.deepStrictEqual(response._getJSONData().status, "OK");
                assert.deepStrictEqual(response._getJSONData().user.email, "john.doe@supertokens.io");
                assert.strictEqual(response._getJSONData().user.id, process.env.user);
                assert(response._getHeaders()["front-token"] !== undefined);
                assert(response._getHeaders()["set-cookie"][0].startsWith("sAccessToken="));
                assert(response._getHeaders()["set-cookie"][1].startsWith("sRefreshToken="));
                return done();
            });

            superTokensNextWrapper(
                async (next) => {
                    return middleware()(request, response, next);
                },
                request,
                response
            );
        });

        it("Sign In", function (done) {
            const loginRequest = httpMocks.createRequest({
                method: "POST",
                headers: {
                    rid: "emailpassword",
                },
                url: "/api/auth/signin/",
                body: {
                    formFields: [
                        {
                            id: "email",
                            value: "john.doe@supertokens.io",
                        },
                        {
                            id: "password",
                            value: "P@sSW0rd",
                        },
                    ],
                },
            });

            const loginResponse = httpMocks.createResponse({
                eventEmitter: require("events").EventEmitter,
            });

            loginResponse.on("end", async () => {
                assert.deepStrictEqual(loginResponse._getJSONData().status, "OK");
                assert.deepStrictEqual(loginResponse._getJSONData().user.email, "john.doe@supertokens.io");
                assert(loginResponse._getHeaders()["front-token"] !== undefined);
                assert(loginResponse._getHeaders()["set-cookie"][0].startsWith("sAccessToken=") !== undefined);
                assert(loginResponse._getHeaders()["set-cookie"][1].startsWith("sRefreshToken=") !== undefined);

                // Verify if session exists next middleware tests:

                // Case 1: Successful => add session to request object.
                const getUserRequestWithSession = httpMocks.createRequest({
                    method: "GET",
                    cookies: getSessionCookiesFromResponse(loginResponse),
                    url: "/api/user/",
                });
                const getUserResponseWithSession = httpMocks.createResponse({});

                await superTokensNextWrapper(
                    (next) => {
                        return verifySession()(getUserRequestWithSession, getUserResponseWithSession, next);
                    },
                    getUserRequestWithSession,
                    getUserResponseWithSession
                );

                assert(getUserRequestWithSession.session !== undefined);

                // Case 2: Unauthenticated => return 401.
                const getUserRequestWithoutSession = httpMocks.createRequest({
                    method: "GET",
                    url: "/api/user/",
                });

                const getUserResponseWithoutSession = httpMocks.createResponse({
                    eventEmitter: require("events").EventEmitter,
                });

                getUserResponseWithoutSession.on("end", () => {
                    assert.strictEqual(getUserResponseWithoutSession.statusCode, 401);
                    return done();
                });

                superTokensNextWrapper(
                    (next) => {
                        return verifySession()(getUserRequestWithoutSession, getUserResponseWithoutSession, next);
                    },
                    getUserRequestWithoutSession,
                    getUserResponseWithoutSession
                );
            });

            superTokensNextWrapper(
                async (next) => {
                    return middleware()(loginRequest, loginResponse, next);
                },
                loginRequest,
                loginResponse
            );
        });

        it("Reset Password - Send Email", function (done) {
            const request = httpMocks.createRequest({
                method: "POST",
                headers: {
                    rid: "emailpassword",
                },
                url: "/api/auth/user/password/reset/token",
                body: {
                    formFields: [
                        {
                            id: "email",
                            value: "john.doe@supertokens.io",
                        },
                    ],
                },
            });

            const response = httpMocks.createResponse({
                eventEmitter: require("events").EventEmitter,
            });

            response.on("end", () => {
                assert.deepStrictEqual(response._getJSONData().status, "OK");
                return done();
            });

            superTokensNextWrapper(
                async (next) => {
                    return middleware()(request, response, next);
                },
                request,
                response
            );
        });

        it("Reset Password - Create new password", function (done) {
            const request = httpMocks.createRequest({
                method: "POST",
                headers: {
                    rid: "emailpassword",
                },
                url: "/api/auth/user/password/reset/",
                body: {
                    formFields: [
                        {
                            id: "password",
                            value: "NewP@sSW0rd",
                        },
                    ],
                    token: "RandomToken",
                },
            });

            const response = httpMocks.createResponse({
                eventEmitter: require("events").EventEmitter,
            });

            response.on("end", () => {
                assert.deepStrictEqual(response._getJSONData().status, "RESET_PASSWORD_INVALID_TOKEN_ERROR");
                return done();
            });

            superTokensNextWrapper(
                async (next) => {
                    return middleware()(request, response, next);
                },
                request,
                response
            );
        });

        it("does Email Exist with existing email", function (done) {
            const request = httpMocks.createRequest({
                method: "GET",
                headers: {
                    rid: "emailpassword",
                },
                url: "/api/auth/signup/email/exists",
                query: {
                    email: "john.doe@supertokens.io",
                },
            });

            const response = httpMocks.createResponse({
                eventEmitter: require("events").EventEmitter,
            });

            response.on("end", () => {
                assert.deepStrictEqual(response._getJSONData(), { status: "OK", exists: true });
                return done();
            });

            superTokensNextWrapper(
                async (next) => {
                    return middleware()(request, response, next);
                },
                request,
                response
            );
        });

        it("does Email Exist with unknown email", function (done) {
            const request = httpMocks.createRequest({
                method: "GET",
                headers: {
                    rid: "emailpassword",
                },
                url: "/api/auth/signup/email/exists",
                query: {
                    email: "unknown@supertokens.io",
                },
            });

            const response = httpMocks.createResponse({
                eventEmitter: require("events").EventEmitter,
            });

            response.on("end", () => {
                assert.deepStrictEqual(response._getJSONData().exists, false);
                return done();
            });

            superTokensNextWrapper(
                async (next) => {
                    return middleware()(request, response, next);
                },
                request,
                response
            );
        });

        it("Verify session successfully when session is present", function (done) {
            const request = httpMocks.createRequest({
                method: "GET",
                url: "/api/auth/user/info",
            });

            const response = httpMocks.createResponse({
                eventEmitter: require("events").EventEmitter,
            });

            response.on("end", () => {
                assert.deepStrictEqual(response._getStatusCode(), 401);
                return done();
            });

            superTokensNextWrapper(
                async (next) => {
                    return await verifySession()(request, response, next);
                },
                request,
                response
            );
        });

        it("Verify session successfully when session is present (check if it continues after)", function (done) {
            const request = httpMocks.createRequest({
                method: "GET",
                url: "/api/auth/user/info",
            });

            const response = httpMocks.createResponse({
                eventEmitter: require("events").EventEmitter,
            });

            response.on("end", () => {
                try {
                    assert.deepStrictEqual(response._getStatusCode(), 401);
                    return done();
                } catch (err) {
                    return done(err);
                }
            });

            superTokensNextWrapper(
                async (next) => {
                    return await verifySession()(request, response, next);
                },
                request,
                response
            ).then(() => {
                return done(new Error("not come here"));
            });
        });

        it("Create new session", async function () {
            const request = httpMocks.createRequest({
                method: "GET",
                url: "/anything",
            });

            const response = httpMocks.createResponse({
                eventEmitter: require("events").EventEmitter,
            });

            const session = await superTokensNextWrapper(
                async () => {
                    return await Session.createNewSession(response, "1", {}, {});
                },
                request,
                response
            );
            assert.notDeepStrictEqual(session, undefined);
            assert.deepStrictEqual(session.userId, "1");
        });
    });

    describe("with superTokensNextWrapper (__supertokensFromNextJS flag test)", function () {
        before(async function () {
            process.env.user = undefined;
            await killAllST();
            await setupST();
            await startST();
            ProcessState.getInstance().reset();
            SuperTokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    apiBasePath: "/api/auth",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailPassword.init({
                        override: {
                            apis: (oI) => {
                                return {
                                    ...oI,
                                    passwordResetPOST: async (input) => {
                                        return {
                                            status: "CUSTOM_RESPONSE",
                                            nextJS: input.options.req.original.__supertokensFromNextJS,
                                        };
                                    },
                                };
                            },
                        },
                    }),
                    ThirdPartyEmailPassword.init({
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "google",
                                    clients: [
                                        {
                                            clientID: "",
                                            clientSecret: "",
                                        },
                                    ],
                                },
                            },
                        ],
                    }),
                    Session.init({
                        override: {
                            functions: (oI) => {
                                return {
                                    ...oI,
                                    createNewSession: async (input) => {
                                        let response = await oI.createNewSession(input);
                                        process.env.user = response.getUserId();
                                        return response;
                                    },
                                };
                            },
                        },
                    }),
                ],
            });
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        it("testing __supertokensFromNextJS flag", function (done) {
            const request = httpMocks.createRequest({
                method: "POST",
                headers: {
                    rid: "emailpassword",
                },
                url: "/api/auth/user/password/reset",
                body: {
                    token: "hello",
                    formFields: [
                        {
                            id: "password",
                            value: "NewP@sSW0rd",
                        },
                    ],
                },
            });

            const response = httpMocks.createResponse({
                eventEmitter: require("events").EventEmitter,
            });

            response.on("end", () => {
                assert.deepStrictEqual(response._getJSONData().status, "CUSTOM_RESPONSE");
                assert.deepStrictEqual(response._getJSONData().nextJS, true);
                return done();
            });

            superTokensNextWrapper(
                async (next) => {
                    return middleware()(request, response, next);
                },
                request,
                response
            );
        });

        it("testing __supertokensFromNextJS flag, apple redirect", function (done) {
            const request = httpMocks.createRequest({
                method: "POST",
                headers: {
                    rid: "thirdpartyemailpassword",
                    "content-type": "application/x-www-form-urlencoded",
                },
                url: "/api/auth/callback/apple",
                body: {
                    state: "eyJyZWRpcmVjdFVSSSI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9yZWRpcmVjdCJ9",
                    code: "testing",
                },
            });

            const response = httpMocks.createResponse({
                eventEmitter: require("events").EventEmitter,
            });

            response.on("end", () => {
                assert.deepStrictEqual(Buffer.from(response._getData()).toString(), "");
                assert.deepStrictEqual(response._getStatusCode(), 303);
                assert.deepStrictEqual(
                    response._getHeaders().location,
                    "http://localhost:3000/redirect?state=eyJyZWRpcmVjdFVSSSI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9yZWRpcmVjdCJ9&code=testing"
                );
                return done();
            });

            superTokensNextWrapper(
                async (next) => {
                    return middleware()(request, response, next);
                },
                request,
                response
            );
        });
    });

    describe("with superTokensNextWrapper, overriding throws error", function () {
        before(async function () {
            process.env.user = undefined;
            await killAllST();
            await setupST();
            await startST();
            ProcessState.getInstance().reset();
            SuperTokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    apiBasePath: "/api/auth",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailPassword.init(),
                    Session.init({
                        override: {
                            functions: (oI) => {
                                return {
                                    ...oI,
                                    createNewSession: async (input) => {
                                        let response = await oI.createNewSession(input);
                                        process.env.user = response.getUserId();
                                        throw {
                                            error: "sign up error",
                                        };
                                    },
                                };
                            },
                        },
                    }),
                ],
            });
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        it("Sign Up", async function () {
            const request = httpMocks.createRequest({
                method: "POST",
                headers: {
                    rid: "emailpassword",
                },
                url: "/api/auth/signup/",
                body: {
                    formFields: [
                        {
                            id: "email",
                            value: "john.doe@supertokens.io",
                        },
                        {
                            id: "password",
                            value: "P@sSW0rd",
                        },
                    ],
                },
            });

            const response = httpMocks.createResponse({
                eventEmitter: require("events").EventEmitter,
            });

            try {
                await superTokensNextWrapper(
                    async (next) => {
                        return middleware()(request, response, next);
                    },
                    request,
                    response
                );
                assert(false);
            } catch (err) {
                assert.deepStrictEqual(err, { error: "sign up error" });
            }
        });
    });
});

function getSessionCookiesFromResponse(response) {
    return {
        sAccessToken: decodeURIComponent(
            response._getHeaders()["set-cookie"][0].split("sAccessToken=")[1].split(";")[0]
        ),
        sRefreshToken: decodeURIComponent(
            response._getHeaders()["set-cookie"][1].split("sRefreshToken=")[1].split(";")[0]
        ),
        sIdRefreshToken: decodeURIComponent(
            response._getHeaders()["set-cookie"][2].split("sIdRefreshToken=")[1].split(";")[0]
        ),
    };
}
