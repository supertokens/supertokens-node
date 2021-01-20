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
    signUPRequest,
    extractInfoFromResponse,
    setKeyValueInConfig,
    emailVerifyTokenRequest,
} = require("../utils");
let STExpress = require("../..");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let { maxVersion } = require("../../lib/build/utils");
let { Querier } = require("../../lib/build/querier");
let EmailPassword = require("../../recipe/emailpassword");
const express = require("express");
const request = require("supertest");

/**
 * TODO: (later) in emailVerificationFunctions.ts:
 *        - (later) check that getEmailVerificationURL works fine
 *        - (later) check that createAndSendCustomEmail works fine
 */

describe(`emailverify: ${printPath("[test/emailpassword/emailverify.test.js]")}`, function () {
    let shouldRunTest = true;

    beforeEach(async function () {
        ProcessState.getInstance().reset();
    });

    describe("With default config", function () {
        let app, userId, infoFromResponse;

        before(async function () {
            await killAllST();
            await setupST();
            await setKeyValueInConfig("access_token_validity", 1);
            await startST();

            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [EmailPassword.init(), Session.init()],
            });

            app = express();

            app.use(STExpress.middleware());

            app.use(STExpress.errorHandler());

            const currCDIVersion = await Querier.getInstanceOrThrowError().getAPIVersion();
            shouldRunTest = maxVersion(currCDIVersion, "2.4") !== "2.4";

            const response = await signUPRequest(app, "exist@supertokens.io", "testPass123");
            assert(JSON.parse(response.text).status === "OK");
            assert(response.status === 200);

            userId = JSON.parse(response.text).user.id;
            infoFromResponse = extractInfoFromResponse(response);
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        /*
        generate token API:
            - Call the API with valid input, email not verified
            - Call the API with valid input, email verified and test error
            - Call the API with no session and see the output (should be 401)
            - Call the API with an expired access token and see that try refresh token is returned
            - Provide your own email callback and make sure that is called
        */

        if (shouldRunTest === true) {
            it("test the generate token api with valid input, email not verified", async function () {
                response = await emailVerifyTokenRequest(
                    app,
                    infoFromResponse.accessToken,
                    infoFromResponse.idRefreshTokenFromCookie,
                    infoFromResponse.antiCsrf,
                    userId
                );

                assert(JSON.parse(response.text).status === "OK");
                assert(Object.keys(JSON.parse(response.text)).length === 1);
            });

            it("test the generate token api with valid input, email verified and test error", async function () {
                const verifyToken = await EmailPassword.createEmailVerificationToken(userId);
                await EmailPassword.verifyEmailUsingToken(verifyToken);
                response = await emailVerifyTokenRequest(
                    app,
                    infoFromResponse.accessToken,
                    infoFromResponse.idRefreshTokenFromCookie,
                    infoFromResponse.antiCsrf,
                    userId
                );

                assert(JSON.parse(response.text).status === "EMAIL_ALREADY_VERIFIED_ERROR");
                assert(response.status === 200);
                assert(Object.keys(JSON.parse(response.text)).length === 1);
            });

            it("test the generate token api with valid input, no session and check output", async function () {
                const response = await new Promise((resolve) =>
                    request(app)
                        .post("/auth/user/email/verify/token")
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );

                assert(response.status === 401);
                assert(JSON.parse(response.text).message === "unauthorised");
                assert(Object.keys(JSON.parse(response.text)).length === 1);
            });

            it("test the email verify API with invalid token and check error", async function () {
                const response = await new Promise((resolve) =>
                    request(app)
                        .post("/auth/user/email/verify")
                        .send({
                            method: "token",
                            token: "randomToken",
                        })
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(err);
                            } else {
                                resolve(res);
                            }
                        })
                );
                assert(JSON.parse(response.text).status === "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR");
                assert(Object.keys(JSON.parse(response.text)).length === 1);
            });

            it("test the email verify API with token of not type string", async function () {
                const response = await new Promise((resolve) =>
                    request(app)
                        .post("/auth/user/email/verify")
                        .send({
                            method: "token",
                            token: 2000,
                        })
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );
                assert(response.status === 400);
                assert(JSON.parse(response.text).message === "The email verification token must be a string");
                assert(Object.keys(JSON.parse(response.text)).length === 1);
            });

            it("test the email verify with no session, using the get method", async function () {
                const response = await new Promise((resolve) =>
                    request(app)
                        .get("/auth/user/email/verify")
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );

                assert(response.status === 401);
                assert(JSON.parse(response.text).message === "unauthorised");
                assert(Object.keys(JSON.parse(response.text)).length === 1);
            });

            it("test the generate token api with an expired access token and see that try refresh token is returned", async function () {
                // Create and use new user for this test.
                const response = await signUPRequest(app, "exist2@supertokens.io", "testPass123");
                const userId = JSON.parse(response.text).user.id;
                const infoFromResponse = extractInfoFromResponse(response);
                await new Promise((r) => setTimeout(r, 1100));

                let emailVerifyTokenResponse = await emailVerifyTokenRequest(
                    app,
                    infoFromResponse.accessToken,
                    infoFromResponse.idRefreshTokenFromCookie,
                    infoFromResponse.antiCsrf,
                    userId
                );

                assert(emailVerifyTokenResponse.status === 401);
                assert(JSON.parse(emailVerifyTokenResponse.text).message === "try refresh token");
                assert(Object.keys(JSON.parse(emailVerifyTokenResponse.text)).length === 1);

                const refreshedResponse = extractInfoFromResponse(
                    await new Promise((resolve) =>
                        request(app)
                            .post("/auth/session/refresh")
                            .expect(200)
                            .set("Cookie", ["sRefreshToken=" + infoFromResponse.refreshToken])
                            .set("anti-csrf", infoFromResponse.antiCsrf)
                            .expect(200)
                            .end((err, res) => {
                                if (err) {
                                    resolve(undefined);
                                } else {
                                    resolve(res);
                                }
                            })
                    )
                );

                emailVerifyTokenResponse = await emailVerifyTokenRequest(
                    app,
                    refreshedResponse.accessToken,
                    refreshedResponse.idRefreshTokenFromCookie,
                    refreshedResponse.antiCsrf,
                    userId
                );

                assert.deepStrictEqual(emailVerifyTokenResponse.status, 200);
                assert.deepStrictEqual(JSON.parse(emailVerifyTokenResponse.text).status, "OK");
                assert.deepStrictEqual(Object.keys(JSON.parse(emailVerifyTokenResponse.text)).length, 1);
            });
        }
    });

    describe("With custom callbacks", function () {
        let app, userId, infoFromResponse, userInfo;
        let emailToken, token, userInfoFromCallback;

        before(async function () {
            await killAllST();
            await setupST();

            // Set key value in config.
            await setKeyValueInConfig("access_token_validity", 1);
            await startST();

            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailPassword.init({
                        emailVerificationFeature: {
                            handlePostEmailVerification: (user) => {
                                userInfoFromCallback = user;
                            },
                            createAndSendCustomEmail: (user, emailVerificationURLWithToken) => {
                                userInfo = user;
                                emailToken = emailVerificationURLWithToken;
                                token = emailVerificationURLWithToken.split("?token=")[1].split("&rid=")[0];
                            },
                        },
                    }),
                    Session.init(),
                ],
            });

            app = express();
            app.use(STExpress.middleware());
            app.use(STExpress.errorHandler());

            const currCDIVersion = await Querier.getInstanceOrThrowError().getAPIVersion();
            shouldRunTest = maxVersion(currCDIVersion, "2.4") !== "2.4";

            const response = await signUPRequest(app, "test@gmail.com", "testPass123");
            assert(JSON.parse(response.text).status === "OK");
            assert(response.status === 200);

            userId = JSON.parse(response.text).user.id;
            infoFromResponse = extractInfoFromResponse(response);
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        afterEach(async function () {
            emailToken = undefined;
            token = undefined;
            userInfoFromCallback = undefined;
        });

        if (shouldRunTest === true) {
            // Provide your own email callback and make sure that is called
            it("test custom callbacks (handlePostEmailVerification and createAndSendCustomEmail)", async function () {
                const response = await emailVerifyTokenRequest(
                    app,
                    infoFromResponse.accessToken,
                    infoFromResponse.idRefreshTokenFromCookie,
                    infoFromResponse.antiCsrf,
                    userId
                );

                assert.deepStrictEqual(response.status, 200);

                assert.deepStrictEqual(JSON.parse(response.text).status, "OK");
                assert.deepStrictEqual(Object.keys(JSON.parse(response.text)).length, 1);

                assert.deepStrictEqual(userInfo.id, userId);
                assert.deepStrictEqual(userInfo.email, "test@gmail.com");
                assert.notDeepStrictEqual(emailToken, null);
            });

            /*
            email verify API:
                POST:
                - Call the API with valid input
                - Call the API with an invalid token and see the error
                - token is not of type string from input
                - provide a handlePostEmailVerification callback and make sure it's called on success verification
                GET:
                - Call the API with valid input
                - Call the API with no session and see the error
                - Call the API with an expired access token and see that try refresh token is returned
            */
            it("test the email verify API with valid input", async function () {
                const emailVerifyTokenResponse = await emailVerifyTokenRequest(
                    app,
                    infoFromResponse.accessToken,
                    infoFromResponse.idRefreshTokenFromCookie,
                    infoFromResponse.antiCsrf,
                    userId
                );
                assert(JSON.parse(emailVerifyTokenResponse.text).status === "OK");
                assert(Object.keys(JSON.parse(emailVerifyTokenResponse.text)).length === 1);

                let response = await new Promise((resolve) =>
                    request(app)
                        .post("/auth/user/email/verify")
                        .send({
                            method: "token",
                            token,
                        })
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(err);
                            } else {
                                resolve(res);
                            }
                        })
                );

                assert(JSON.parse(response.text).status === "OK");
                assert(Object.keys(JSON.parse(response.text)).length === 1);
                assert.deepStrictEqual(userInfoFromCallback.id, userId);
                assert.deepStrictEqual(userInfoFromCallback.email, "test@gmail.com");
            });

            it("test the email verify API with valid input, using the get method", async function () {
                const signUPResponse = await signUPRequest(app, "test2@gmail.com", "testPass123");
                assert(JSON.parse(signUPResponse.text).status === "OK");
                assert(signUPResponse.status === 200);

                const userId = JSON.parse(signUPResponse.text).user.id;
                const infoFromResponse = extractInfoFromResponse(signUPResponse);

                const emailVerifyTokenResponse = await emailVerifyTokenRequest(
                    app,
                    infoFromResponse.accessToken,
                    infoFromResponse.idRefreshTokenFromCookie,
                    infoFromResponse.antiCsrf,
                    userId
                );
                assert(JSON.parse(emailVerifyTokenResponse.text).status === "OK");

                const sendEmailVerifyAPIResponse = await new Promise((resolve) =>
                    request(app)
                        .post("/auth/user/email/verify")
                        .send({
                            method: "token",
                            token,
                        })
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(err);
                            } else {
                                resolve(res);
                            }
                        })
                );

                assert(JSON.parse(sendEmailVerifyAPIResponse.text).status === "OK");

                const emailVerifyAPIResponse = await new Promise((resolve) =>
                    request(app)
                        .get("/auth/user/email/verify")
                        .set("Cookie", [
                            "sAccessToken=" +
                                infoFromResponse.accessToken +
                                ";sIdRefreshToken=" +
                                infoFromResponse.idRefreshTokenFromCookie,
                        ])
                        .set("anti-csrf", infoFromResponse.antiCsrf)
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(err);
                            } else {
                                resolve(res);
                            }
                        })
                );
                assert(JSON.parse(emailVerifyAPIResponse.text).status === "OK");
                assert(JSON.parse(emailVerifyAPIResponse.text).isVerified === true);
                assert(Object.keys(JSON.parse(emailVerifyAPIResponse.text)).length === 2);
            });

            it("test the email verify API with an expired access token, using the get method", async function () {
                // Create and use new user.
                const response = await signUPRequest(app, "exist2@supertokens.io", "testPass123");
                const userId = JSON.parse(response.text).user.id;
                const infoFromResponse = extractInfoFromResponse(response);

                const emailVerifyTokenResponse = await emailVerifyTokenRequest(
                    app,
                    infoFromResponse.accessToken,
                    infoFromResponse.idRefreshTokenFromCookie,
                    infoFromResponse.antiCsrf,
                    userId
                );
                assert(JSON.parse(emailVerifyTokenResponse.text).status === "OK");

                let emailVerifyTokenAPIResponse = await new Promise((resolve) =>
                    request(app)
                        .post("/auth/user/email/verify")
                        .send({
                            method: "token",
                            token,
                        })
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(err);
                            } else {
                                resolve(res);
                            }
                        })
                );

                assert(JSON.parse(emailVerifyTokenAPIResponse.text).status === "OK");

                await new Promise((r) => setTimeout(r, 1100));

                emailVerifyTokenAPIResponse = await new Promise((resolve) =>
                    request(app)
                        .get("/auth/user/email/verify")
                        .set("Cookie", [
                            "sAccessToken=" +
                                infoFromResponse.accessToken +
                                ";sIdRefreshToken=" +
                                infoFromResponse.idRefreshTokenFromCookie,
                        ])
                        .set("anti-csrf", infoFromResponse.antiCsrf)
                        .end((err, res) => {
                            if (err) {
                                resolve(err);
                            } else {
                                resolve(res);
                            }
                        })
                );
                assert(emailVerifyTokenAPIResponse.status === 401);
                assert(JSON.parse(emailVerifyTokenAPIResponse.text).message === "try refresh token");
                assert(Object.keys(JSON.parse(emailVerifyTokenAPIResponse.text)).length === 1);

                let refreshedResponse = extractInfoFromResponse(
                    await new Promise((resolve) =>
                        request(app)
                            .post("/auth/session/refresh")
                            .expect(200)
                            .set("Cookie", ["sRefreshToken=" + infoFromResponse.refreshToken])
                            .set("anti-csrf", infoFromResponse.antiCsrf)
                            .expect(200)
                            .end((err, res) => {
                                if (err) {
                                    resolve(undefined);
                                } else {
                                    resolve(res);
                                }
                            })
                    )
                );

                emailVerifyTokenAPIResponse = await new Promise((resolve) =>
                    request(app)
                        .get("/auth/user/email/verify")
                        .set("Cookie", [
                            "sAccessToken=" +
                                refreshedResponse.accessToken +
                                ";sIdRefreshToken=" +
                                refreshedResponse.idRefreshTokenFromCookie,
                        ])
                        .set("anti-csrf", refreshedResponse.antiCsrf)
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(err);
                            } else {
                                resolve(res);
                            }
                        })
                );
                assert(JSON.parse(emailVerifyTokenAPIResponse.text).status === "OK");
                assert(JSON.parse(emailVerifyTokenAPIResponse.text).isVerified === true);
            });
        }
    });
});
