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
    extractInfoFromResponse,
    setKeyValueInConfig,
} = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirPartyRecipe = require("../../lib/build/recipe/thirdparty/recipe").default;
let nock = require("nock");
const express = require("express");
const request = require("supertest");
let Session = require("../../recipe/session");

describe(`signoutTest: ${printPath("[test/thirdparty/signoutFeature.test.js]")}`, function () {
    before(function () {
        this.customProvider1 = {
            id: "custom",
            get: async (recipe, authCode) => {
                return {
                    accessTokenAPI: {
                        url: "https://test.com/oauth/token",
                    },
                    authorisationRedirect: {
                        url: "https://test.com/oauth/auth",
                    },
                    getProfileInfo: async (authCodeResponse) => {
                        return {
                            id: "user",
                            email: {
                                id: "email@test.com",
                                isVerified: true,
                            },
                        };
                    },
                };
            },
        };
    });
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test the default route and it should revoke the session", async function () {
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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
                }),
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        nock("https://test.com").post("/oauth/token").reply(200, {});

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "abcdefghj",
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response1.body.status, "OK");
        assert.strictEqual(response1.statusCode, 200);

        let res = extractInfoFromResponse(response1);

        let response2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/auth/signout")
                    .set("Cookie", [
                        "sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res.antiCsrf)
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
        assert.strictEqual(response2.antiCsrf, undefined);
        assert.strictEqual(response2.accessToken, "");
        assert.strictEqual(response2.refreshToken, "");
        assert.strictEqual(response2.idRefreshTokenFromHeader, "remove");
        assert.strictEqual(response2.idRefreshTokenFromCookie, "");
        assert.strictEqual(response2.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(response2.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(response2.idRefreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(response2.accessTokenDomain, undefined);
        assert.strictEqual(response2.refreshTokenDomain, undefined);
        assert.strictEqual(response2.idRefreshTokenDomain, undefined);
        assert.strictEqual(response2.frontToken, undefined);
    });

    it("test that disabling default route and calling the API returns 404", async function () {
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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signOutPOST: undefined,
                            };
                        },
                    },
                }),
                Session.init(),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signout")
                .set("rid", "thirdparty")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response.statusCode, 404);
    });

    it("test that calling the API without a session should return OK", async function () {
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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
                }),
                Session.init(),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signout")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response.body.status, "OK");
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.header["set-cookie"], undefined);
    });

    it("test that signout API reutrns try refresh token, refresh session and signout should return OK", async function () {
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
                ThirPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [this.customProvider1],
                    },
                }),
                Session.init({
                    antiCsrf: "VIA_TOKEN",
                }),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        nock("https://test.com").post("/oauth/token").reply(200, {});

        let response1 = await new Promise((resolve) =>
            request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "custom",
                    code: "abcdefghj",
                    redirectURI: "http://127.0.0.1/callback",
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(response1.body.status, "OK");
        assert.strictEqual(response1.statusCode, 200);

        let res = extractInfoFromResponse(response1);

        await new Promise((r) => setTimeout(r, 5000));

        let signOutResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signout")
                .set("Cookie", ["sAccessToken=" + res.accessToken + ";sIdRefreshToken=" + res.idRefreshTokenFromCookie])
                .set("anti-csrf", res.antiCsrf)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.strictEqual(signOutResponse.status, 401);
        assert.strictEqual(signOutResponse.body.message, "try refresh token");

        let refreshedResponse = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/auth/session/refresh")
                    .expect(200)
                    .set("Cookie", [
                        "sRefreshToken=" + res.refreshToken,
                        "sIdRefreshToken=" + res.idRefreshTokenFromCookie,
                    ])
                    .set("anti-csrf", res.antiCsrf)
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

        assert.strictEqual(signOutResponse.antiCsrf, undefined);
        assert.strictEqual(signOutResponse.accessToken, "");
        assert.strictEqual(signOutResponse.refreshToken, "");
        assert.strictEqual(signOutResponse.idRefreshTokenFromHeader, "remove");
        assert.strictEqual(signOutResponse.idRefreshTokenFromCookie, "");
        assert.strictEqual(signOutResponse.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(signOutResponse.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(signOutResponse.idRefreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(signOutResponse.accessTokenDomain, undefined);
        assert.strictEqual(signOutResponse.refreshTokenDomain, undefined);
        assert.strictEqual(signOutResponse.idRefreshTokenDomain, undefined);
    });
});
