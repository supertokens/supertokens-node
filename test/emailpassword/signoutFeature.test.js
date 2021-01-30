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
} = require("../utils");
let STExpress = require("../../");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");
const express = require("express");
const request = require("supertest");

describe(`signoutFeature: ${printPath("[test/emailpassword/signoutFeature.test.js]")}`, function () {
    describe("With default implementation enabled", function () {
        let app, extractedSignUpInfo;

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

            const signUPResponse = await signUPRequest(app, "random@gmail.com", "validpass123");
            assert.deepStrictEqual(JSON.parse(signUPResponse.text).status, "OK");
            assert.deepStrictEqual(signUPResponse.status, 200);
            extractedSignUpInfo = extractInfoFromResponse(signUPResponse);
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        // Test the default route and it should revoke the session (with clearing the cookies)
        it("test the default route and it should revoke the session", async function () {
            const extractedSignOutInfo = extractInfoFromResponse(
                await new Promise((resolve) =>
                    request(app)
                        .post("/auth/signout")
                        .set("Cookie", [
                            "sAccessToken=" +
                                extractedSignUpInfo.accessToken +
                                ";sIdRefreshToken=" +
                                extractedSignUpInfo.idRefreshTokenFromCookie,
                        ])
                        .set("anti-csrf", extractedSignUpInfo.antiCsrf)
                        .expect(200)
                        .end((err, res) => {
                            assert.deepStrictEqual(err, null);
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                )
            );
            assert.deepStrictEqual(extractedSignOutInfo.antiCsrf, undefined);
            assert.deepStrictEqual(extractedSignOutInfo.accessToken, "");
            assert.deepStrictEqual(extractedSignOutInfo.refreshToken, "");
            assert.deepStrictEqual(extractedSignOutInfo.idRefreshTokenFromHeader, "remove");
            assert.deepStrictEqual(extractedSignOutInfo.idRefreshTokenFromCookie, "");
            assert.deepStrictEqual(extractedSignOutInfo.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
            assert.deepStrictEqual(extractedSignOutInfo.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
            assert.deepStrictEqual(extractedSignOutInfo.idRefreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
            assert.deepStrictEqual(extractedSignOutInfo.accessTokenDomain, undefined);
            assert.deepStrictEqual(extractedSignOutInfo.refreshTokenDomain, undefined);
            assert.deepStrictEqual(extractedSignOutInfo.idRefreshTokenDomain, undefined);
            assert.deepStrictEqual(extractedSignOutInfo.frontToken, undefined);
        });

        // Call the API without a session and it should return "OK"
        it("test that calling the API without a session should return OK", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signout")
                    .expect(200)
                    .end((err, res) => {
                        assert.deepStrictEqual(err, null);
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.deepStrictEqual(JSON.parse(response.text).status, "OK");
            assert.deepStrictEqual(response.status, 200);
            assert.deepStrictEqual(response.header["set-cookie"], undefined);
        });

        it("test that signout API returns try refresh token, refresh session and signout should return OK", async function () {
            // Sign In.
            const signInAPIResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signin")
                    .send({
                        formFields: [
                            {
                                id: "password",
                                value: "validpass123",
                            },
                            {
                                id: "email",
                                value: "random@gmail.com",
                            },
                        ],
                    })
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            const extractedSignInInfo = extractInfoFromResponse(signInAPIResponse);

            // Wait until token expiry.
            await new Promise((r) => setTimeout(r, 1100));

            let signOutResponse = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signout")
                    .set("Cookie", [
                        "sAccessToken=" +
                            extractedSignInInfo.accessToken +
                            ";sIdRefreshToken=" +
                            extractedSignInInfo.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", extractedSignInInfo.antiCsrf)
                    .end((err, res) => {
                        assert.deepStrictEqual(err, null);
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.deepStrictEqual(signOutResponse.status, 401);
            assert.deepStrictEqual(JSON.parse(signOutResponse.text).message, "try refresh token");

            const refreshedResponse = extractInfoFromResponse(
                await new Promise((resolve) =>
                    request(app)
                        .post("/auth/session/refresh")
                        .expect(200)
                        .set("Cookie", ["sRefreshToken=" + extractedSignInInfo.refreshToken])
                        .set("anti-csrf", extractedSignInInfo.antiCsrf)
                        .expect(200)
                        .end((err, res) => {
                            assert.deepStrictEqual(err, null);
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                )
            );

            signOutResponse = extractInfoFromResponse(
                await new Promise((resolve) =>
                    request(app)
                        .post("/auth/signout")
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
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                )
            );

            assert.deepStrictEqual(signOutResponse.antiCsrf, undefined);
            assert.deepStrictEqual(signOutResponse.accessToken, "");
            assert.deepStrictEqual(signOutResponse.refreshToken, "");
            assert.deepStrictEqual(signOutResponse.idRefreshTokenFromHeader, "remove");
            assert.deepStrictEqual(signOutResponse.idRefreshTokenFromCookie, "");
            assert.deepStrictEqual(signOutResponse.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
            assert.deepStrictEqual(signOutResponse.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
            assert.deepStrictEqual(signOutResponse.idRefreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
            assert.deepStrictEqual(signOutResponse.accessTokenDomain, undefined);
            assert.deepStrictEqual(signOutResponse.refreshTokenDomain, undefined);
            assert.deepStrictEqual(signOutResponse.idRefreshTokenDomain, undefined);
        });
    });

    describe("With default implementation disabled", function () {
        let app;

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
                recipeList: [
                    EmailPassword.init({
                        signOutFeature: {
                            disableDefaultImplementation: true,
                        },
                    }),
                    Session.init(),
                ],
            });

            app = express();
            app.use(STExpress.middleware());
            app.use(STExpress.errorHandler());
        });

        beforeEach(async function () {
            ProcessState.getInstance().reset();
        });

        after(async function () {
            await killAllST();
            await cleanST();
        });

        // Disable default route and test that that API returns 404
        it("test that disabling default route and calling the API returns 404", async function () {
            const response = await new Promise((resolve) =>
                request(app)
                    .post("/auth/signout")
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert.deepStrictEqual(response.status, 404);
        });
    });
});
