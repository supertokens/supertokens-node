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
    createServerlessCacheForTesting,
} = require("../utils");
let STExpress = require("../../");
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
let utils = require("../../lib/build/recipe/emailpassword/utils");
const express = require("express");
const request = require("supertest");
const { default: NormalisedURLPath } = require("../../lib/build/normalisedURLPath");
const { removeServerlessCache } = require("../../lib/build/utils");

describe(`signoutFeature: ${printPath("[test/emailpassword/signoutFeature.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        await createServerlessCacheForTesting();
        await removeServerlessCache();
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
                Session.init({
                    enableAntiCsrf: true,
                }),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let res = extractInfoFromResponse(response);

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
        assert(response2.antiCsrf === undefined);
        assert(response2.accessToken === "");
        assert(response2.refreshToken === "");
        assert(response2.idRefreshTokenFromHeader === "remove");
        assert(response2.idRefreshTokenFromCookie === "");
        assert(response2.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(response2.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(response2.idRefreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(response2.accessTokenDomain === undefined);
        assert(response2.refreshTokenDomain === undefined);
        assert(response2.idRefreshTokenDomain === undefined);
        assert(response2.frontToken === undefined);
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
                    signOutFeature: {
                        disableDefaultImplementation: true,
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
            recipeList: [EmailPassword.init(), Session.init()],
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
                Session.init({
                    enableAntiCsrf: true,
                }),
            ],
        });

        const app = express();

        app.use(STExpress.middleware());

        app.use(STExpress.errorHandler());

        let response = await signUPRequest(app, "random@gmail.com", "validpass123");
        assert(JSON.parse(response.text).status === "OK");
        assert(response.status === 200);

        let res = extractInfoFromResponse(response);

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
        assert(signOutResponse.status === 401);
        assert(JSON.parse(signOutResponse.text).message === "try refresh token");

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

        assert(signOutResponse.antiCsrf === undefined);
        assert(signOutResponse.accessToken === "");
        assert(signOutResponse.refreshToken === "");
        assert(signOutResponse.idRefreshTokenFromHeader === "remove");
        assert(signOutResponse.idRefreshTokenFromCookie === "");
        assert(signOutResponse.accessTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(signOutResponse.refreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(signOutResponse.idRefreshTokenExpiry === "Thu, 01 Jan 1970 00:00:00 GMT");
        assert(signOutResponse.accessTokenDomain === undefined);
        assert(signOutResponse.refreshTokenDomain === undefined);
        assert(signOutResponse.idRefreshTokenDomain === undefined);
    });
});
