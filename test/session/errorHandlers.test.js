/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
let assert = require("assert");
const express = require("express");
const request = require("supertest");
let { ProcessState, PROCESS_STATE } = require("../../lib/build/processState");
let SuperTokens = require("../../");
let Session = require("../../recipe/session");
let { middleware, errorHandler } = require("../../framework/express");
const { default: SessionError } = require("../../lib/build/recipe/session/error");

describe(`errorHandlers: ${printPath("[test/errorHandlers.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("should override session errorHandlers", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                    antiCsrf: "VIA_TOKEN",
                    errorHandlers: {
                        onUnauthorised: async (message, req, res, userContext) => {
                            res.setStatusCode(401);
                            return res.sendJSONResponse({ message: "unauthorised from errorHandler" });
                        },
                        onTokenTheftDetected: async (sessionHandle, userId, recipeUserId, req, res, userContext) => {
                            res.setStatusCode(403);
                            return res.sendJSONResponse({ message: "token theft detected from errorHandler" });
                        },
                        onTryRefreshToken: async (message, req, res, userContext) => {
                            res.setStatusCode(401);
                            return res.sendJSONResponse({ message: "try refresh session from errorHandler" });
                        },
                        onInvalidClaim: async (message, req, res, userContext) => {
                            res.setStatusCode(403);
                            return res.sendJSONResponse({ message: "invalid claim from errorHandler" });
                        },
                        onClearDuplicateSessionCookies: async (message, req, res, userContext) => {
                            res.setStatusCode(200);
                            return res.sendJSONResponse({
                                message: "clear duplicate session cookies from errorHandler",
                            });
                        },
                    },
                }),
            ],
        });

        const app = express();

        app.use(middleware());

        app.post("/test/unauthorized", (req, res) => {
            throw new SessionError({ type: SessionError.UNAUTHORISED, message: "" });
        });

        app.post("/test/try-refresh", (req, res) => {
            throw new SessionError({ type: SessionError.TRY_REFRESH_TOKEN, message: "" });
        });

        app.post("/test/token-theft", (req, res) => {
            throw new SessionError({ type: SessionError.TOKEN_THEFT_DETECTED, message: "", payload: {} });
        });

        app.post("/test/claim-validation", (req, res) => {
            throw new SessionError({ type: SessionError.INVALID_CLAIMS, message: "", payload: [] });
        });

        app.post("/test/clear-duplicate-session", (req, res) => {
            throw new SessionError({ type: SessionError.CLEAR_DUPLICATE_SESSION_COOKIES, message: "" });
        });

        app.use(errorHandler());

        const res1 = await new Promise((resolve) =>
            request(app)
                .post("/test/unauthorized")
                .end((err, res) => {
                    resolve(res);
                })
        );

        assert.strictEqual(res1.status, 401);
        assert.deepStrictEqual(res1.text, '{"message":"unauthorised from errorHandler"}');

        const res2 = await new Promise((resolve) =>
            request(app)
                .post("/test/token-theft")
                .end((err, res) => {
                    resolve(res);
                })
        );

        assert.strictEqual(res2.status, 403);
        assert.deepStrictEqual(res2.text, '{"message":"token theft detected from errorHandler"}');

        const res3 = await new Promise((resolve) =>
            request(app)
                .post("/test/try-refresh")
                .end((err, res) => {
                    resolve(res);
                })
        );

        assert.strictEqual(res3.status, 401);
        assert.deepStrictEqual(res3.text, '{"message":"try refresh session from errorHandler"}');

        const res4 = await new Promise((resolve) =>
            request(app)
                .post("/test/claim-validation")
                .end((err, res) => {
                    resolve(res);
                })
        );

        assert.strictEqual(res4.status, 403);
        assert.deepStrictEqual(res4.text, '{"message":"invalid claim from errorHandler"}');

        const res5 = await new Promise((resolve) =>
            request(app)
                .post("/test/clear-duplicate-session")
                .end((err, res) => {
                    resolve(res);
                })
        );

        assert.strictEqual(res5.status, 200);
        assert.deepStrictEqual(res5.text, '{"message":"clear duplicate session cookies from errorHandler"}');
    });
});
