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
const { printPath, setupST, startST, killAllST, cleanST, extractInfoFromResponse } = require("./utils");
let assert = require("assert");
let { Querier } = require("../lib/build/querier");
const express = require("express");
const request = require("supertest");
let { ProcessState } = require("../lib/build/processState");
let SuperTokens = require("../");
let Session = require("../recipe/session");
let { parseJWTWithoutSignatureVerification } = require("../lib/build/recipe/session/jwt");
let { middleware, errorHandler } = require("../framework/express");
const { default: NormalisedURLPath } = require("../lib/build/normalisedURLPath");
const { verifySession } = require("../recipe/session/framework/express");

describe(`AccessToken versions: ${printPath("[test/accessTokenVersions.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("we should create a V3 token", async function () {
        await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init()],
        });

        const app = getTestExpressApp();

        let res = await new Promise((resolve) =>
            request(app)
                .post("/create")
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );

        let cookies = extractInfoFromResponse(res);
        assert(cookies.accessTokenFromAny !== undefined);
        assert(cookies.refreshTokenFromAny !== undefined);
        assert(cookies.frontToken !== undefined);

        assert.strictEqual(parseJWTWithoutSignatureVerification(cookies.accessTokenFromAny).version, 3);
    });

    it("v2 tokens should still be valid", async function () {
        await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init()],
        });

        // This CDI version is no longer supported by this SDK, but we want to ensure that sessions keep working after the upgrade
        // We can hard-code the structure of the request&response, since this is a fixed CDI version and it's not going to change
        Querier.apiVersion = "2.18";
        const legacySessionResp = await Querier.getNewInstanceOrThrowError().sendPostRequest(
            new NormalisedURLPath("/recipe/session"),
            {
                userId: "test-user-id",
                enableAntiCsrf: false,
                userDataInJWT: {},
                userDataInDatabase: {},
            }
        );
        Querier.apiVersion = undefined;

        const legacyToken = legacySessionResp.accessToken.token;

        const app = getTestExpressApp();

        let res = await new Promise((resolve, reject) =>
            request(app)
                .get("/verify")
                .set("Authorization", `Bearer ${legacyToken}`)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                })
        );

        assert.deepStrictEqual(res.body, {
            message: true,
            sessionExists: true,
            sessionHandle: legacySessionResp.session.handle,
        });
    });

    it("legacy sessions should refresh to new version", async function () {
        await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI: "http://localhost:8080",
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [Session.init()],
        });

        // This CDI version is no longer supported by this SDK, but we want to ensure that sessions keep working after the upgrade
        // We can hard-code the structure of the request&response, since this is a fixed CDI version and it's not going to change
        Querier.apiVersion = "2.18";
        const legacySessionResp = await Querier.getNewInstanceOrThrowError().sendPostRequest(
            new NormalisedURLPath("/recipe/session"),
            {
                userId: "test-user-id",
                enableAntiCsrf: false,
                userDataInJWT: {},
                userDataInDatabase: {},
            }
        );
        Querier.apiVersion = undefined;

        const legacyRefreshToken = legacySessionResp.refreshToken.token;

        const app = getTestExpressApp();

        let res = await new Promise((resolve, reject) =>
            request(app)
                .post("/auth/session/refresh")
                .set("Authorization", `Bearer ${legacyRefreshToken}`)
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                })
        );

        let cookies = extractInfoFromResponse(res);
        assert(cookies.accessTokenFromAny !== undefined);
        assert(cookies.refreshTokenFromAny !== undefined);
        assert(cookies.frontToken !== undefined);

        assert.strictEqual(parseJWTWithoutSignatureVerification(cookies.accessTokenFromAny).version, 3);
    });
});

function getTestExpressApp() {
    const app = express();

    app.use(middleware());

    app.post("/create", async (req, res) => {
        await Session.createNewSession(req, res, "", {}, {});
        res.status(200).send("");
    });

    app.get("/update-payload", verifySession(), async (req, res) => {
        await req.session.mergeIntoAccessTokenPayload({ newValue: "test" });
        res.status(200).json({ message: true });
    });

    app.get("/verify", verifySession(), async (req, res) => {
        res.status(200).json({ message: true, sessionHandle: req.session.getHandle(), sessionExists: true });
    });

    app.get("/verify-optional", verifySession({ sessionRequired: false }), async (req, res) => {
        res.status(200).json({
            message: true,
            sessionHandle: req.session && req.session.getHandle(),
            sessionExists: !!req.session,
        });
    });

    app.use(errorHandler());
    return app;
}
