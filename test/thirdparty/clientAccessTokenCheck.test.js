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
const { findAndCreateProviderInstance } = require("../../lib/build/recipe/thirdparty/providers/configUtils");

// Providers are created the same way the sign in up API creates them: a new instance for every request.
// These tests don't call the core, so they only need the SDK to be initialised.
async function getProvider(config, clientType) {
    STExpress.init({
        supertokens: { connectionURI: "http://localhost:8080" },
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            websiteDomain: "supertokens.io",
        },
        recipeList: [ThirdParty.init()],
    });
    return findAndCreateProviderInstance("public", [{ config }], config.thirdPartyId, clientType, {});
}

function mockGoogleDiscovery() {
    return nock("https://accounts.google.com").persist().get("/.well-known/openid-configuration").reply(200, {
        issuer: "https://accounts.google.com",
        authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
        token_endpoint: "https://oauth2.googleapis.com/token",
        userinfo_endpoint: "https://openidconnect.googleapis.com/v1/userinfo",
        jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
    });
}

function mockGoogleTokenInfo(status, body) {
    let calledWith;
    const scope = nock("https://oauth2.googleapis.com")
        .post("/tokeninfo", (reqBody) => {
            calledWith = reqBody;
            return true;
        })
        .reply(status, body);
    return { scope, getCalledWith: () => calledWith };
}

function mockGoogleUserInfo() {
    return nock("https://openidconnect.googleapis.com")
        .get("/v1/userinfo")
        .reply(200, { sub: "google-user-1", email: "user@example.com", email_verified: true });
}

const googleConfig = {
    thirdPartyId: "google",
    clients: [
        { clientType: "web", clientId: "web-client", clientSecret: "web-secret" },
        { clientType: "android", clientId: "android-client" },
    ],
};

