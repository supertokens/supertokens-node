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
});
