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
let ThirdPartyEmailPassword = require("../../recipe/thirdpartyemailpassword");
const express = require("express");
const request = require("supertest");

describe(`emailverify: ${printPath("[test/thirdpartyemailpassword/emailverify.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

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
                ThirdPartyEmailPassword.init(),
                Session.init({
                    enableAntiCsrf: true,
                }),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userId = JSON.parse(response.text).user.id;
        let infoFromResponse = extractInfoFromResponse(response);

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
                ThirdPartyEmailPassword.init(),
                Session.init({
                    enableAntiCsrf: true,
                }),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userId = JSON.parse(response.text).user.id;
        let infoFromResponse = extractInfoFromResponse(response);

        let verifyToken = await ThirdPartyEmailPassword.createEmailVerificationToken(userId);
        await ThirdPartyEmailPassword.verifyEmailUsingToken(verifyToken);

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
                ThirdPartyEmailPassword.init(),
                Session.init({
                    enableAntiCsrf: true,
                }),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

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
                ThirdPartyEmailPassword.init({
                    emailVerificationFeature: {
                        createAndSendCustomEmail: (user, emailVerificationURLWithToken) => {
                            userInfo = user;
                            emailToken = emailVerificationURLWithToken;
                        },
                    },
                }),
                Session.init({
                    enableAntiCsrf: true,
                }),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        let response = await signUPRequest(app, "test@gmail.com", "testPass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let userId = JSON.parse(response.text).user.id;
        let infoFromResponse = extractInfoFromResponse(response);

        let response2 = await emailVerifyTokenRequest(
            app,
            infoFromResponse.accessToken,
            infoFromResponse.idRefreshTokenFromCookie,
            infoFromResponse.antiCsrf,
            userId
        );

        assert(response2.status === 200);

        assert(JSON.parse(response2.text).status === "OK");
        assert(Object.keys(JSON.parse(response2.text)).length === 1);

        assert(userInfo.id === userId);
        assert(userInfo.email === "test@gmail.com");
        assert(emailToken !== null);
    });

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
                ThirdPartyEmailPassword.init(),
                Session.init({
                    enableAntiCsrf: true,
                }),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

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
});
