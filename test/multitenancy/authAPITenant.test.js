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
const { printPath, createCoreApplicationWithMultitenancy } = require("../utils");
let SuperTokens = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdParty = require("../../recipe/thirdparty");
let EmailPassword = require("../../recipe/emailpassword");
let Passwordless = require("../../recipe/passwordless");
let Multitenancy = require("../../recipe/multitenancy");
let Session = require("../../recipe/session");
const express = require("express");
const request = require("supertest");
let { middleware, errorHandler } = require("../../framework/express");

function staticProvider(thirdPartyId) {
    return {
        config: {
            thirdPartyId,
            authorizationEndpoint: "https://idp.example.com/auth",
            tokenEndpoint: "https://idp.example.com/token",
            clients: [{ clientId: "client", clientSecret: "secret" }],
        },
        override: (oI) => ({
            ...oI,
            getUserInfo: async () => ({
                thirdPartyUserId: `${thirdPartyId}-user`,
                email: { id: `${thirdPartyId}-user@example.com`, isVerified: true },
            }),
        }),
    };
}

describe(`auth APIs with a session from another tenant: ${printPath(
    "[test/multitenancy/authAPITenant.test.js]"
)}`, function () {
    let validatedTenantIds;

    beforeEach(async function () {
        ProcessState.getInstance().reset();
        validatedTenantIds = [];

        const connectionURI = await createCoreApplicationWithMultitenancy();
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
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [staticProvider("only-b"), staticProvider("in-a")],
                    },
                }),
                EmailPassword.init({
                    signUpFeature: {
                        formFields: [
                            {
                                id: "email",
                                validate: async (value, tenantId) => {
                                    validatedTenantIds.push(tenantId);
                                    if (tenantId === "tenant-a" && !value.endsWith("@a.example")) {
                                        return "Only a.example emails are allowed";
                                    }
                                    return undefined;
                                },
                            },
                        ],
                    },
                }),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                    validateEmailAddress: async (_email, tenantId) => {
                        validatedTenantIds.push(tenantId);
                        return undefined;
                    },
                    emailDelivery: {
                        override: (oI) => ({ ...oI, sendEmail: async () => {} }),
                    },
                }),
                Session.init({ getTokenTransferMethod: () => "header" }),
            ],
        });

        const firstFactors = ["emailpassword", "thirdparty", "otp-email"];
        await Multitenancy.createOrUpdateTenant("tenant-a", { firstFactors });
        await Multitenancy.createOrUpdateTenant("tenant-b", { firstFactors });
        await Multitenancy.createOrUpdateThirdPartyConfig("tenant-a", {
            thirdPartyId: "in-a",
            name: "In A",
            clients: [{ clientId: "client", clientSecret: "secret" }],
        });
        await Multitenancy.createOrUpdateThirdPartyConfig("tenant-b", {
            thirdPartyId: "only-b",
            name: "Only B",
            clients: [{ clientId: "client", clientSecret: "secret" }],
        });
    });

    function getApp() {
        const app = express();
        app.use(middleware());
        app.use(errorHandler());
        return app;
    }

    async function getAccessTokenInTenant(tenantId) {
        const signUpResp = await EmailPassword.signUp(tenantId, `session-user@${tenantId}.example`, "password123");
        assert.strictEqual(signUpResp.status, "OK");
        const session = await Session.createNewSessionWithoutRequestResponse(
            tenantId,
            signUpResp.user.loginMethods[0].recipeUserId
        );
        validatedTenantIds = [];
        return session.getAllSessionTokensDangerously().accessToken;
    }

    function withSession(req, accessToken) {
        // FDI 3.0 loads the session optionally, so it is used if present
        req = req.set("fdi-version", "3.0");
        if (accessToken !== undefined) {
            req = req.set("Authorization", `Bearer ${accessToken}`);
        }
        return req;
    }

    async function getThirdPartyUsers(tenantId, thirdPartyId) {
        return SuperTokens.listUsersByAccountInfo(tenantId, {
            thirdParty: { id: thirdPartyId, userId: `${thirdPartyId}-user` },
        });
    }

    describe("thirdparty signinup", function () {
        it("does not use a provider that only the path tenant has when signing in to the session tenant", async function () {
            const accessToken = await getAccessTokenInTenant("tenant-a");

            const res = await withSession(request(getApp()).post("/auth/tenant-b/signinup"), accessToken).send({
                thirdPartyId: "only-b",
                oAuthTokens: { access_token: "token" },
            });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.message, "the provider only-b could not be found in the configuration");
            assert.strictEqual((await getThirdPartyUsers("tenant-a", "only-b")).length, 0);
            assert.strictEqual((await getThirdPartyUsers("tenant-b", "only-b")).length, 0);
        });

        it("signs in to the session tenant with a provider the session tenant has", async function () {
            const accessToken = await getAccessTokenInTenant("tenant-a");

            const res = await withSession(request(getApp()).post("/auth/tenant-b/signinup"), accessToken).send({
                thirdPartyId: "in-a",
                oAuthTokens: { access_token: "token" },
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.status, "OK");
            assert.deepStrictEqual(res.body.user.loginMethods[0].tenantIds, ["tenant-a"]);
        });

        it("uses the path tenant's provider without a session", async function () {
            const res = await withSession(request(getApp()).post("/auth/tenant-b/signinup")).send({
                thirdPartyId: "only-b",
                oAuthTokens: { access_token: "token" },
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.status, "OK");
            assert.deepStrictEqual(res.body.user.loginMethods[0].tenantIds, ["tenant-b"]);
        });

        it("uses the path tenant's provider with a session in the same tenant", async function () {
            const accessToken = await getAccessTokenInTenant("tenant-b");

            const res = await withSession(request(getApp()).post("/auth/tenant-b/signinup"), accessToken).send({
                thirdPartyId: "only-b",
                oAuthTokens: { access_token: "token" },
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.status, "OK");
            assert.deepStrictEqual(res.body.user.loginMethods[0].tenantIds, ["tenant-b"]);
        });
    });

    describe("emailpassword", function () {
        it("runs the session tenant's sign up validators", async function () {
            const accessToken = await getAccessTokenInTenant("tenant-a");

            const res = await withSession(request(getApp()).post("/auth/tenant-b/signup"), accessToken).send({
                formFields: [
                    { id: "email", value: "someone@other.example" },
                    { id: "password", value: "password123" },
                ],
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.status, "FIELD_ERROR");
            assert.deepStrictEqual(validatedTenantIds, ["tenant-a"]);
            const users = await SuperTokens.listUsersByAccountInfo("tenant-a", { email: "someone@other.example" });
            assert.strictEqual(users.length, 0);
        });

        it("runs the session tenant's sign in validators", async function () {
            const accessToken = await getAccessTokenInTenant("tenant-a");

            await withSession(request(getApp()).post("/auth/tenant-b/signin"), accessToken).send({
                formFields: [
                    { id: "email", value: "session-user@tenant-a.example" },
                    { id: "password", value: "password123" },
                ],
            });

            assert.deepStrictEqual(validatedTenantIds, ["tenant-a"]);
        });

        it("runs the path tenant's sign up validators without a session", async function () {
            const res = await withSession(request(getApp()).post("/auth/tenant-b/signup")).send({
                formFields: [
                    { id: "email", value: "someone@other.example" },
                    { id: "password", value: "password123" },
                ],
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.status, "OK");
            assert.deepStrictEqual(validatedTenantIds, ["tenant-b"]);
        });

        it("runs the path tenant's sign up validators with a session in the same tenant", async function () {
            const accessToken = await getAccessTokenInTenant("tenant-a");

            const res = await withSession(request(getApp()).post("/auth/tenant-a/signup"), accessToken).send({
                formFields: [
                    { id: "email", value: "someone@other.example" },
                    { id: "password", value: "password123" },
                ],
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.status, "FIELD_ERROR");
            assert.deepStrictEqual(validatedTenantIds, ["tenant-a"]);
        });
    });

    describe("passwordless createCode", function () {
        it("runs the session tenant's email validator", async function () {
            const accessToken = await getAccessTokenInTenant("tenant-a");

            const res = await withSession(request(getApp()).post("/auth/tenant-b/signinup/code"), accessToken).send({
                email: "someone@other.example",
            });

            assert.strictEqual(res.status, 200);
            assert.deepStrictEqual(validatedTenantIds, ["tenant-a"]);
        });

        it("runs the path tenant's email validator without a session", async function () {
            const res = await withSession(request(getApp()).post("/auth/tenant-b/signinup/code")).send({
                email: "someone@other.example",
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.status, "OK");
            assert.deepStrictEqual(validatedTenantIds, ["tenant-b"]);
        });
    });
});
