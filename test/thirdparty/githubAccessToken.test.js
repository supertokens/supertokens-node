/* Copyright (c) 2026, VRAI Labs and/or its affiliates. All rights reserved.
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
const { printPath, createCoreApplication } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let nock = require("nock");
let { ProcessState } = require("../../lib/build/processState");
let ThirdParty = require("../../recipe/thirdparty");
let Session = require("../../recipe/session");
const express = require("express");
const request = require("supertest");
let { middleware, errorHandler } = require("../../framework/express");

const clientId = "github-client";
const clientSecret = "github-secret";

async function setup(providerConfig = {}) {
    const connectionURI = await createCoreApplication();
    STExpress.init({
        supertokens: {
            connectionURI,
        },
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            websiteDomain: "supertokens.io",
        },
        recipeList: [
            ThirdParty.init({
                signInAndUpFeature: {
                    providers: [
                        {
                            config: {
                                thirdPartyId: "github",
                                clients: [{ clientId, clientSecret }],
                                ...providerConfig,
                            },
                        },
                    ],
                },
            }),
            Session.init({ getTokenTransferMethod: () => "header" }),
        ],
    });

    const app = express();
    app.use(middleware());
    app.use(errorHandler());
    return app;
}

function mockTokenCheck(status, body) {
    let calledWith;
    // GitHub's token check API only accepts a JSON body (it answers others with 400 "Problems parsing JSON")
    const scope = nock("https://api.github.com", { reqheaders: { "content-type": /^application\/json/ } })
        .post(`/applications/${clientId}/token`, (reqBody) => {
            calledWith = reqBody;
            return true;
        })
        .reply(status, body);
    return { scope, getCalledWith: () => calledWith };
}

function mockUserInfo() {
    return nock("https://api.github.com")
        .get("/user/emails")
        .reply(200, [{ email: "gh-user@example.com", primary: true, verified: true }])
        .get("/user")
        .reply(200, { id: 4242 });
}

function signInUp(app) {
    return request(app)
        .post("/auth/signinup")
        .send({ thirdPartyId: "github", oAuthTokens: { access_token: "gho_token" } });
}

async function getGithubUsers() {
    return STExpress.listUsersByAccountInfo("public", { thirdParty: { id: "github", userId: "4242" } });
}

describe(`GitHub provider access token validation: ${printPath(
    "[test/thirdparty/githubAccessToken.test.js]"
)}`, function () {
    beforeEach(function () {
        ProcessState.getInstance().reset();
        nock.cleanAll();
    });

    afterEach(function () {
        nock.cleanAll();
    });

    it("rejects sign in if the token check rejects the access token", async function () {
        const app = await setup();
        const tokenCheck = mockTokenCheck(404, { message: "Not Found" });
        mockUserInfo();

        const res = await signInUp(app);

        assert(tokenCheck.scope.isDone());
        assert.strictEqual(tokenCheck.getCalledWith().access_token, "gho_token");
        assert.notStrictEqual(res.body.status, "OK");
        assert.strictEqual((await getGithubUsers()).length, 0);
    });

    it("rejects sign in if the access token belongs to another application", async function () {
        const app = await setup();
        mockTokenCheck(200, { app: { client_id: "some-other-client" } });
        mockUserInfo();

        const res = await signInUp(app);

        assert.notStrictEqual(res.body.status, "OK");
        assert.strictEqual((await getGithubUsers()).length, 0);
    });

    it("signs in if the token check accepts the access token", async function () {
        const app = await setup();
        const tokenCheck = mockTokenCheck(200, { app: { client_id: clientId } });
        const userInfo = mockUserInfo();

        const res = await signInUp(app);

        assert(tokenCheck.scope.isDone());
        assert(userInfo.isDone());
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.status, "OK");
        assert.strictEqual((await getGithubUsers()).length, 1);
    });

    it("uses a custom validateAccessToken that rejects the token", async function () {
        let calledWith;
        const app = await setup({
            validateAccessToken: async (input) => {
                calledWith = input;
                throw new Error("token rejected");
            },
        });
        mockUserInfo();

        const res = await signInUp(app);

        assert.strictEqual(calledWith.accessToken, "gho_token");
        assert.strictEqual(calledWith.clientConfig.clientId, clientId);
        assert.notStrictEqual(calledWith.userContext, undefined);
        assert.notStrictEqual(res.body.status, "OK");
        assert.strictEqual((await getGithubUsers()).length, 0);
    });

    it("uses a custom validateAccessToken that accepts the token", async function () {
        let called = false;
        const app = await setup({
            validateAccessToken: async () => {
                called = true;
            },
        });
        mockUserInfo();

        const res = await signInUp(app);

        assert(called);
        assert.strictEqual(res.body.status, "OK");
        assert.strictEqual((await getGithubUsers()).length, 1);
    });
    describe("token check errors", function () {
        async function getUserInfo() {
            const provider = await ThirdParty.getProvider("public", "github");
            return provider.getUserInfo({ oAuthTokens: { access_token: "gho_token" }, userContext: {} });
        }

        it("reports an invalid access token", async function () {
            await setup();
            mockTokenCheck(404, { message: "Not Found" });

            await assert.rejects(getUserInfo(), /Invalid access token/);
        });

        it("reports rejected client credentials separately from an invalid access token", async function () {
            await setup();
            mockTokenCheck(401, { message: "Bad credentials" });

            await assert.rejects(getUserInfo(), /client credentials/);
        });

        it("reports a missing clientSecret without calling GitHub", async function () {
            await setup({ clients: [{ clientId }] });
            const tokenCheck = mockTokenCheck(200, { app: { client_id: clientId } });

            await assert.rejects(getUserInfo(), /clientSecret/);
            assert.strictEqual(tokenCheck.scope.isDone(), false);
        });
    });
});
