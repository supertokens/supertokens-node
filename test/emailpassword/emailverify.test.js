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
    stopST,
    killAllST,
    cleanST,
    resetAll,
    signUPRequest,
    extractInfoFromResponse,
    setKeyValueInConfig,
    emailVerifyTokenRequest,
} = require("../utils");
let STExpress = require("../..");
let Session = require("../../recipe/session");
const EmailVerification = require("../../recipe/emailverification");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let { maxVersion } = require("../../lib/build/utils");
let { Querier } = require("../../lib/build/querier");
let EmailPassword = require("../../recipe/emailpassword");
const express = require("express");
const request = require("supertest");
let { middleware, errorHandler } = require("../../framework/express");

/**
 * TODO: (later) in emailVerificationFunctions.ts:
 *        - (later) check that createAndSendCustomEmail works fine
 */

describe(`emailverify: ${printPath("[test/emailpassword/emailverify.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
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

    // Call the API with valid input, email not verified
    it("test the generate token api with valid input, email not verified", async function () {
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
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                EmailVerification.init({ mode: "OPTIONAL" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userId = JSON.parse(response.text).user.id;
        let infoFromResponse = extractInfoFromResponse(response);

        response = await emailVerifyTokenRequest(app, infoFromResponse.accessToken, infoFromResponse.antiCsrf, userId);

        assert(JSON.parse(response.text).status === "OK");
        assert(Object.keys(JSON.parse(response.text)).length === 1);
    });

    //Call the API with valid input, email verified and test error
    it("test the generate token api with valid input, email verified and test error", async function () {
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
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                EmailVerification.init({ mode: "OPTIONAL" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userId = JSON.parse(response.text).user.id;
        let emailId = JSON.parse(response.text).user.emails[0];
        let infoFromResponse = extractInfoFromResponse(response);

        let verifyToken = await EmailVerification.createEmailVerificationToken(userId, emailId);
        await EmailVerification.verifyEmailUsingToken(verifyToken.token);

        response = await emailVerifyTokenRequest(app, infoFromResponse.accessToken, infoFromResponse.antiCsrf, userId);

        assert(JSON.parse(response.text).status === "EMAIL_ALREADY_VERIFIED_ERROR");
        assert(response.status === 200);
        assert(Object.keys(JSON.parse(response.text)).length === 1);
    });

    // Call the API with no session and see the output
    it("test the generate token api with valid input, no session and check output", async function () {
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
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                EmailVerification.init({ mode: "OPTIONAL" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
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

    // Call the API with an expired access token and see that try refresh token is returned
    it("test the generate token api with an expired access token and see that try refresh token is returned", async function () {
        await setKeyValueInConfig("access_token_validity", 2);
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
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                EmailVerification.init({ mode: "OPTIONAL" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userId = JSON.parse(response.text).user.id;
        let infoFromResponse = extractInfoFromResponse(response);

        await new Promise((r) => setTimeout(r, 5000));

        let response2 = await emailVerifyTokenRequest(
            app,
            infoFromResponse.accessToken,
            infoFromResponse.antiCsrf,
            userId
        );

        assert(response2.status === 401);
        assert(JSON.parse(response2.text).message === "try refresh token");
        assert(Object.keys(JSON.parse(response2.text)).length === 1);

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

        let response3 = (response = await emailVerifyTokenRequest(
            app,
            refreshedResponse.accessToken,
            refreshedResponse.antiCsrf,
            userId
        ));

        assert(response3.status === 200);
        assert(JSON.parse(response3.text).status === "OK");
        assert(Object.keys(JSON.parse(response3.text)).length === 1);
    });

    // Provide your own email callback and make sure that is called
    it("test that providing your own email callback and make sure it is called", async function () {
        await startST();

        let userInfo = null;
        let emailToken = null;

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
                EmailVerification.init({
                    mode: "OPTIONAL",
                    createAndSendCustomEmail: (user, emailVerificationURLWithToken) => {
                        userInfo = user;
                        emailToken = emailVerificationURLWithToken;
                    },
                }),
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userId = JSON.parse(response.text).user.id;
        let infoFromResponse = extractInfoFromResponse(response);

        let response2 = await emailVerifyTokenRequest(
            app,
            infoFromResponse.accessToken,
            infoFromResponse.antiCsrf,
            userId
        );

        assert(response2.status === 200);

        assert(JSON.parse(response2.text).status === "OK");
        assert(Object.keys(JSON.parse(response2.text)).length === 1);

        assert(userInfo.recipeUserId === userId);
        assert(userInfo.email === "test@gmail.com");
        assert(emailToken !== null);
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
        await startST();

        let token = null;
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
                EmailVerification.init({
                    mode: "OPTIONAL",
                    createAndSendCustomEmail: (user, emailVerificationURLWithToken) => {
                        token = emailVerificationURLWithToken.split("?token=")[1].split("&rid=")[0];
                    },
                }),
                EmailPassword.init({}),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userId = JSON.parse(response.text).user.id;
        let infoFromResponse = extractInfoFromResponse(response);

        response = await emailVerifyTokenRequest(app, infoFromResponse.accessToken, infoFromResponse.antiCsrf, userId);
        assert(JSON.parse(response.text).status === "OK");
        assert(Object.keys(JSON.parse(response.text)).length === 1);

        let response2 = await new Promise((resolve) =>
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

        assert(JSON.parse(response2.text).status === "OK");
        assert(Object.keys(JSON.parse(response2.text)).length === 1);
    });

    // Call the API with an invalid token and see the error
    it("test the email verify API with invalid token and check error", async function () {
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
                EmailVerification.init({
                    mode: "OPTIONAL",
                }),
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        response = await new Promise((resolve) =>
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

    // token is not of type string from input
    it("test the email verify API with token of not type string", async function () {
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
                EmailVerification.init({
                    mode: "OPTIONAL",
                }),
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        response = await new Promise((resolve) =>
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

    // provide a handlePostEmailVerification callback and make sure it's called on success verification
    it("test that the handlePostEmailVerification callback is called on successfull verification, if given", async function () {
        await startST();

        let userInfoFromCallback = null;
        let token = null;

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
                EmailVerification.init({
                    mode: "OPTIONAL",
                    createAndSendCustomEmail: (user, emailVerificationURLWithToken) => {
                        token = emailVerificationURLWithToken.split("?token=")[1].split("&rid=")[0];
                    },
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                verifyEmailPOST: async (token, options) => {
                                    let response = await oI.verifyEmailPOST(token, options);
                                    if (response.status === "OK") {
                                        userInfoFromCallback = response.user;
                                    }
                                    return response;
                                },
                            };
                        },
                    },
                }),
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userId = JSON.parse(response.text).user.id;
        let infoFromResponse = extractInfoFromResponse(response);

        response = await emailVerifyTokenRequest(app, infoFromResponse.accessToken, infoFromResponse.antiCsrf, userId);
        assert(JSON.parse(response.text).status === "OK");

        let response2 = await new Promise((resolve) =>
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

        assert(JSON.parse(response2.text).status === "OK");
        assert(Object.keys(JSON.parse(response2.text)).length === 1);

        // wait for the callback to be called...
        await new Promise((res) => setTimeout(res, 500));

        assert(userInfoFromCallback.recipeUserId === userId);
        assert(userInfoFromCallback.email === "test@gmail.com");
    });

    // Call the API with valid input
    it("test the email verify with valid input, using the get method", async function () {
        await startST();

        let token = null;

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
                EmailVerification.init({
                    mode: "OPTIONAL",
                    createAndSendCustomEmail: (user, emailVerificationURLWithToken) => {
                        token = emailVerificationURLWithToken.split("?token=")[1].split("&rid=")[0];
                    },
                }),
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userId = JSON.parse(response.text).user.id;
        let infoFromResponse = extractInfoFromResponse(response);

        response = await emailVerifyTokenRequest(app, infoFromResponse.accessToken, infoFromResponse.antiCsrf, userId);
        assert(JSON.parse(response.text).status === "OK");

        let response2 = await new Promise((resolve) =>
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

        assert(JSON.parse(response2.text).status === "OK");

        let response3 = await new Promise((resolve) =>
            request(app)
                .get("/auth/user/email/verify")
                .set("Cookie", ["sAccessToken=" + infoFromResponse.accessToken])
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
        assert(JSON.parse(response3.text).status === "OK");
        assert(JSON.parse(response3.text).isVerified === true);
        assert(Object.keys(JSON.parse(response3.text)).length === 2);
    });

    // Call the API with no session and see the error
    it("test the email verify with no session, using the get method", async function () {
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
                EmailVerification.init({
                    mode: "OPTIONAL",
                }),
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
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

    // Call the API with an expired access token and see that try refresh token is returned
    it("test the email verify with an expired access token, using the get method", async function () {
        await setKeyValueInConfig("access_token_validity", 2);
        await startST();

        let token = null;

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
                EmailVerification.init({
                    mode: "OPTIONAL",
                    createAndSendCustomEmail: (user, emailVerificationURLWithToken) => {
                        token = emailVerificationURLWithToken.split("?token=")[1].split("&rid=")[0];
                    },
                }),
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userId = JSON.parse(response.text).user.id;
        let infoFromResponse = extractInfoFromResponse(response);

        response = await emailVerifyTokenRequest(app, infoFromResponse.accessToken, infoFromResponse.antiCsrf, userId);
        assert(JSON.parse(response.text).status === "OK");

        let response2 = await new Promise((resolve) =>
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

        assert(JSON.parse(response2.text).status === "OK");

        await new Promise((r) => setTimeout(r, 5000));

        let response3 = await new Promise((resolve) =>
            request(app)
                .get("/auth/user/email/verify")
                .set("Cookie", ["sAccessToken=" + infoFromResponse.accessToken])
                .set("anti-csrf", infoFromResponse.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(response3.status === 401);
        assert(JSON.parse(response3.text).message === "try refresh token");
        assert(Object.keys(JSON.parse(response3.text)).length === 1);

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

        let response4 = await new Promise((resolve) =>
            request(app)
                .get("/auth/user/email/verify")
                .set("Cookie", ["sAccessToken=" + refreshedResponse.accessToken])
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
        assert(JSON.parse(response4.text).status === "OK");
        assert(JSON.parse(response4.text).isVerified === true);
        assert(Object.keys(JSON.parse(response.text)).length === 1);
    });

    it("test the email verify API with valid input, overriding apis", async function () {
        await startST();

        let user = undefined;
        let token = null;
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
                EmailVerification.init({
                    mode: "OPTIONAL",
                    createAndSendCustomEmail: (user, emailVerificationURLWithToken) => {
                        token = emailVerificationURLWithToken.split("?token=")[1].split("&rid=")[0];
                    },
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                verifyEmailPOST: async (input) => {
                                    let response = await oI.verifyEmailPOST(input);
                                    user = response.user;
                                    return response;
                                },
                            };
                        },
                    },
                }),
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(response.body.status === "OK");
        assert(response.status === 200);

        let userId = response.body.user.id;
        let infoFromResponse = extractInfoFromResponse(response);

        response = await emailVerifyTokenRequest(app, infoFromResponse.accessToken, infoFromResponse.antiCsrf, userId);
        assert(response.body.status === "OK");
        assert(Object.keys(response.body).length === 1);

        let response2 = await new Promise((resolve) =>
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
                        resolve(res.body);
                    }
                })
        );

        assert(response2.status === "OK");
        assert(Object.keys(response2).length === 1);
        assert.strictEqual(user.recipeUserId, userId);
        assert.strictEqual(user.email, "test@gmail.com");
    });

    it("test the email verify API with valid input, overriding functions", async function () {
        await startST();

        let user = undefined;
        let token = null;
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
                EmailVerification.init({
                    mode: "OPTIONAL",
                    createAndSendCustomEmail: (user, emailVerificationURLWithToken) => {
                        token = emailVerificationURLWithToken.split("?token=")[1].split("&rid=")[0];
                    },
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                verifyEmailUsingToken: async (input) => {
                                    let response = await oI.verifyEmailUsingToken(input);
                                    user = response.user;
                                    return response;
                                },
                            };
                        },
                    },
                }),
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(response.body.status === "OK");
        assert(response.status === 200);

        let userId = response.body.user.id;
        let infoFromResponse = extractInfoFromResponse(response);

        response = await emailVerifyTokenRequest(app, infoFromResponse.accessToken, infoFromResponse.antiCsrf, userId);
        assert(response.body.status === "OK");
        assert(Object.keys(response.body).length === 1);

        let response2 = await new Promise((resolve) =>
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
                        resolve(res.body);
                    }
                })
        );

        assert(response2.status === "OK");
        assert(Object.keys(response2).length === 1);
        assert.strictEqual(user.recipeUserId, userId);
        assert.strictEqual(user.email, "test@gmail.com");
    });

    it("test the email verify API with valid input, overriding apis throws error", async function () {
        await startST();

        let user = undefined;
        let token = null;
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
                EmailVerification.init({
                    mode: "OPTIONAL",
                    createAndSendCustomEmail: (user, emailVerificationURLWithToken) => {
                        token = emailVerificationURLWithToken.split("?token=")[1].split("&rid=")[0];
                    },
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                verifyEmailPOST: async (input) => {
                                    let response = await oI.verifyEmailPOST(input);
                                    user = response.user;
                                    throw {
                                        error: "verify email error",
                                    };
                                },
                            };
                        },
                    },
                }),
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        app.use((err, req, res, next) => {
            res.json({
                customError: true,
                ...err,
            });
        });

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(response.body.status === "OK");
        assert(response.status === 200);

        let userId = response.body.user.id;
        let infoFromResponse = extractInfoFromResponse(response);

        response = await emailVerifyTokenRequest(app, infoFromResponse.accessToken, infoFromResponse.antiCsrf, userId);
        assert(response.body.status === "OK");
        assert(Object.keys(response.body).length === 1);

        let response2 = await new Promise((resolve) =>
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
                        resolve(res.body);
                    }
                })
        );

        assert.deepStrictEqual(response2, { customError: true, error: "verify email error" });
        assert.strictEqual(user.recipeUserId, userId);
        assert.strictEqual(user.email, "test@gmail.com");
    });

    it("test the email verify API with valid input, overriding functions throws error", async function () {
        await startST();

        let user = undefined;
        let token = null;
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
                EmailPassword.init(),
                EmailVerification.init({
                    mode: "OPTIONAL",
                    createAndSendCustomEmail: (user, emailVerificationURLWithToken) => {
                        token = emailVerificationURLWithToken.split("?token=")[1].split("&rid=")[0];
                    },
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                verifyEmailUsingToken: async (input) => {
                                    let response = await oI.verifyEmailUsingToken(input);
                                    user = response.user;
                                    throw {
                                        error: "verify email error",
                                    };
                                },
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        app.use((err, req, res, next) => {
            res.json({
                customError: true,
                ...err,
            });
        });

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(response.body.status === "OK");
        assert(response.status === 200);

        let userId = response.body.user.id;
        let infoFromResponse = extractInfoFromResponse(response);

        response = await emailVerifyTokenRequest(app, infoFromResponse.accessToken, infoFromResponse.antiCsrf, userId);
        assert(response.body.status === "OK");
        assert(Object.keys(response.body).length === 1);

        let response2 = await new Promise((resolve) =>
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
                        resolve(res.body);
                    }
                })
        );

        assert.deepStrictEqual(response2, { customError: true, error: "verify email error" });
        assert.strictEqual(user.recipeUserId, userId);
        assert.strictEqual(user.email, "test@gmail.com");
    });

    it("test the generate token api with valid input, and then remove token", async function () {
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
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                EmailVerification.init({ mode: "OPTIONAL" }),
            ],
        });

        let apiVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion();
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userId = JSON.parse(response.text).user.id;
        let infoFromResponse = extractInfoFromResponse(response);

        let verifyToken = await EmailVerification.createEmailVerificationToken(userId, "test@gmail.com");

        await EmailVerification.revokeEmailVerificationTokens(userId, "test@gmail.com");

        {
            let response = await EmailVerification.verifyEmailUsingToken(verifyToken.token);
            assert.equal(response.status, "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR");
        }
    });

    it("test the generate token api with valid input, verify and then unverify email", async function () {
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
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
                EmailVerification.init({ mode: "OPTIONAL" }),
            ],
        });

        let apiVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion();
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userId = JSON.parse(response.text).user.id;
        let emailId = JSON.parse(response.text).user.emails[0];
        let infoFromResponse = extractInfoFromResponse(response);

        const verifyToken = await EmailVerification.createEmailVerificationToken(userId, emailId);

        await EmailVerification.verifyEmailUsingToken(verifyToken.token);

        assert(await EmailVerification.isEmailVerified(userId, emailId));

        await EmailVerification.unverifyEmail(userId, emailId);

        assert(!(await EmailVerification.isEmailVerified(userId, emailId)));
    });

    it("test the email verify API with deleted user", async function () {
        await startST();

        let token = null;
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
                EmailPassword.init(),
                EmailVerification.init({
                    mode: "OPTIONAL",
                    createAndSendCustomEmail: (user, emailVerificationURLWithToken) => {
                        token = emailVerificationURLWithToken.split("?token=")[1].split("&rid=")[0];
                    },
                }),
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        const querier = Querier.getNewInstanceOrThrowError(undefined);
        const apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.10") !== apiVersion) {
            return this.skip();
        }

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert.strictEqual(response.body.status, "OK");
        assert.strictEqual(response.status, 200);

        let userId = response.body.user.id;
        let infoFromResponse = extractInfoFromResponse(response);
        await STExpress.deleteUser(userId);
        response = await emailVerifyTokenRequest(app, infoFromResponse.accessToken, infoFromResponse.antiCsrf, userId);
        assert.strictEqual(response.statusCode, 401);
        assert.deepStrictEqual(response.body, { message: "unauthorised" });
    });

    it("test that generate email verification token API updates session claims", async function () {
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
                EmailPassword.init(),
                EmailVerification.init({
                    mode: "OPTIONAL",
                    createAndSendCustomEmail: (user, emailVerificationURLWithToken) => {},
                }),
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        const querier = Querier.getNewInstanceOrThrowError(undefined);
        const apiVersion = await querier.getAPIVersion();
        if (maxVersion(apiVersion, "2.10") !== apiVersion) {
            return this.skip();
        }

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert.strictEqual(response.body.status, "OK");
        assert.strictEqual(response.status, 200);

        let userId = response.body.user.id;
        let emailId = response.body.user.emails[0];
        let infoFromResponse = extractInfoFromResponse(response);
        let antiCsrfToken = infoFromResponse.antiCsrf;
        let token = await EmailVerification.createEmailVerificationToken(userId, emailId);
        await EmailVerification.verifyEmailUsingToken(token.token);
        response = await emailVerifyTokenRequest(app, infoFromResponse.accessToken, antiCsrfToken, userId);
        infoFromResponse = extractInfoFromResponse(response);
        assert.strictEqual(response.statusCode, 200);
        assert.deepStrictEqual(response.body.status, "EMAIL_ALREADY_VERIFIED_ERROR");
        let frontendInfo = JSON.parse(new Buffer.from(infoFromResponse.frontToken, "base64").toString());
        assert.strictEqual(frontendInfo.up["st-ev"].v, true);

        // calling the API again should not modify the access token again
        response = await emailVerifyTokenRequest(app, infoFromResponse.accessToken, antiCsrfToken, userId);
        let infoFromResponse2 = extractInfoFromResponse(response);
        assert.strictEqual(response.statusCode, 200);
        assert.deepStrictEqual(response.body.status, "EMAIL_ALREADY_VERIFIED_ERROR");
        assert.strictEqual(infoFromResponse2.frontToken, undefined);

        // now we mark the email as unverified and try again
        await EmailVerification.unverifyEmail(userId, emailId);
        response = await emailVerifyTokenRequest(app, infoFromResponse.accessToken, antiCsrfToken, userId);
        infoFromResponse = extractInfoFromResponse(response);
        assert.strictEqual(response.statusCode, 200);
        assert.deepStrictEqual(response.body.status, "OK");
        frontendInfo = JSON.parse(new Buffer.from(infoFromResponse.frontToken, "base64").toString());
        assert.strictEqual(frontendInfo.up["st-ev"].v, false);

        // calling the API again should not modify the access token again
        response = await emailVerifyTokenRequest(app, infoFromResponse.accessToken, antiCsrfToken, userId);
        infoFromResponse2 = extractInfoFromResponse(response);
        assert.strictEqual(response.statusCode, 200);
        assert.deepStrictEqual(response.body.status, "OK");
        assert.strictEqual(infoFromResponse2.frontToken, undefined);
    });
});
