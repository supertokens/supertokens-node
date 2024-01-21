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

const [major, minor, patch] = process.versions.node.split(".").map(Number);

if (major >= 18) {
    const { printPath, setupST, startST, killAllST, cleanST, delay } = require("./utils");
    let assert = require("assert");
    let { ProcessState } = require("../lib/build/processState");
    let SuperTokens = require("../lib/build/").default;
    let { middleware } = require("../framework/express");
    const Session = require("../lib/build/recipe/session");
    const EmailPassword = require("../lib/build/recipe/emailpassword");
    const EmailVerification = require("../lib/build/recipe/emailverification");
    const ThirdPartyEmailPassword = require("../lib/build/recipe/thirdpartyemailpassword");
    const {
        superTokensNextWrapper,
        withSession,
        getSSRSession,
        getAppDirRequestHandler,
        withPreParsedRequestResponse,
    } = require("../lib/build/nextjs");
    const { verifySession } = require("../recipe/session/framework/express");
    const SessionError = require("../lib/build/recipe/session/error").default;
    const { testApiHandler } = require("next-test-api-route-handler");
    const { NextRequest, NextResponse } = require("next/server");

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

    describe(`Next.js Pages Router: ${printPath("[test/nextjs.test.js]")}`, function () {
        describe("with superTokensNextWrapper", function () {
            before(async function () {
                process.env.user = undefined;
                await killAllST();
                await setupST();
                const connectionURI = await startST();
                ProcessState.getInstance().reset();
                SuperTokens.init({
                    supertokens: {
                        connectionURI,
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
                                            let session = await oI.createNewSession(input);
                                            process.env.user = session.getUserId();
                                            return session;
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
                        assert.deepStrictEqual(respJson.user.emails[0], "john.doe@supertokens.io");
                        assert.strictEqual(respJson.user.id, process.env.user);
                        assert.notStrictEqual(res.headers.get("front-token"), undefined);
                        const tokens = getSessionTokensFromResponseHeaders(res);
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
                        assert.deepStrictEqual(respJson.user.emails[0], "john.doe@supertokens.io");
                        assert(res.headers.get("front-token") !== undefined);
                        tokens = getSessionTokensFromResponseHeaders(res);
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
                                return await Session.createNewSession(
                                    request,
                                    response,
                                    "public",
                                    SuperTokens.convertToRecipeUserId("1"),
                                    {},
                                    {}
                                );
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

        describe("with superTokensNextWrapper, body parser tests", function () {
            before(async function () {
                process.env.user = undefined;
                await killAllST();
                await setupST();
                const connectionURI = await startST();
                ProcessState.getInstance().reset();
                SuperTokens.init({
                    supertokens: {
                        connectionURI,
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
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
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

            it("testing JSON body", async function () {
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
                    },
                });
            });

            it("testing apple redirect (form data body)", async () => {
                await testApiHandler({
                    handler: nextApiHandlerWithMiddleware,
                    url: "/api/auth/callback/apple",
                    test: async ({ fetch }) => {
                        let state = Buffer.from(
                            JSON.stringify({ frontendRedirectURI: "http://localhost:3000/redirect" })
                        ).toString("base64");
                        let formData = { state, code: "testing" };
                        var encodedData = Object.keys(formData)
                            .map(function (key) {
                                return encodeURIComponent(key) + "=" + encodeURIComponent(formData[key]);
                            })
                            .join("&");

                        const res = await fetch({
                            method: "POST",
                            headers: {
                                rid: "thirdpartyemailpassword",
                                "content-type": "application/x-www-form-urlencoded",
                            },
                            body: encodedData,
                            redirect: "manual",
                        });
                        assert.deepStrictEqual(res.status, 303);
                        assert.deepEqual(
                            res.headers.get("location"),
                            "http://localhost:3000/redirect?state=eyJmcm9udGVuZFJlZGlyZWN0VVJJIjoiaHR0cDovL2xvY2FsaG9zdDozMDAwL3JlZGlyZWN0In0%3D&code=testing"
                        );
                    },
                });
            });
        });

        describe("with superTokensNextWrapper, overriding throws error", function () {
            before(async function () {
                process.env.user = undefined;
                await killAllST();
                await setupST();
                const connectionURI = await startST();
                ProcessState.getInstance().reset();
                SuperTokens.init({
                    supertokens: {
                        connectionURI,
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
                                            let session = await oI.createNewSession(input);
                                            process.env.user = session.getUserId();
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

    describe(`Next.js App Router: ${printPath("[test/nextjs.test.js]")}`, function () {
        before(async function () {
            process.env.user = undefined;
            await killAllST();
            await setupST();
            const connectionURI = await startST({ coreConfig: { access_token_validity: 2 } });
            ProcessState.getInstance().reset();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    apiBasePath: "/api/auth",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailPassword.init(),
                    EmailVerification.init({}),
                    Session.init({
                        override: {
                            functions: (oI) => {
                                return {
                                    ...oI,
                                    createNewSession: async (input) => {
                                        let session = await oI.createNewSession(input);
                                        process.env.user = session.getUserId();
                                        return session;
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
            const handleCall = getAppDirRequestHandler(NextResponse);

            const userEmail = `john.doe.${Date.now()}@supertokens.com`;
            const signUpRequest = new NextRequest("http://localhost:3000/api/auth/signup", {
                method: "POST",
                headers: { rid: "emailpassword" },
                body: JSON.stringify({
                    formFields: [
                        { id: "email", value: userEmail },
                        { id: "password", value: "P@sSW0rd" },
                    ],
                }),
            });

            const signUpRes = await handleCall(signUpRequest);
            const respJson = await signUpRes.json();

            assert.deepStrictEqual(respJson.status, "OK");
            assert.deepStrictEqual(respJson.user.emails[0], userEmail);
            assert.strictEqual(respJson.user.id, process.env.user);
            assert.notStrictEqual(signUpRes.headers.get("front-token"), undefined);
            const tokens = getSessionTokensFromResponseHeaders(signUpRes);
            assert.notEqual(tokens.access, undefined);
            assert.notEqual(tokens.refresh, undefined);
        });

        it("Sign In", async function () {
            const handleCall = getAppDirRequestHandler(NextResponse);

            const userEmail = `john.doe.${Date.now()}@supertokens.com`;
            const requestInfo = {
                method: "POST",
                headers: { rid: "emailpassword" },
                body: JSON.stringify({
                    formFields: [
                        { id: "email", value: userEmail },
                        { id: "password", value: "P@sSW0rd" },
                    ],
                }),
            };

            const signUpRequest = new NextRequest("http://localhost:3000/api/auth/signup", requestInfo);

            const signUpRes = await handleCall(signUpRequest);
            assert.deepStrictEqual(signUpRes.status, 200);

            const signInRequest = new NextRequest("http://localhost:3000/api/auth/signin", requestInfo);

            const signInRes = await handleCall(signInRequest);
            const respJson = await signInRes.json();

            assert.deepStrictEqual(respJson.status, "OK");
            assert.deepStrictEqual(respJson.user.emails[0], userEmail);
            assert.strictEqual(respJson.user.id, process.env.user);
            assert.notStrictEqual(signInRes.headers.get("front-token"), undefined);
            const tokens = getSessionTokensFromResponseHeaders(signInRes);
            assert.notEqual(tokens.access, undefined);
            assert.notEqual(tokens.refresh, undefined);
        });

        it("getSSRSession", async function () {
            const tokens = await getValidTokensAfterSignup({ tokenTransferMethod: "header" });

            const authenticatedRequest = new NextRequest("http://localhost:3000/api/get-user", {
                headers: {
                    Authorization: `Bearer ${tokens.access}`,
                },
            });

            let sessionContainer = await getSSRSession(
                authenticatedRequest.cookies.getAll(),
                authenticatedRequest.headers
            );

            assert.equal(sessionContainer.hasToken, true);
            assert.equal(sessionContainer.session.getUserId(), process.env.user);

            const unAuthenticatedRequest = new NextRequest("http://localhost:3000/api/get-user");

            sessionContainer = await getSSRSession(
                unAuthenticatedRequest.cookies.getAll(),
                unAuthenticatedRequest.headers
            );

            assert.equal(sessionContainer.hasToken, false);
            assert.equal(sessionContainer.session, undefined);

            const requestWithFailedClaim = new NextRequest("http://localhost:3000/api/get-user", {
                headers: {
                    Authorization: `Bearer ${tokens.access}`,
                },
            });

            sessionContainer = await getSSRSession(
                requestWithFailedClaim.cookies.getAll(),
                requestWithFailedClaim.headers,
                {
                    overrideGlobalClaimValidators: async (globalValidators) => [
                        ...globalValidators,
                        EmailVerification.EmailVerificationClaim.validators.isVerified(),
                    ],
                }
            );
            assert.equal(sessionContainer.hasToken, true);
            assert.equal(sessionContainer.hasInvalidClaims, true);

            await delay(3);
            const requestWithExpiredToken = new NextRequest("http://localhost:3000/api/get-user", {
                headers: {
                    Authorization: `Bearer ${tokens.access}`,
                },
            });

            sessionContainer = await getSSRSession(
                requestWithExpiredToken.cookies.getAll(),
                requestWithExpiredToken.headers
            );
            assert.equal(sessionContainer.session, undefined);
            assert.equal(sessionContainer.hasToken, true);
        });

        it("withSession", async function () {
            const tokens = await getValidTokensAfterSignup({ tokenTransferMethod: "header" });

            const authenticatedRequest = new NextRequest("http://localhost:3000/api/get-user", {
                headers: {
                    Authorization: `Bearer ${tokens.access}`,
                },
            });

            const authenticatedResponse = await withSession(authenticatedRequest, async (err, session) => {
                if (err) return NextResponse.json(err, { status: 500 });
                return NextResponse.json({
                    userId: session.getUserId(),
                    sessionHandle: session.getHandle(),
                    accessTokenPayload: session.getAccessTokenPayload(),
                });
            });

            assert.equal(authenticatedResponse.status, 200);
            const authenticatedResponseJson = await authenticatedResponse.json();
            assert(authenticatedResponseJson.userId === process.env.user);

            const requestWhereHandlerThrowsSTError = authenticatedRequest;
            const responseWhereHandlerThrowsSTError = await withSession(
                requestWhereHandlerThrowsSTError,
                async (err, session) => {
                    throw new SessionError({ message: "Authentication Required!", type: "UNAUTHORISED" });
                }
            );
            assert.equal(responseWhereHandlerThrowsSTError.status, 401);

            const requestWhereHandlerThrowsUnknownError = authenticatedRequest;
            const unknownError = new Error("Unknown error");
            try {
                await withSession(requestWhereHandlerThrowsUnknownError, async (err, session) => {
                    throw unknownError;
                });
                assert.fail("should not come here");
            } catch (error) {
                assert.strictEqual(error, unknownError);
            }

            const unAuthenticatedRequest = new NextRequest("http://localhost:3000/api/get-user");

            const unAuthenticatedResponse = await withSession(unAuthenticatedRequest, async (err, session) => {
                if (err) return NextResponse.json(err, { status: 500 });
                return NextResponse.json({
                    userId: session.getUserId(),
                    sessionHandle: session.getHandle(),
                    accessTokenPayload: session.getAccessTokenPayload(),
                });
            });
            assert.equal(unAuthenticatedResponse.status, 401);

            const requestWithFailedClaim = new NextRequest("http://localhost:3000/api/get-user", {
                headers: {
                    Authorization: `Bearer ${tokens.access}`,
                },
            });

            const responseWithFailedClaim = await withSession(
                requestWithFailedClaim,
                async (err, session) => {
                    if (err) return NextResponse.json(err, { status: 500 });
                    return NextResponse.json({
                        userId: session.getUserId(),
                        sessionHandle: session.getHandle(),
                        accessTokenPayload: session.getAccessTokenPayload(),
                    });
                },
                {
                    overrideGlobalClaimValidators: async (globalValidators) => [
                        ...globalValidators,
                        EmailVerification.EmailVerificationClaim.validators.isVerified(),
                    ],
                }
            );

            assert.equal(responseWithFailedClaim.status, 403);

            await delay(3);
            const requestWithExpiredToken = new NextRequest("http://localhost:3000/api/get-user", {
                headers: {
                    Authorization: `Bearer ${tokens.access}`,
                },
            });

            const responseWithExpiredToken = await withSession(requestWithExpiredToken, async (err, session) => {
                if (err) return NextResponse.json(err, { status: 500 });
                return NextResponse.json({
                    userId: session.getUserId(),
                    sessionHandle: session.getHandle(),
                    accessTokenPayload: session.getAccessTokenPayload(),
                });
            });

            assert.equal(responseWithExpiredToken.status, 401);

            const requestThatThrows = {}; // this is an invalid request object and it will cause withSession to throw

            const responseThatThrows = await withSession(requestThatThrows, async (err, session) => {
                if (err) return NextResponse.json(err, { status: 500 });
                throw new Error("test error");
            });

            assert.equal(responseThatThrows.status, 500);
        });

        it("withPreParsedRequestResponse", async function () {
            const tokens = await getValidTokensAfterSignup({ tokenTransferMethod: "header" });

            const authenticatedRequest = new NextRequest("http://localhost:3000/api/get-user", {
                headers: {
                    Authorization: `Bearer ${tokens.access}`,
                },
            });

            const authenticatedResponse = await withPreParsedRequestResponse(
                authenticatedRequest,
                async (baseRequest, baseResponse) => {
                    const session = await Session.getSession(baseRequest, baseResponse);

                    return NextResponse.json({ userId: session.getUserId() });
                }
            );

            assert.equal(authenticatedResponse.status, 200);
            const authenticatedResponseJson = await authenticatedResponse.json();
            assert(authenticatedResponseJson.userId === process.env.user);

            const requestWhereHandlerThrowsSTError = authenticatedRequest;
            const responseWhereHandlerThrowsSTError = await withPreParsedRequestResponse(
                requestWhereHandlerThrowsSTError,
                async (baseRequest, baseResponse) => {
                    throw new SessionError({ message: "Authentication Required!", type: "UNAUTHORISED" });
                }
            );
            assert.equal(responseWhereHandlerThrowsSTError.status, 401);

            const requestWhereHandlerThrowsUnknownError = authenticatedRequest;
            const unknownError = new Error("Unknown error");
            try {
                await withPreParsedRequestResponse(
                    requestWhereHandlerThrowsUnknownError,
                    async (baseRequest, baseResponse) => {
                        throw unknownError;
                    }
                );
                assert.fail("should not come here");
            } catch (error) {
                assert.strictEqual(error, unknownError);
            }
        });
    });

    describe(`getSSRSession:hasToken`, function () {
        describe("tokenTransferMethod = any", function () {
            before(async function () {
                process.env.user = undefined;
                await killAllST();
                await setupST();
                const connectionURI = await startST();
                ProcessState.getInstance().reset();
                SuperTokens.init({
                    supertokens: {
                        connectionURI,
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
                            getTokenTransferMethod: () => "any",
                        }),
                    ],
                });
            });

            after(async function () {
                await killAllST();
                await cleanST();
            });

            it("should return hasToken value correctly", async function () {
                const tokens = await getValidTokensAfterSignup({ tokenTransferMethod: "header" });

                const requestWithNoToken = new NextRequest("http://localhost:3000/api/get-user");

                sessionContainer = await getSSRSession(requestWithNoToken.cookies.getAll(), requestWithNoToken.headers);

                assert.equal(sessionContainer.hasToken, false);

                const requestWithInvalidToken = new NextRequest("http://localhost:3000/api/get-user", {
                    headers: {
                        Authorization: `Bearer some-random-token`,
                    },
                });

                sessionContainer = await getSSRSession(
                    requestWithInvalidToken.cookies.getAll(),
                    requestWithInvalidToken.headers
                );
                assert.equal(sessionContainer.hasToken, false);

                const requestWithTokenInHeader = new NextRequest("http://localhost:3000/api/get-user", {
                    headers: {
                        Authorization: `Bearer ${tokens.access}`,
                    },
                });

                sessionContainer = await getSSRSession(
                    requestWithTokenInHeader.cookies.getAll(),
                    requestWithTokenInHeader.headers
                );
                assert.equal(sessionContainer.hasToken, true);

                const requestWithTokenInCookie = new NextRequest("http://localhost:3000/api/get-user", {
                    headers: {
                        Cookie: `sAccessToken=${tokens.access}`,
                    },
                });

                sessionContainer = await getSSRSession(
                    requestWithTokenInCookie.cookies.getAll(),
                    requestWithTokenInCookie.headers
                );
                assert.equal(sessionContainer.hasToken, true);
            });
        });

        describe("tokenTransferMethod = cookie", function () {
            before(async function () {
                process.env.user = undefined;
                await killAllST();
                await setupST();
                const connectionURI = await startST();
                ProcessState.getInstance().reset();
                SuperTokens.init({
                    supertokens: {
                        connectionURI,
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
                        }),
                    ],
                });
            });

            after(async function () {
                await killAllST();
                await cleanST();
            });

            it("should return hasToken value correctly", async function () {
                const tokens = await getValidTokensAfterSignup({ tokenTransferMethod: "cookie" });

                const requestWithNoToken = new NextRequest("http://localhost:3000/api/get-user");

                sessionContainer = await getSSRSession(requestWithNoToken.cookies.getAll(), requestWithNoToken.headers);

                assert.equal(sessionContainer.hasToken, false);

                const requestWithInvalidToken = new NextRequest("http://localhost:3000/api/get-user", {
                    headers: {
                        Cookie: `sAccessToken=some-random-token`,
                    },
                });

                sessionContainer = await getSSRSession(
                    requestWithInvalidToken.cookies.getAll(),
                    requestWithInvalidToken.headers
                );
                assert.equal(sessionContainer.hasToken, false);

                const requestWithTokenInHeader = new NextRequest("http://localhost:3000/api/get-user", {
                    headers: {
                        Authorization: `Bearer ${tokens.access}`,
                    },
                });

                sessionContainer = await getSSRSession(
                    requestWithTokenInHeader.cookies.getAll(),
                    requestWithTokenInHeader.headers
                );
                assert.equal(sessionContainer.hasToken, false);

                const requestWithTokenInCookie = new NextRequest("http://localhost:3000/api/get-user", {
                    headers: {
                        Cookie: `sAccessToken=${tokens.access}`,
                    },
                });

                sessionContainer = await getSSRSession(
                    requestWithTokenInCookie.cookies.getAll(),
                    requestWithTokenInCookie.headers
                );
                assert.equal(sessionContainer.hasToken, true);
            });
        });

        describe("tokenTransferMethod = header", function () {
            before(async function () {
                process.env.user = undefined;
                await killAllST();
                await setupST();
                const connectionURI = await startST();
                ProcessState.getInstance().reset();
                SuperTokens.init({
                    supertokens: {
                        connectionURI,
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
                            getTokenTransferMethod: () => "header",
                        }),
                    ],
                });
            });

            after(async function () {
                await killAllST();
                await cleanST();
            });

            it("should return hasToken value correctly", async function () {
                const tokens = await getValidTokensAfterSignup({ tokenTransferMethod: "header" });

                const requestWithNoToken = new NextRequest("http://localhost:3000/api/get-user");

                sessionContainer = await getSSRSession(requestWithNoToken.cookies.getAll(), requestWithNoToken.headers);

                assert.equal(sessionContainer.hasToken, false);

                const requestWithInvalidToken = new NextRequest("http://localhost:3000/api/get-user", {
                    headers: {
                        Authorization: `Bearer some-random-token`,
                    },
                });

                sessionContainer = await getSSRSession(
                    requestWithInvalidToken.cookies.getAll(),
                    requestWithInvalidToken.headers
                );
                assert.equal(sessionContainer.hasToken, false);

                const requestWithTokenInHeader = new NextRequest("http://localhost:3000/api/get-user", {
                    headers: {
                        Authorization: `Bearer ${tokens.access}`,
                    },
                });

                sessionContainer = await getSSRSession(
                    requestWithTokenInHeader.cookies.getAll(),
                    requestWithTokenInHeader.headers
                );
                assert.equal(sessionContainer.hasToken, true);

                const requestWithTokenInCookie = new NextRequest("http://localhost:3000/api/get-user", {
                    headers: {
                        Cookie: `sAccessToken=${tokens.access}`,
                    },
                });

                sessionContainer = await getSSRSession(
                    requestWithTokenInCookie.cookies.getAll(),
                    requestWithTokenInCookie.headers
                );
                assert.equal(sessionContainer.hasToken, false);
            });
        });
    });

    async function getValidTokensAfterSignup({ tokenTransferMethod = "header" } = {}) {
        const handleCall = getAppDirRequestHandler(NextResponse);

        const userEmail = `john.doe.${Date.now()}@supertokens.com`;
        const requestInfo = {
            method: "POST",
            headers: { rid: "emailpassword" },
            body: JSON.stringify({
                formFields: [
                    { id: "email", value: userEmail },
                    { id: "password", value: "P@sSW0rd" },
                ],
            }),
        };

        const signUpRequest = new NextRequest("http://localhost:3000/api/auth/signup", requestInfo);

        const signUpRes = await handleCall(signUpRequest);
        assert.deepStrictEqual(signUpRes.status, 200);
        const tokens =
            tokenTransferMethod === "header"
                ? getSessionTokensFromResponseHeaders(signUpRes)
                : getSessionTokensFromResponseCookies(signUpRes);
        assert.notEqual(tokens.access, undefined);
        assert.notEqual(tokens.refresh, undefined);
        return tokens;
    }

    function getSessionTokensFromResponseHeaders(response) {
        return {
            access: response.headers.get("st-access-token"),
            refresh: response.headers.get("st-refresh-token"),
        };
    }

    function getSessionTokensFromResponseCookies(response) {
        const tokens = {};

        const setCookieHeader = response.headers.get("Set-Cookie");

        if (setCookieHeader) {
            const matchAccessToken = setCookieHeader.match(/sAccessToken=([^;]+)/);
            const matchRefreshToken = setCookieHeader.match(/sRefreshToken=([^;]+)/);

            if (matchAccessToken) {
                tokens.access = matchAccessToken[1];
            }

            if (matchRefreshToken) {
                tokens.refresh = matchRefreshToken[1];
            }
        }

        return tokens;
    }
}
