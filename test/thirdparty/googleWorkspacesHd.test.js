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
const { printPath, startST, killAllST, setupST, cleanST } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let nock = require("nock");
let jose = require("jose");
let { ProcessState } = require("../../lib/build/processState");
let ThirdParty = require("../../recipe/thirdparty");
let Session = require("../../recipe/session");
const express = require("express");
const request = require("supertest");
let { middleware, errorHandler } = require("../../framework/express");

const IDP = "https://idp.test";
const clientId = "workspaces-client";

describe(`Google Workspaces hd restriction: ${printPath("[test/thirdparty/googleWorkspacesHd.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    let privateKey;
    let jwk;

    before(async function () {
        const keyPair = await jose.generateKeyPair("RS256");
        privateKey = keyPair.privateKey;
        jwk = { ...(await jose.exportJWK(keyPair.publicKey)), kid: "test-key", alg: "RS256", use: "sig" };
    });

    beforeEach(function () {
        ProcessState.getInstance().reset();
        nock.cleanAll();
        nock(IDP)
            .persist()
            .get("/.well-known/openid-configuration")
            .reply(200, {
                issuer: IDP,
                authorization_endpoint: `${IDP}/auth`,
                token_endpoint: `${IDP}/token`,
                userinfo_endpoint: `${IDP}/userinfo`,
                jwks_uri: `${IDP}/jwks`,
            })
            .get("/jwks")
            .reply(200, () => ({ keys: [jwk] }));
    });

    afterEach(function () {
        nock.cleanAll();
    });

    async function setup(hd) {
        const connectionURI = await startST();
        STExpress.init({
            supertokens: { connectionURI },
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
                                    thirdPartyId: "google-workspaces",
                                    oidcDiscoveryEndpoint: `${IDP}/.well-known/openid-configuration`,
                                    clients: [
                                        {
                                            clientId,
                                            clientSecret: "secret",
                                            additionalConfig: hd === undefined ? undefined : { hd },
                                        },
                                    ],
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

    function mockUserInfo(userInfo) {
        return nock(IDP).get("/userinfo").reply(200, userInfo);
    }

    async function createIdToken(payload) {
        return new jose.SignJWT({ email: "user@corp.example", email_verified: true, ...payload })
            .setProtectedHeader({ alg: "RS256", kid: "test-key" })
            .setIssuer(IDP)
            .setAudience(clientId)
            .setSubject(payload.sub ?? "user-1")
            .setIssuedAt()
            .setExpirationTime("10m")
            .sign(privateKey);
    }

    function signInUp(app, oAuthTokens) {
        return request(app).post("/auth/signinup").send({ thirdPartyId: "google-workspaces", oAuthTokens });
    }

    async function getUsers(sub) {
        return STExpress.listUsersByAccountInfo("public", { thirdParty: { id: "google-workspaces", userId: sub } });
    }

    it("rejects an access token only request for a user outside the domain", async function () {
        const app = await setup("corp.example");
        const userInfoScope = mockUserInfo({ sub: "outsider", email: "outsider@gmail.com", email_verified: true });

        const res = await signInUp(app, { access_token: "access-token" });

        assert.notStrictEqual(res.body.status, "OK");
        assert(userInfoScope.isDone(), "the user info endpoint should have been called");
        assert.strictEqual((await getUsers("outsider")).length, 0);
    });

    it("rejects an access token only request for a user of another domain", async function () {
        const app = await setup("corp.example");
        const userInfoScope = mockUserInfo({
            sub: "other",
            email: "other@other.example",
            email_verified: true,
            hd: "other.example",
        });

        const res = await signInUp(app, { access_token: "access-token" });

        assert.notStrictEqual(res.body.status, "OK");
        assert(userInfoScope.isDone(), "the user info endpoint should have been called");
        assert.strictEqual((await getUsers("other")).length, 0);
    });

    for (const idToken of ["", null, false, 0]) {
        it(`rejects an access token request for a user outside the domain with id_token ${JSON.stringify(
            idToken
        )}`, async function () {
            const app = await setup("corp.example");
            const userInfoScope = mockUserInfo({ sub: "outsider", email: "outsider@gmail.com", email_verified: true });

            const res = await signInUp(app, { access_token: "access-token", id_token: idToken });

            assert.notStrictEqual(res.body.status, "OK");
            assert(userInfoScope.isDone(), "the user info endpoint should have been called");
            assert.strictEqual((await getUsers("outsider")).length, 0);
        });
    }

    it("accepts an access token only request if the user info has the right hd", async function () {
        const app = await setup("corp.example");
        mockUserInfo({ sub: "member", email: "member@corp.example", email_verified: true, hd: "corp.example" });

        const res = await signInUp(app, { access_token: "access-token" });

        assert.strictEqual(res.body.status, "OK");
        assert.strictEqual((await getUsers("member")).length, 1);
    });

    it("accepts an id token with the right hd", async function () {
        const app = await setup("corp.example");
        mockUserInfo({ sub: "member", email: "member@corp.example", email_verified: true });

        const res = await signInUp(app, {
            access_token: "access-token",
            id_token: await createIdToken({ sub: "member", hd: "corp.example" }),
        });

        assert.strictEqual(res.body.status, "OK");
        assert.strictEqual((await getUsers("member")).length, 1);
    });

    it("accepts an id token only request with the right hd", async function () {
        const app = await setup("corp.example");

        const res = await signInUp(app, { id_token: await createIdToken({ sub: "member", hd: "corp.example" }) });

        assert.strictEqual(res.body.status, "OK");
        assert.strictEqual((await getUsers("member")).length, 1);
    });

    it("rejects an id token with a different hd", async function () {
        const app = await setup("corp.example");
        mockUserInfo({ sub: "other", email: "other@other.example", email_verified: true, hd: "corp.example" });

        const res = await signInUp(app, {
            access_token: "access-token",
            id_token: await createIdToken({ sub: "other", hd: "other.example" }),
        });

        assert.notStrictEqual(res.body.status, "OK");
        assert.strictEqual((await getUsers("other")).length, 0);
    });

    it("accepts any domain if hd is *", async function () {
        const app = await setup("*");
        mockUserInfo({ sub: "anyone", email: "anyone@gmail.com", email_verified: true });

        const res = await signInUp(app, { access_token: "access-token" });

        assert.strictEqual(res.body.status, "OK");
    });

    it("accepts any domain if hd is not set", async function () {
        const app = await setup(undefined);
        mockUserInfo({ sub: "anyone", email: "anyone@gmail.com", email_verified: true });

        const res = await signInUp(app, { access_token: "access-token" });

        assert.strictEqual(res.body.status, "OK");
    });
});