describe(`Access token checks for tokens sent by the client: ${printPath(
    "[test/thirdparty/clientAccessTokenCheck.test.js]"
)}`, function () {
    beforeEach(function () {
        ProcessState.getInstance().reset();
        nock.cleanAll();
    });

    afterEach(function () {
        nock.cleanAll();
    });

    describe("google", function () {
        it("accepts an access token issued to a configured client", async function () {
            mockGoogleDiscovery();
            const tokenInfo = mockGoogleTokenInfo(200, { aud: "web-client", azp: "web-client" });
            const userInfo = mockGoogleUserInfo();
            const provider = await getProvider(googleConfig, "web");

            const res = await provider.getUserInfo({ oAuthTokens: { access_token: "token-1" }, userContext: {} });

            assert(tokenInfo.scope.isDone());
            assert(userInfo.isDone());
            assert.strictEqual(res.thirdPartyUserId, "google-user-1");
        });

        it("sends the access token in the request body, not in the URL", async function () {
            mockGoogleDiscovery();
            const tokenInfo = mockGoogleTokenInfo(200, { aud: "web-client", azp: "web-client" });
            mockGoogleUserInfo();
            const provider = await getProvider(googleConfig, "web");

            await provider.getUserInfo({ oAuthTokens: { access_token: "token-1" }, userContext: {} });

            assert.strictEqual(tokenInfo.getCalledWith().access_token, "token-1");
        });

        it("accepts an access token requested by another configured client (azp)", async function () {
            mockGoogleDiscovery();
            const tokenInfo = mockGoogleTokenInfo(200, { aud: "some-other-client", azp: "android-client" });
            const userInfo = mockGoogleUserInfo();
            const provider = await getProvider(googleConfig, "web");

            await provider.getUserInfo({ oAuthTokens: { access_token: "token-1" }, userContext: {} });

            assert(tokenInfo.scope.isDone());
            assert(userInfo.isDone());
        });

        it("rejects an access token issued to a client that isn't configured", async function () {
            mockGoogleDiscovery();
            mockGoogleTokenInfo(200, { aud: "some-other-client", azp: "some-other-client" });
            const userInfo = mockGoogleUserInfo();
            const provider = await getProvider(googleConfig, "web");

            await assert.rejects(
                provider.getUserInfo({ oAuthTokens: { access_token: "token-1" }, userContext: {} }),
                /does not belong to your application/
            );
            assert.strictEqual(userInfo.isDone(), false);
        });

        it("rejects an access token that Google's token info API rejects", async function () {
            mockGoogleDiscovery();
            mockGoogleTokenInfo(400, { error: "invalid_token", error_description: "Invalid Value" });
            const userInfo = mockGoogleUserInfo();
            const provider = await getProvider(googleConfig, "web");

            await assert.rejects(
                provider.getUserInfo({ oAuthTokens: { access_token: "token-1" }, userContext: {} }),
                /Invalid access token/
            );
            assert.strictEqual(userInfo.isDone(), false);
        });

        it("reports other token info API errors with their status", async function () {
            mockGoogleDiscovery();
            mockGoogleTokenInfo(503, "unavailable");
            const provider = await getProvider(googleConfig, "web");

            await assert.rejects(
                provider.getUserInfo({ oAuthTokens: { access_token: "token-1" }, userContext: {} }),
                /Could not check the access token with Google \(status 503\)/
            );
        });

        it("doesn't check the access token the SDK got by exchanging the authorisation code", async function () {
            mockGoogleDiscovery();
            nock("https://oauth2.googleapis.com").post("/token").reply(200, { access_token: "exchanged-token" });
            const tokenInfo = mockGoogleTokenInfo(200, { aud: "some-other-client", azp: "some-other-client" });
            const userInfo = mockGoogleUserInfo();
            const provider = await getProvider(googleConfig, "web");

            const oAuthTokens = await provider.exchangeAuthCodeForOAuthTokens({
                redirectURIInfo: {
                    redirectURIOnProviderDashboard: "https://example.com/auth/callback/google",
                    redirectURIQueryParams: { code: "code" },
                },
                userContext: {},
            });
            await provider.getUserInfo({ oAuthTokens, userContext: {} });

            assert(userInfo.isDone());
            assert.strictEqual(tokenInfo.scope.isDone(), false);
        });

        it("checks an access token that isn't the one the SDK got from the code exchange", async function () {
            mockGoogleDiscovery();
            nock("https://oauth2.googleapis.com").post("/token").reply(200, { access_token: "exchanged-token" });
            mockGoogleTokenInfo(200, { aud: "some-other-client", azp: "some-other-client" });
            const provider = await getProvider(googleConfig, "web");

            await provider.exchangeAuthCodeForOAuthTokens({
                redirectURIInfo: {
                    redirectURIOnProviderDashboard: "https://example.com/auth/callback/google",
                    redirectURIQueryParams: { code: "code" },
                },
                userContext: {},
            });
            await assert.rejects(
                provider.getUserInfo({ oAuthTokens: { access_token: "another-token" }, userContext: {} }),
                /does not belong to your application/
            );
        });

        it("doesn't check if the provider config sets validateAccessToken", async function () {
            mockGoogleDiscovery();
            const tokenInfo = mockGoogleTokenInfo(200, { aud: "some-other-client", azp: "some-other-client" });
            const userInfo = mockGoogleUserInfo();
            let calledWith;
            const provider = await getProvider(
                {
                    ...googleConfig,
                    validateAccessToken: async (input) => {
                        calledWith = input.accessToken;
                    },
                },
                "web"
            );

            await provider.getUserInfo({ oAuthTokens: { access_token: "token-1" }, userContext: {} });

            assert.strictEqual(calledWith, "token-1");
            assert(userInfo.isDone());
            assert.strictEqual(tokenInfo.scope.isDone(), false);
        });

        it("checks the access token in the google workspaces provider", async function () {
            mockGoogleDiscovery();
            mockGoogleTokenInfo(200, { aud: "some-other-client", azp: "some-other-client" });
            const provider = await getProvider(
                { ...googleConfig, thirdPartyId: "google-workspaces", clients: [googleConfig.clients[0]] },
                undefined
            );

            await assert.rejects(
                provider.getUserInfo({ oAuthTokens: { access_token: "token-1" }, userContext: {} }),
                /does not belong to your application/
            );
        });
    });

    describe("facebook", function () {
        const facebookConfig = {
            thirdPartyId: "facebook",
            clients: [{ clientId: "fb-app", clientSecret: "fb-secret" }],
        };

        function mockDebugToken(status, body) {
            let query;
            const scope = nock("https://graph.facebook.com")
                .get("/debug_token")
                .query((q) => {
                    query = q;
                    return true;
                })
                .reply(status, body);
            return { scope, getQuery: () => query };
        }

        function mockFacebookUserInfo() {
            return nock("https://graph.facebook.com")
                .get("/me")
                .query(true)
                .reply(200, { id: "fb-user-1", email: "user@example.com" });
        }

        it("accepts a valid access token of the configured app", async function () {
            const debugToken = mockDebugToken(200, {
                data: { app_id: "fb-app", is_valid: true, user_id: "fb-user-1" },
            });
            const userInfo = mockFacebookUserInfo();
            const provider = await getProvider(facebookConfig);

            const res = await provider.getUserInfo({ oAuthTokens: { access_token: "fb-token" }, userContext: {} });

            assert(debugToken.scope.isDone());
            assert(userInfo.isDone());
            assert.strictEqual(debugToken.getQuery().input_token, "fb-token");
            assert.strictEqual(debugToken.getQuery().access_token, "fb-app|fb-secret");
            assert.strictEqual(res.thirdPartyUserId, "fb-user-1");
        });

        it("rejects an access token of another app", async function () {
            mockDebugToken(200, { data: { app_id: "another-app", is_valid: true, user_id: "fb-user-1" } });
            const userInfo = mockFacebookUserInfo();
            const provider = await getProvider(facebookConfig);

            await assert.rejects(
                provider.getUserInfo({ oAuthTokens: { access_token: "fb-token" }, userContext: {} }),
                /does not belong to your application/
            );
            assert.strictEqual(userInfo.isDone(), false);
        });

        it("rejects an invalid access token", async function () {
            mockDebugToken(200, { data: { app_id: "fb-app", is_valid: false } });
            const provider = await getProvider(facebookConfig);

            await assert.rejects(
                provider.getUserInfo({ oAuthTokens: { access_token: "fb-token" }, userContext: {} }),
                /Invalid access token/
            );
        });

        it("reports a failed debug token call", async function () {
            mockDebugToken(400, { error: { message: "Invalid OAuth access token", code: 190 } });
            const provider = await getProvider(facebookConfig);

            await assert.rejects(
                provider.getUserInfo({ oAuthTokens: { access_token: "fb-token" }, userContext: {} }),
                /Could not check the access token with Facebook \(status 400\)/
            );
        });

        it("reports a missing clientSecret without calling Facebook", async function () {
            const debugToken = mockDebugToken(200, { data: { app_id: "fb-app", is_valid: true } });
            const provider = await getProvider({ thirdPartyId: "facebook", clients: [{ clientId: "fb-app" }] });

            await assert.rejects(
                provider.getUserInfo({ oAuthTokens: { access_token: "fb-token" }, userContext: {} }),
                /clientSecret/
            );
            assert.strictEqual(debugToken.scope.isDone(), false);
        });
    });

    describe("gitlab", function () {
        const gitlabConfig = {
            thirdPartyId: "gitlab",
            clients: [
                {
                    clientId: "gitlab-app",
                    clientSecret: "gitlab-secret",
                    additionalConfig: { gitlabBaseUrl: "https://gitlab.example.com" },
                },
            ],
        };

        function mockGitLab(tokenInfoStatus, tokenInfoBody) {
            nock("https://gitlab.example.com").persist().get("/.well-known/openid-configuration").reply(200, {
                issuer: "https://gitlab.example.com",
                authorization_endpoint: "https://gitlab.example.com/oauth/authorize",
                token_endpoint: "https://gitlab.example.com/oauth/token",
                userinfo_endpoint: "https://gitlab.example.com/oauth/userinfo",
                jwks_uri: "https://gitlab.example.com/oauth/discovery/keys",
            });
            const tokenInfo = nock("https://gitlab.example.com", {
                reqheaders: { authorization: "Bearer gl-token" },
            })
                .get("/oauth/token/info")
                .reply(tokenInfoStatus, tokenInfoBody);
            const userInfo = nock("https://gitlab.example.com")
                .get("/oauth/userinfo")
                .reply(200, { sub: "gl-user-1", email: "user@example.com", email_verified: true });
            return { tokenInfo, userInfo };
        }

        it("accepts an access token of the configured application, on the configured GitLab instance", async function () {
            const { tokenInfo, userInfo } = mockGitLab(200, { application: { uid: "gitlab-app" } });
            const provider = await getProvider(gitlabConfig);

            await provider.getUserInfo({ oAuthTokens: { access_token: "gl-token" }, userContext: {} });

            assert(tokenInfo.isDone());
            assert(userInfo.isDone());
        });

        it("rejects an access token of another application", async function () {
            const { userInfo } = mockGitLab(200, { application: { uid: "another-app" } });
            const provider = await getProvider(gitlabConfig);

            await assert.rejects(
                provider.getUserInfo({ oAuthTokens: { access_token: "gl-token" }, userContext: {} }),
                /does not belong to your application/
            );
            assert.strictEqual(userInfo.isDone(), false);
        });

        it("rejects an access token GitLab doesn't accept", async function () {
            mockGitLab(401, { error: "invalid_token" });
            const provider = await getProvider(gitlabConfig);

            await assert.rejects(
                provider.getUserInfo({ oAuthTokens: { access_token: "gl-token" }, userContext: {} }),
                /Invalid access token/
            );
        });
    });

    describe("discord", function () {
        const discordConfig = {
            thirdPartyId: "discord",
            clients: [{ clientId: "discord-app", clientSecret: "discord-secret" }],
        };

        function mockDiscord(status, body) {
            const authInfo = nock("https://discord.com", { reqheaders: { authorization: "Bearer dc-token" } })
                .get("/api/oauth2/@me")
                .reply(status, body);
            const userInfo = nock("https://discord.com")
                .get("/api/users/@me")
                .reply(200, { id: "dc-user-1", email: "user@example.com", verified: true });
            return { authInfo, userInfo };
        }

        it("accepts an access token of the configured application", async function () {
            const { authInfo, userInfo } = mockDiscord(200, { application: { id: "discord-app" } });
            const provider = await getProvider(discordConfig);

            await provider.getUserInfo({ oAuthTokens: { access_token: "dc-token" }, userContext: {} });

            assert(authInfo.isDone());
            assert(userInfo.isDone());
        });

        it("rejects an access token of another application", async function () {
            const { userInfo } = mockDiscord(200, { application: { id: "another-app" } });
            const provider = await getProvider(discordConfig);

            await assert.rejects(
                provider.getUserInfo({ oAuthTokens: { access_token: "dc-token" }, userContext: {} }),
                /does not belong to your application/
            );
            assert.strictEqual(userInfo.isDone(), false);
        });

        it("rejects an access token Discord doesn't accept", async function () {
            mockDiscord(401, { message: "401: Unauthorized", code: 0 });
            const provider = await getProvider(discordConfig);

            await assert.rejects(
                provider.getUserInfo({ oAuthTokens: { access_token: "dc-token" }, userContext: {} }),
                /Invalid access token/
            );
        });
    });

    describe("sign in up API", function () {
        async function setup() {
            const connectionURI = await createCoreApplication();
            STExpress.init({
                supertokens: { connectionURI },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    ThirdParty.init({ signInAndUpFeature: { providers: [{ config: googleConfig }] } }),
                    Session.init({ getTokenTransferMethod: () => "header" }),
                ],
            });
            const app = express();
            app.use(middleware());
            app.use(errorHandler());
            return app;
        }

        async function getGoogleUsers() {
            return STExpress.listUsersByAccountInfo("public", {
                thirdParty: { id: "google", userId: "google-user-1" },
            });
        }

        it("rejects sign in with an access token of a client that isn't configured", async function () {
            const app = await setup();
            mockGoogleDiscovery();
            mockGoogleTokenInfo(200, { aud: "some-other-client", azp: "some-other-client" });
            mockGoogleUserInfo();

            const res = await request(app)
                .post("/auth/signinup")
                .send({ thirdPartyId: "google", clientType: "web", oAuthTokens: { access_token: "token-1" } });

            assert.notStrictEqual(res.body.status, "OK");
            assert.strictEqual((await getGoogleUsers()).length, 0);
        });

        it("signs in with an access token of a configured client", async function () {
            const app = await setup();
            mockGoogleDiscovery();
            const tokenInfo = mockGoogleTokenInfo(200, { aud: "android-client", azp: "android-client" });
            mockGoogleUserInfo();

            const res = await request(app)
                .post("/auth/signinup")
                .send({ thirdPartyId: "google", clientType: "android", oAuthTokens: { access_token: "token-1" } });

            assert(tokenInfo.scope.isDone());
            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual((await getGoogleUsers()).length, 1);
        });

        it("doesn't call the token info API when signing in with an authorisation code", async function () {
            const app = await setup();
            mockGoogleDiscovery();
            nock("https://oauth2.googleapis.com").post("/token").reply(200, { access_token: "exchanged-token" });
            const tokenInfo = mockGoogleTokenInfo(200, { aud: "some-other-client", azp: "some-other-client" });
            mockGoogleUserInfo();

            const res = await request(app)
                .post("/auth/signinup")
                .send({
                    thirdPartyId: "google",
                    clientType: "web",
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "https://supertokens.io/auth/callback/google",
                        redirectURIQueryParams: { code: "code" },
                    },
                });

            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual(tokenInfo.scope.isDone(), false);
        });
    });
});
