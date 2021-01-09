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
} = require("../utils");
let STExpress = require("../..");
let Session = require("../../recipe/session");
let SessionRecipe = require("../../lib/build/recipe/session/sessionRecipe").default;
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let { normaliseURLPathOrThrowError } = require("../../lib/build/normalisedURLPath");
let { normaliseURLDomainOrThrowError } = require("../../lib/build/normalisedURLDomain");
let { normaliseSessionScopeOrThrowError } = require("../../lib/build/recipe/session/utils");
const { Querier } = require("../../lib/build/querier");
let EmailPassword = require("../../recipe/emailpassword");
let EmailPasswordRecipe = require("../../lib/build/recipe/emailpassword/recipe").default;
let generatePasswordResetToken = require("../../lib/build/recipe/emailpassword/api/generatePasswordResetToken").default;
let passwordReset = require("../../lib/build/recipe/emailpassword/api/passwordReset").default;
const express = require("express");
const request = require("supertest");

/**
 * TODO: (later) in emailVerificationFunctions.ts:
 *        - (later) check that getEmailVerificationURL works fine
 *        - (later) check that createAndSendCustomEmail works fine
 * TODO: generate token API:
 *        - Call the API with valid input, email not verified
 *        - Call the API with valid input, email verified and test error
 *        - Call the API with no session and see the output (should be 401)
 *        - Call the API with an expired access token and see that try refresh token is returned
 *        - Provide your own email callback and make sure that is called
 * TODO: email verify API:
 *        POST:
 *          - Call the API with valid input
 *          - Call the API with an invalid token and see the error
 *          - token is not of type string from input
 *          - provide a handlePostEmailVerification callback and make sure it's called on success verification
 *        GET:
 *          - Call the API with valid input
 *          - Call the API with no session and see the error
 *          - Call the API with an expired access token and see that try refresh token is returned
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
            recipeList: [EmailPassword.init(), Session.init()],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userId = JSON.parse(response.text).user.id;
        let infoFromResponse = extractInfoFromResponse(response);

        response = await new Promise((resolve) =>
            request(app)
                .post("/auth/user/email/verify/token")
                .set("Cookie", [
                    "sAccessToken=" +
                    infoFromResponse.accessToken +
                    ";sIdRefreshToken=" +
                    infoFromResponse.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", infoFromResponse.antiCsrf)
                .send({
                    userId,
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
            recipeList: [EmailPassword.init(), Session.init()],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userId = JSON.parse(response.text).user.id;
        let infoFromResponse = extractInfoFromResponse(response);

        let verifyToken = await EmailPassword.createEmailVerificationToken(userId);
        await EmailPassword.verifyEmailUsingToken(verifyToken);

        response = await new Promise((resolve) =>
            request(app)
                .post("/auth/user/email/verify/token")
                .set("Cookie", [
                    "sAccessToken=" +
                    infoFromResponse.accessToken +
                    ";sIdRefreshToken=" +
                    infoFromResponse.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", infoFromResponse.antiCsrf)
                .send({
                    userId,
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
        assert(JSON.parse(response.text).status === "EMAIL_ALREADY_VERIFIED_ERROR")
        assert(response.status === 200)
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
            recipeList: [EmailPassword.init(), Session.init()],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/user/email/verify/token")
                .set("Cookie", ["sAccessToken=" + "randmAccessToken" + ";sIdRefreshToken=" + "randomRefreshToken"])
                .set("anti-csrf", "randomAntiCsrf")
                .send({
                    userId: "randomUserId",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert(response.status === 401);
        assert(JSON.parse(response.text).message === "try refresh token");
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
            recipeList: [EmailPassword.init(), Session.init()],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userId = JSON.parse(response.text).user.id;
        let infoFromResponse = extractInfoFromResponse(response);

        await new Promise((r) => setTimeout(r, 5000));

        let response2 = await new Promise((resolve) =>
            request(app)
                .post("/auth/user/email/verify/token")
                .set("Cookie", [
                    "sAccessToken=" +
                    infoFromResponse.accessToken +
                    ";sIdRefreshToken=" +
                    infoFromResponse.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", infoFromResponse.antiCsrf)
                .send({
                    userId,
                })
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert(response2.status === 401);
        assert(JSON.parse(response2.text).message === "try refresh token");

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
        let response3 = await new Promise((resolve) =>
            request(app)
                .post("/auth/user/email/verify/token")
                .set("Cookie", [
                    "sAccessToken=" +
                    refreshedResponse.accessToken +
                    ";sIdRefreshToken=" +
                    refreshedResponse.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", refreshedResponse.antiCsrf)
                .send({
                    userId,
                })
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(response3.status === 200)
        assert(JSON.parse(response3.text).status === "OK")
    });

    // Provide your own email callback and make sure that is called
    it("test that providing your own email callback and make sure it is called", async function () {
        await startST();

        let userInfo = null
        let emailToken = null

        STExpress.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init({
                emailVerificationFeature: {
                    createAndSendCustomEmail: (user, emailVerificationURLWithToken) => {
                        userInfo = user
                        emailToken = emailVerificationURLWithToken
                    }
                }
            }), Session.init()],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userId = JSON.parse(response.text).user.id;
        let infoFromResponse = extractInfoFromResponse(response);


        let response2 = await new Promise((resolve) =>
            request(app)
                .post("/auth/user/email/verify/token")
                .set("Cookie", [
                    "sAccessToken=" +
                    infoFromResponse.accessToken +
                    ";sIdRefreshToken=" +
                    infoFromResponse.idRefreshTokenFromCookie,
                ])
                .set("anti-csrf", infoFromResponse.antiCsrf)
                .send({
                    userId,
                })
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(response2.status === 200)
        assert(userInfo.id === userId)
        assert(userInfo.email === "test@gmail.com")
        assert(emailToken !== null)
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

});
