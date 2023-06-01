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
    extractInfoFromResponse,
} = require("../utils");
let supertokens = require("../../");
let Session = require("../../recipe/session");
let assert = require("assert");
let { AccountLinkingClaim } = require("../../recipe/accountlinking");
let AccountLinking = require("../../recipe/accountlinking").default;
let { ProcessState } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");
const express = require("express");
const request = require("supertest");
let { middleware, errorHandler } = require("../../framework/express");

describe(`sessionTests: ${printPath("[test/accountlinking/session.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("createNewSessionWithoutRequestResponse tests", function () {
        it("create new session with no linked accounts should have same user id and recipe id", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            assert(session.getUserId() === session.getRecipeUserId().getAsString());
        });

        it("create new session with linked accounts should have different user id and recipe id", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let epUser2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;

            await AccountLinking.linkAccounts(epUser2.loginMethods[0].recipeUserId, epUser.id);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser2.loginMethods[0].recipeUserId);

            assert(session.getUserId() !== session.getRecipeUserId().getAsString());
            assert(session.getUserId() === epUser.id);
            assert(session.getRecipeUserId().getAsString() === epUser2.id);
        });

        it("create new session with no linked and no auth recipe accounts should have same user id and recipe id", async function () {
            await startST();
            supertokens.init({
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

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId("random")
            );

            assert(session.getUserId() === session.getRecipeUserId().getAsString());
            assert(session.getUserId() === "random");
        });
    });

    describe("createNewSession tests", function () {
        it("create new session with no linked accounts should have same user id and recipe id", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

            const app = express();

            app.use(middleware());

            app.post("/create", async (req, res) => {
                await Session.createNewSession(req, res, epUser.loginMethods[0].recipeUserId, {}, {});
                res.status(200).send("");
            });

            app.use(errorHandler());

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

            let tokens = extractInfoFromResponse(res);
            assert(tokens.accessTokenFromAny !== undefined);

            let session = await Session.getSessionWithoutRequestResponse(tokens.accessTokenFromAny);

            assert(session.getUserId() === session.getRecipeUserId().getAsString());
        });

        it("create new session with linked accounts should have different user id and recipe id", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let epUser2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;

            await AccountLinking.linkAccounts(epUser2.loginMethods[0].recipeUserId, epUser.id);

            const app = express();

            app.use(middleware());

            app.post("/create", async (req, res) => {
                await Session.createNewSession(req, res, epUser2.loginMethods[0].recipeUserId, {}, {});
                res.status(200).send("");
            });

            app.use(errorHandler());

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

            let tokens = extractInfoFromResponse(res);
            assert(tokens.accessTokenFromAny !== undefined);

            let session = await Session.getSessionWithoutRequestResponse(tokens.accessTokenFromAny);

            assert(session.getUserId() !== session.getRecipeUserId().getAsString());
            assert(session.getUserId() === epUser.id);
            assert(session.getRecipeUserId().getAsString() === epUser2.id);
        });

        it("create new session with no linked accounts and no auth recipe should have same user id and recipe id", async function () {
            await startST();
            supertokens.init({
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

            app.use(middleware());

            app.post("/create", async (req, res) => {
                await Session.createNewSession(req, res, supertokens.convertToRecipeUserId("random"), {}, {});
                res.status(200).send("");
            });

            app.use(errorHandler());

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

            let tokens = extractInfoFromResponse(res);
            assert(tokens.accessTokenFromAny !== undefined);

            let session = await Session.getSessionWithoutRequestResponse(tokens.accessTokenFromAny);

            assert(session.getUserId() === session.getRecipeUserId().getAsString());
            assert(session.getUserId() === "random");
        });
    });

    describe("getSessionWithoutRequestResponse tests", function () {
        it("getSessionWithoutRequestResponse with no linked accounts should have same user id and recipe id", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            session = await Session.getSessionWithoutRequestResponse(session.getAccessToken());

            assert(session.getUserId() === session.getRecipeUserId().getAsString());
        });

        it("getSessionWithoutRequestResponse with linked accounts should have different user id and recipe id", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let epUser2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;

            await AccountLinking.linkAccounts(epUser2.loginMethods[0].recipeUserId, epUser.id);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser2.loginMethods[0].recipeUserId);

            session = await Session.getSessionWithoutRequestResponse(session.getAccessToken());

            assert(session.getUserId() !== session.getRecipeUserId().getAsString());
            assert(session.getUserId() === epUser.id);
            assert(session.getRecipeUserId().getAsString() === epUser2.id);
        });

        it("getSessionWithoutRequestResponse with no linked and no auth recipe accounts should have same user id and recipe id", async function () {
            await startST();
            supertokens.init({
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

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId("random")
            );

            session = await Session.getSessionWithoutRequestResponse(session.getAccessToken());

            assert(session.getUserId() === session.getRecipeUserId().getAsString());
            assert(session.getUserId() === "random");
        });

        it("getSessionWithoutRequestResponse with no linked accounts should have same user id and recipe id, with check db", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            session = await Session.getSessionWithoutRequestResponse(session.getAccessToken(), undefined, {
                checkDatabase: true,
            });

            assert(session.getUserId() === session.getRecipeUserId().getAsString());
        });

        it("getSessionWithoutRequestResponse with linked accounts should have different user id and recipe id", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let epUser2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;

            await AccountLinking.linkAccounts(epUser2.loginMethods[0].recipeUserId, epUser.id);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser2.loginMethods[0].recipeUserId);

            session = await Session.getSessionWithoutRequestResponse(session.getAccessToken(), undefined, {
                checkDatabase: true,
            });

            assert(session.getUserId() !== session.getRecipeUserId().getAsString());
            assert(session.getUserId() === epUser.id);
            assert(session.getRecipeUserId().getAsString() === epUser2.id);
        });

        it("getSessionWithoutRequestResponse with no linked and no auth recipe accounts should have same user id and recipe id", async function () {
            await startST();
            supertokens.init({
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

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId("random")
            );

            session = await Session.getSessionWithoutRequestResponse(session.getAccessToken(), undefined, {
                checkDatabase: true,
            });

            assert(session.getUserId() === session.getRecipeUserId().getAsString());
            assert(session.getUserId() === "random");
        });
    });

    describe("getSession tests", function () {
        it("get session with no linked accounts should have same user id and recipe id", async function () {
            await startST();
            let userId = undefined;
            let recipeUserId = undefined;
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

            let session = await Session.createNewSessionWithoutRequestResponse(
                epUser.loginMethods[0].recipeUserId,
                {},
                {}
            );

            const app = express();

            app.use(middleware());

            app.post("/getsession", async (req, res) => {
                let session = await Session.getSession(req, res);
                userId = session.getUserId();
                recipeUserId = session.getRecipeUserId().getAsString();
                res.status(200).send("");
            });

            app.use(errorHandler());

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/getsession")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(userId === recipeUserId && userId !== undefined);
        });

        it("get session with linked accounts should have different user id and recipe id", async function () {
            await startST();
            let userId = undefined;
            let recipeUserId = undefined;
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let epUser2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;

            await AccountLinking.linkAccounts(epUser2.loginMethods[0].recipeUserId, epUser.id);

            let session = await Session.createNewSessionWithoutRequestResponse(
                epUser2.loginMethods[0].recipeUserId,
                {},
                {}
            );

            const app = express();

            app.use(middleware());

            app.post("/getsession", async (req, res) => {
                let session = await Session.getSession(req, res);
                userId = session.getUserId();
                recipeUserId = session.getRecipeUserId().getAsString();
                res.status(200).send("");
            });

            app.use(errorHandler());

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/getsession")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(userId !== recipeUserId);
            assert(userId === epUser.id);
            assert(recipeUserId === epUser2.id);
        });

        it("get session with no linked accounts and no auth recipe should have same user id and recipe id", async function () {
            await startST();
            let userId = undefined;
            let recipeUserId = undefined;
            supertokens.init({
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

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId("random"),
                {},
                {}
            );

            const app = express();

            app.use(middleware());

            app.post("/getsession", async (req, res) => {
                let session = await Session.getSession(req, res);
                userId = session.getUserId();
                recipeUserId = session.getRecipeUserId().getAsString();
                res.status(200).send("");
            });

            app.use(errorHandler());

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/getsession")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert(userId === recipeUserId && userId !== undefined);
            assert(userId === "random");
        });
    });

    describe("getSessionInformation tests", function () {
        it("getSessionInformation with no linked accounts should have same user id and recipe id", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            info = await Session.getSessionInformation(session.getHandle());

            assert(info.userId === info.recipeUserId.getAsString());
        });

        it("getSessionInformation with linked accounts should have different user id and recipe id", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let epUser2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;

            await AccountLinking.linkAccounts(epUser2.loginMethods[0].recipeUserId, epUser.id);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser2.loginMethods[0].recipeUserId);

            info = await Session.getSessionInformation(session.getHandle());

            assert(info.userId !== info.recipeUserId.getAsString());
            assert(session.userId === epUser.id);
            assert(session.recipeUserId.getAsString() === epUser2.id);
        });

        it("getSessionInformation with no linked and no auth recipe accounts should have same user id and recipe id", async function () {
            await startST();
            supertokens.init({
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

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId("random")
            );

            info = await Session.getSessionInformation(session.getHandle());

            assert(info.userId === info.recipeUserId.getAsString());
            assert(session.userId === "random");
        });
    });

    describe("refreshSessionWithoutRequestResponse tests", function () {
        it("refreshSessionWithoutRequestResponse with no linked accounts should have same user id and recipe id", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;

            let session = await Session.createNewSessionWithoutRequestResponse(epUser.loginMethods[0].recipeUserId);

            session = await Session.refreshSessionWithoutRequestResponse(
                session.getAllSessionTokensDangerously().refreshToken
            );

            assert(session.getUserId() === session.getRecipeUserId().getAsString());
        });

        it("refreshSessionWithoutRequestResponse with linked accounts should have different user id and recipe id", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let epUser2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;

            await AccountLinking.linkAccounts(epUser2.loginMethods[0].recipeUserId, epUser.id);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser2.loginMethods[0].recipeUserId);

            session = await Session.refreshSessionWithoutRequestResponse(
                session.getAllSessionTokensDangerously().refreshToken
            );

            assert(session.getUserId() !== session.getRecipeUserId().getAsString());
            assert(session.getUserId() === epUser.id);
            assert(session.getRecipeUserId().getAsString() === epUser2.id);
        });

        it("refreshSessionWithoutRequestResponse with no linked and no auth recipe accounts should have same user id and recipe id", async function () {
            await startST();
            supertokens.init({
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

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId("random")
            );

            session = await Session.refreshSessionWithoutRequestResponse(
                session.getAllSessionTokensDangerously().refreshToken
            );

            assert(session.getUserId() === session.getRecipeUserId().getAsString());
            assert(session.getUserId() === "random");
        });

        it("refreshSessionWithoutRequestResponse with token theft uses the right recipe user id and session user id", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let epUser2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;

            await AccountLinking.linkAccounts(epUser2.loginMethods[0].recipeUserId, epUser.id);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser2.loginMethods[0].recipeUserId);

            let refreshToken = session.getAllSessionTokensDangerously().refreshToken;

            session = await Session.refreshSessionWithoutRequestResponse(refreshToken);

            await Session.getSessionWithoutRequestResponse(session.getAccessToken());

            try {
                await Session.refreshSessionWithoutRequestResponse(refreshToken);
                assert(fail);
            } catch (err) {
                assert(err.type === "TOKEN_THEFT_DETECTED");
                assert(err.payload.recipeUserId.getAsString() === epUser2.loginMethods[0].recipeUserId.getAsString());
                assert(err.payload.userId === epUser.id);
            }
        });
    });

    describe("refreshSession tests", function () {
        it("refreshSession with linked accounts should have different user id and recipe id", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let epUser2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;

            await AccountLinking.linkAccounts(epUser2.loginMethods[0].recipeUserId, epUser.id);

            let session = await Session.createNewSessionWithoutRequestResponse(epUser2.loginMethods[0].recipeUserId);

            const app = express();

            app.use(middleware());

            app.post("/refreshsession", async (req, res) => {
                let session = await Session.refreshSession(req, res);
                userId = session.getUserId();
                recipeUserId = session.getRecipeUserId().getAsString();
                res.status(200).send("");
            });

            app.use(errorHandler());

            let res = await new Promise((resolve) =>
                request(app)
                    .post("/refreshsession")
                    .set("Cookie", ["sRefreshToken=" + session.getAllSessionTokensDangerously().refreshToken])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            session = await Session.refreshSessionWithoutRequestResponse(
                session.getAllSessionTokensDangerously().refreshToken
            );

            assert(session.getUserId() !== session.getRecipeUserId().getAsString());
            assert(session.getUserId() === epUser.id);
            assert(session.getRecipeUserId().getAsString() === epUser2.id);
        });
    });

    describe("revokeAllSessionsForUser test", function () {
        it("revokeAllSessionsForUser with linked accounts should delete all the sessions if revokeSessionsForLinkedAccounts is true", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let epUser2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;

            await AccountLinking.linkAccounts(epUser2.loginMethods[0].recipeUserId, epUser.id);

            let epuser2session = await Session.createNewSessionWithoutRequestResponse(
                epUser2.loginMethods[0].recipeUserId
            );

            let epuser1session = await Session.createNewSessionWithoutRequestResponse(
                epUser.loginMethods[0].recipeUserId
            );

            let result = await Session.revokeAllSessionsForUser(epUser2.id);
            assert(result.length === 2);

            assert((await Session.getSessionInformation(epuser2session.getHandle())) === undefined);
            assert((await Session.getSessionInformation(epuser1session.getHandle())) === undefined);
        });

        it("revokeAllSessionsForUser with linked accounts should delete only specific account's sessions if revokeSessionsForLinkedAccounts is false", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let epUser2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;

            await AccountLinking.linkAccounts(epUser2.loginMethods[0].recipeUserId, epUser.id);

            let epuser2session = await Session.createNewSessionWithoutRequestResponse(
                epUser2.loginMethods[0].recipeUserId
            );

            let epuser1session = await Session.createNewSessionWithoutRequestResponse(
                epUser.loginMethods[0].recipeUserId
            );

            let result = await Session.revokeAllSessionsForUser(epUser2.id, false);
            assert(result.length === 1);

            assert((await Session.getSessionInformation(epuser2session.getHandle())) === undefined);
            assert((await Session.getSessionInformation(epuser1session.getHandle())) !== undefined);
        });

        it("revokeAllSessionsForUser with linked accounts should delete only the primary user's session if that id is passed and if revokeSessionsForLinkedAccounts is false", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let epUser2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;

            await AccountLinking.linkAccounts(epUser2.loginMethods[0].recipeUserId, epUser.id);

            let epuser2session = await Session.createNewSessionWithoutRequestResponse(
                epUser2.loginMethods[0].recipeUserId
            );

            let epuser1session = await Session.createNewSessionWithoutRequestResponse(
                epUser.loginMethods[0].recipeUserId
            );

            let result = await Session.revokeAllSessionsForUser(epUser.id, false);
            assert(result.length === 1);

            assert((await Session.getSessionInformation(epuser2session.getHandle())) !== undefined);
            assert((await Session.getSessionInformation(epuser1session.getHandle())) === undefined);
        });
    });

    describe("getAllSessionHandlesForUser test", function () {
        it("getAllSessionHandlesForUser with linked accounts should return all the sessions if fetchSessionsForAllLinkedAccounts is true", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let epUser2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;

            await AccountLinking.linkAccounts(epUser2.loginMethods[0].recipeUserId, epUser.id);

            let epuser2session = await Session.createNewSessionWithoutRequestResponse(
                epUser2.loginMethods[0].recipeUserId
            );

            let epuser1session = await Session.createNewSessionWithoutRequestResponse(
                epUser.loginMethods[0].recipeUserId
            );

            let result = await Session.getAllSessionHandlesForUser(epUser2.id);
            assert(result.length === 2);

            assert(result[0] === epuser2session.getHandle());
            assert(result[1] === epuser1session.getHandle());
        });

        it("getAllSessionHandlesForUser with linked accounts should return only specific account's sessions if fetchSessionsForAllLinkedAccounts is false", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let epUser2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;

            await AccountLinking.linkAccounts(epUser2.loginMethods[0].recipeUserId, epUser.id);

            let epuser2session = await Session.createNewSessionWithoutRequestResponse(
                epUser2.loginMethods[0].recipeUserId
            );

            let epuser1session = await Session.createNewSessionWithoutRequestResponse(
                epUser.loginMethods[0].recipeUserId
            );

            let result = await Session.getAllSessionHandlesForUser(epUser2.id, false);
            assert(result.length === 1);

            assert(result[0] === epuser2session.getHandle());
        });

        it("getAllSessionHandlesForUser with linked accounts should return only the primary user's session if that id is passed and if fetchSessionsForAllLinkedAccounts is false", async function () {
            await startST();
            supertokens.init({
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

            let epUser = (await EmailPassword.signUp("test@example.com", "password123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            let epUser2 = (await EmailPassword.signUp("test2@example.com", "password123")).user;

            await AccountLinking.linkAccounts(epUser2.loginMethods[0].recipeUserId, epUser.id);

            let epuser2session = await Session.createNewSessionWithoutRequestResponse(
                epUser2.loginMethods[0].recipeUserId
            );

            let epuser1session = await Session.createNewSessionWithoutRequestResponse(
                epUser.loginMethods[0].recipeUserId
            );

            let result = await Session.getAllSessionHandlesForUser(epUser.id, false);
            assert(result.length === 1);

            assert(result[0] === epuser1session.getHandle());
        });
    });
});
