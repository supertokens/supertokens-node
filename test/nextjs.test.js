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
let { ProcessState } = require("../lib/build/processState");
let SuperTokens = require("../lib/build/").default;
let { middleware } = require("../framework/express");
const Session = require("../lib/build/recipe/session");
const EmailPassword = require("../lib/build/recipe/emailpassword");
const ThirdPartyEmailPassword = require("../lib/build/recipe/thirdpartyemailpassword");
const superTokensNextWrapper = require("../lib/build/nextjs").superTokensNextWrapper;
const { verifySession } = require("../recipe/session/framework/express");
const { testApiHandler } = require("next-test-api-route-handler");

let wrapperErr;

async function nextApiHandlerWithMiddleware(req, res) {
    try {
        await superTokensNextWrapper(
            async (next) => {
                await middleware()(req, res, next);
            },
            req,
            res
        );
    } catch (err) {
        wrapperErr = err;
        throw err;
    }
    if (!res.writableEnded) {
        res.status(404).send("Not found");
    }
}

async function nextApiHandlerWithVerifySession(req, res) {
    await superTokensNextWrapper(
        async (next) => {
            await verifySession()(req, res, next);

            if (req.session) {
                res.status(200).send({
                    status: "OK",
                    userId: req.session.getUserId(),
                });
            }
        },
        req,
        res
    );
    if (!res.writableEnded) {
        res.status(404).send("Not found");
    }
}

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

        it("Sign Up", async function () {
            await testApiHandler({
                handler: nextApiHandlerWithMiddleware,
                url: "/api/auth/signup/",
                test: async ({ fetch }) => {
                    const res = await fetch({
                        method: "POST",
                        headers: {
                            rid: "emailpassword",
                        },
                        body: JSON.stringify({
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
                        }),
                    });
                    const respJson = await res.json();
                    assert.deepStrictEqual(respJson.status, "OK");
                    assert.deepStrictEqual(respJson.user.email, "john.doe@supertokens.io");
                    assert.strictEqual(respJson.user.id, process.env.user);
                    assert.notStrictEqual(res.headers.get("front-token"), undefined);
                    const tokens = getSessionTokensFromResponse(res);
                    assert.notEqual(tokens.access, undefined);
                    assert.notEqual(tokens.refresh, undefined);
                },
            });
        });

        it("Sign In", async function () {
            let tokens;
            await testApiHandler({
                handler: nextApiHandlerWithMiddleware,
                url: "/api/auth/signin/",
                test: async ({ fetch }) => {
                    const res = await fetch({
                        method: "POST",
                        headers: {
                            rid: "emailpassword",
                        },
                        body: JSON.stringify({
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
                        }),
                    });
                    const respJson = await res.json();

                    assert.deepStrictEqual(respJson.status, "OK");
                    assert.deepStrictEqual(respJson.user.email, "john.doe@supertokens.io");
                    assert(res.headers.get("front-token") !== undefined);
                    tokens = getSessionTokensFromResponse(res);
                    assert.notEqual(tokens.access, undefined);
                    assert.notEqual(tokens.refresh, undefined);
                },
            });
            // Verify if session exists next middleware tests:

            assert.notStrictEqual(tokens, undefined);

            // Case 1: Successful => add session to request object.
            await testApiHandler({
                handler: nextApiHandlerWithVerifySession,
                url: "/api/user/",
                test: async ({ fetch }) => {
                    const res = await fetch({
                        method: "POST",
                        headers: {
                            rid: "emailpassword",
                        },
                        headers: {
                            authorization: `Bearer ${tokens.access}`,
                        },
                        body: JSON.stringify({
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
                        }),
                    });
                    assert.strictEqual(res.status, 200);
                    const respJson = await res.json();
                    assert.strictEqual(respJson.status, "OK");
                    assert.strictEqual(respJson.userId, process.env.user);
                },
            });

            // Case 2: Unauthenticated => return 401.
            await testApiHandler({
                handler: nextApiHandlerWithVerifySession,
                url: "/api/user/",
                test: async ({ fetch }) => {
                    const res = await fetch({
                        method: "POST",
                        headers: {
                            rid: "emailpassword",
                        },
                        headers: {},
                        body: JSON.stringify({
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
                        }),
                    });
                    assert.strictEqual(res.status, 401);
                    const respJson = await res.json();
                    assert.strictEqual(respJson.message, "unauthorised");
                },
            });
        });

        it("Reset Password - Send Email", async function () {
            await testApiHandler({
                handler: nextApiHandlerWithMiddleware,
                url: "/api/auth/user/password/reset/token",
                test: async ({ fetch }) => {
                    const res = await fetch({
                        method: "POST",
                        headers: {
                            rid: "emailpassword",
                        },
                        body: JSON.stringify({
                            formFields: [
                                {
                                    id: "email",
                                    value: "john.doe@supertokens.io",
                                },
                            ],
                        }),
                    });
                    const respJson = await res.json();

                    assert.deepStrictEqual(respJson.status, "OK");
                },
            });
        });

        it("Reset Password - Create new password", async function () {
            await testApiHandler({
                handler: nextApiHandlerWithMiddleware,
                url: "/api/auth/user/password/reset/",
                test: async ({ fetch }) => {
                    const res = await fetch({
                        method: "POST",
                        headers: {
                            rid: "emailpassword",
                        },
                        body: JSON.stringify({
                            formFields: [
                                {
                                    id: "password",
                                    value: "NewP@sSW0rd",
                                },
                            ],
                            token: "RandomToken",
                        }),
                    });
                    const respJson = await res.json();

                    assert.deepStrictEqual(respJson.status, "RESET_PASSWORD_INVALID_TOKEN_ERROR");
                },
            });
        });

        it("does Email Exist with existing email", async function () {
            await testApiHandler({
                handler: nextApiHandlerWithMiddleware,
                url: "/api/auth/signup/email/exists",
                params: {
                    email: "john.doe@supertokens.io",
                },
                test: async ({ fetch }) => {
                    const res = await fetch({
                        method: "GET",
                        headers: {
                            rid: "emailpassword",
                        },
                    });
                    const respJson = await res.json();

                    assert.deepStrictEqual(respJson, { status: "OK", exists: true });
                },
            });
        });

        it("does Email Exist with unknown email", async function () {
            await testApiHandler({
                handler: nextApiHandlerWithMiddleware,
                url: "/api/auth/signup/email/exists",
                params: {
                    email: "unknown@supertokens.io",
                },
                test: async ({ fetch }) => {
                    const res = await fetch({
                        method: "GET",
                        headers: {
                            rid: "emailpassword",
                        },
                    });
                    const respJson = await res.json();

                    assert.deepStrictEqual(respJson, { status: "OK", exists: false });
                },
            });
        });

        it("Verify session successfully when session is present (check if it continues after)", function (done) {
            testApiHandler({
                handler: async (request, response) => {
                    await superTokensNextWrapper(
                        async (next) => {
                            await verifySession()(request, response, next);
                        },
                        request,
                        response
                    ).then(() => {
                        return done(new Error("not come here"));
                    });
                },
                url: "/api/auth/user/info",
                test: async ({ fetch }) => {
                    const res = await fetch({
                        method: "GET",
                        headers: {
                            rid: "emailpassword",
                        },
                        query: {
                            email: "john.doe@supertokens.io",
                        },
                    });
                    assert.strictEqual(res.status, 401);
                    done();
                },
            });
        });

        it("Create new session", async function () {
            await testApiHandler({
                handler: async (request, response) => {
                    const session = await superTokensNextWrapper(
                        async () => {
                            return await Session.createNewSession(request, response, "1", {}, {});
                        },
                        request,
                        response
                    );
                    response.status(200).send({
                        status: "OK",
                        userId: session.getUserId(),
                    });
                },
                url: "/api/auth/user/info",
                test: async ({ fetch }) => {
                    const res = await fetch({
                        method: "GET",
                    });
                    assert.strictEqual(res.status, 200);
                    assert.deepStrictEqual(await res.json(), {
                        status: "OK",
                        userId: "1",
                    });
                },
            });
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
                            ThirdPartyEmailPassword.Apple({
                                isDefault: true,
                                clientId: "4398792-io.supertokens.example.service",
                                clientSecret: {
                                    keyId: "7M48Y4RYDL",
                                    privateKey:
                                        "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----",
                                    teamId: "YWQCXGJRJL",
                                },
                            }),
                        ],
                    }),
                    Session.init({
                        getTokenTransferMethod: () => "cookie",
                    }),
                ],
            });
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        it("testing __supertokensFromNextJS flag", async function () {
            await testApiHandler({
                handler: nextApiHandlerWithMiddleware,
                url: "/api/auth/user/password/reset",
                test: async ({ fetch }) => {
                    const res = await fetch({
                        method: "POST",
                        headers: {
                            rid: "emailpassword",
                        },
                        body: JSON.stringify({
                            token: "hello",
                            formFields: [
                                {
                                    id: "password",
                                    value: "NewP@sSW0rd",
                                },
                            ],
                        }),
                    });
                    const resJson = await res.json();

                    assert.deepStrictEqual(resJson.status, "CUSTOM_RESPONSE");
                    assert.deepStrictEqual(resJson.nextJS, true);
                },
            });
        });

        it("testing __supertokensFromNextJS flag, apple redirect", async () => {
            await testApiHandler({
                handler: nextApiHandlerWithMiddleware,
                url: "/api/auth/callback/apple",
                test: async ({ fetch }) => {
                    const res = await fetch({
                        method: "POST",
                        headers: {
                            rid: "thirdpartyemailpassword",
                            "content-type": "application/x-www-form-urlencoded",
                        },
                        body: "state=hello&code=testing",
                    });
                    let expected = `<html><head><script>window.location.replace("https://supertokens.io/auth/callback/apple?state=hello&code=testing");</script></head></html>`;
                    const respText = await res.text();
                    assert.strictEqual(respText, expected);
                },
            });
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
                        getTokenTransferMethod: () => "cookie",
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
            await testApiHandler({
                handler: nextApiHandlerWithMiddleware,
                url: "/api/auth/signup/",
                test: async ({ fetch }) => {
                    const res = await fetch({
                        method: "POST",
                        headers: {
                            rid: "emailpassword",
                        },
                        body: JSON.stringify({
                            formFields: [
                                {
                                    id: "email",
                                    value: "john.doe2@supertokens.io",
                                },
                                {
                                    id: "password",
                                    value: "P@sSW0rd",
                                },
                            ],
                        }),
                    });
                    const respJson = await res.text();
                    assert.strictEqual(res.status, 500);
                    assert.strictEqual(respJson, "Internal Server Error");
                },
            });
            assert.deepStrictEqual(wrapperErr, { error: "sign up error" });
        });
    });
});

function getSessionTokensFromResponse(response) {
    return {
        access: response.headers.get("st-access-token"),
        refresh: response.headers.get("st-refresh-token"),
    };
}
