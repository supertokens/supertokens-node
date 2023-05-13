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
let STExpress = require("../../");
let Session = require("../../dist/recipe/session");
let SessionRecipe = require("../../dist/recipe/session/recipe").default;
let assert = require("assert");
let { ProcessState } = require("../../dist/processState");
let { normaliseURLPathOrThrowError } = require("../../dist/normalisedURLPath");
let { normaliseURLDomainOrThrowError } = require("../../dist/normalisedURLDomain");
let { normaliseSessionScopeOrThrowError } = require("../../dist/recipe/session/utils");
const { Querier } = require("../../dist/querier");
let EmailPassword = require("../../dist/recipe/emailpassword");
let EmailPasswordRecipe = require("../../dist/recipe/emailpassword/recipe").default;
let utils = require("../../dist/recipe/emailpassword/utils");
const express = require("express");
const request = require("supertest");
const { default: NormalisedURLPath } = require("../../dist/normalisedURLPath");
let { middleware, errorHandler } = require("../../dist/framework/express");

describe(`signoutFeature: ${printPath("[test/emailpassword/signoutFeature.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    // Test the default route and it should revoke the session (with clearing the cookies)
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
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let res = extractInfoFromResponse(response);

        let response2 = extractInfoFromResponse(
            await new Promise((resolve) =>
                request(app)
                    .post("/auth/signout")
                    .set("Cookie", ["sAccessToken=" + res.accessToken])
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
        assert.strictEqual(response2.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(response2.refreshTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
        assert.strictEqual(response2.accessTokenDomain, undefined);
        assert.strictEqual(response2.refreshTokenDomain, undefined);
        assert.strictEqual(response2.frontToken, "remove");
    });

    // Disable default route and test that that API returns 404
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
                EmailPassword.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signOutPOST: undefined,
                            };
                        },
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "cookie" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve) =>
            request(app)
                .post("/auth/signout")
                .set("rid", "emailpassword")
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(response.status === 404);
    });

    // Call the API without a session and it should return "OK"
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
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await new Promise((resolve, reject) =>
            request(app)
                .post("/auth/signout")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);
        assert(response.header["set-cookie"] === undefined);
    });

    //Call the API with an expired access token, refresh, and call the API again to get OK and clear cookies
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
                EmailPassword.init(),
                Session.init({ getTokenTransferMethod: () => "cookie", antiCsrf: "VIA_TOKEN" }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.use(errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let res = extractInfoFromResponse(response);

        await new Promise((r) => setTimeout(r, 5000));

        let signOutResponse = await new Promise((resolve) =>
            request(app)
                .post("/auth/signout")
                .set("rid", "session")
                .set("Cookie", ["sAccessToken=" + res.accessToken])
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
                    .set("Cookie", ["sRefreshToken=" + res.refreshToken])
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
                    .set("rid", "session")
                    .set("Cookie", ["sAccessToken=" + refreshedResponse.accessToken])
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

        assert(signOutResponse.antiCsrf === undefined);
        assert(signOutResponse.accessToken === "");
        assert(signOutResponse.refreshToken === "");
        assert(signOutResponse.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(signOutResponse.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(signOutResponse.accessTokenDomain === undefined);
        assert(signOutResponse.refreshTokenDomain === undefined);
    });
});
