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
    startSTWithMultitenancyAndAccountLinking,
} = require("../utils");
let supertokens = require("../..");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");
let EmailVerification = require("../../recipe/emailverification");
let AccountLinking = require("../../recipe/accountlinking");
let Passwordless = require("../../recipe/passwordless");
let ThirdParty = require("../../recipe/thirdparty");
let MultiTenancy = require("../../recipe/multitenancy");

describe(`accountlinkingTests: ${printPath("[test/accountlinking/multitenancy.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("user sharing", function () {
        it("should work fine for primary users", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkNoVerify,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const password = "password123";
            let user = (await EmailPassword.signUp("public", email, password)).user;
            assert(user.isPrimaryUser);

            const shareRes = await MultiTenancy.associateUserToTenant("tenant1", user.loginMethods[0].recipeUserId);
            assert.strictEqual(shareRes.status, "OK");

            const signInRes = await EmailPassword.signIn("tenant1", email, password);
            assert.strictEqual(signInRes.status, "OK");
        });

        it("should not share linked users when sharing primary user", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkNoVerify,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            assert(primUser.isPrimaryUser);

            const pwlessSignUpResp = await Passwordless.signInUp({ email, tenantId: "public" });
            const linkRes = await AccountLinking.linkAccounts(pwlessSignUpResp.recipeUserId, primUser.id);
            assert.strictEqual(linkRes.status, "OK");
            assert.strictEqual(linkRes.user.id, primUser.id);

            const shareRes = await MultiTenancy.associateUserToTenant("tenant1", primUser.loginMethods[0].recipeUserId);
            assert.strictEqual(shareRes.status, "OK");

            const signInRes = await Passwordless.signInUp({
                email,
                tenantId: "tenant1",
                userContext: { doNotLink: true },
            });

            assert.strictEqual(signInRes.status, "OK");
            assert.strictEqual(signInRes.user.loginMethods.length, 1);
            assert.notStrictEqual(signInRes.user.id, primUser.id);
            assert.notStrictEqual(signInRes.recipeUserId.getAsString(), pwlessSignUpResp.recipeUserId.getAsString());
        });

        it("should not share linked users when sharing recipe user", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkNoVerify,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            assert(primUser.isPrimaryUser);

            const pwlessSignUpResp = await Passwordless.signInUp({ email, tenantId: "public" });

            const shareRes = await MultiTenancy.associateUserToTenant(
                "tenant1",
                pwlessSignUpResp.user.loginMethods.find((lm) => lm.recipeId === "passwordless").recipeUserId
            );
            assert.strictEqual(shareRes.status, "OK");

            const signInRes = await EmailPassword.signIn("tenant1", email, password);

            assert.strictEqual(signInRes.status, "WRONG_CREDENTIALS_ERROR");
        });

        it("should not share linked users if linked after sharing was done", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkNoVerify,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            assert(primUser.isPrimaryUser);

            const pwlessSignUpResp = await Passwordless.signInUp({ email, tenantId: "public" });
            const linkRes = await AccountLinking.linkAccounts(pwlessSignUpResp.recipeUserId, primUser.id);
            assert.strictEqual(linkRes.status, "OK");
            assert.strictEqual(linkRes.user.id, primUser.id);

            const shareRes = await MultiTenancy.associateUserToTenant("tenant1", primUser.loginMethods[0].recipeUserId);
            assert.strictEqual(shareRes.status, "OK");

            const signInRes = await Passwordless.signInUp({
                email,
                tenantId: "tenant1",
                userContext: { doNotLink: true },
            });

            assert.strictEqual(signInRes.status, "OK");
            assert.notStrictEqual(signInRes.user.id, primUser.id);
            assert.strictEqual(signInRes.user.loginMethods.length, 1);
            assert.notStrictEqual(signInRes.recipeUserId.getAsString(), pwlessSignUpResp.recipeUserId.getAsString());
        });

        it("should not allow sharing if there is a conflicting primary user", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkNoVerify,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            assert(primUser.isPrimaryUser);

            const pwlessSignUpResp = await Passwordless.signInUp({
                email,
                tenantId: "tenant1",
                userContext: { doNotLink: true },
            });
            const createPrimRes = await AccountLinking.createPrimaryUser(pwlessSignUpResp.recipeUserId);
            assert.strictEqual(createPrimRes.status, "OK");
            assert(createPrimRes.user.isPrimaryUser);
            assert.notStrictEqual(createPrimRes.user.id, primUser.id);

            const shareRes = await MultiTenancy.associateUserToTenant("tenant1", primUser.loginMethods[0].recipeUserId);
            assert.notStrictEqual(shareRes.status, "OK");
        });
    });

    describe("getUsersThatCanBeLinkedToRecipeUser", () => {
        it("should not suggest linking users on separate tenants", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkNoVerify,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            assert(primUser.isPrimaryUser);

            const pwlessSignUpResp = await Passwordless.signInUp({
                email,
                tenantId: "tenant1",
                userContext: { doNotLink: true },
            });

            const toLink = await AccountLinking.getPrimaryUserThatCanBeLinkedToRecipeUserId(
                "tenant1",
                pwlessSignUpResp.recipeUserId
            );
            assert.strictEqual(toLink, undefined);
        });

        it("should not check if recipeUser is associated with tenant", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkNoVerify,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            assert(primUser.isPrimaryUser);

            const pwlessSignUpResp = await Passwordless.signInUp({
                email,
                tenantId: "tenant1",
                userContext: { doNotLink: true },
            });

            const toLink = await AccountLinking.getPrimaryUserThatCanBeLinkedToRecipeUserId(
                "public",
                pwlessSignUpResp.recipeUserId
            );
            assert.deepStrictEqual(toLink.toJson(), primUser.toJson());
        });
    });

    describe("canCreatePrimaryUser", () => {
        it("should return ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR if a conflicting user was shared on the tenant", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkNoVerify,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            assert(primUser.isPrimaryUser);

            const pwlessSignUpResp = await Passwordless.signInUp({
                email,
                tenantId: "tenant1",
                userContext: { doNotLink: true },
            });

            const shareRes = await MultiTenancy.associateUserToTenant("tenant1", primUser.loginMethods[0].recipeUserId);
            assert.strictEqual(shareRes.status, "OK");

            const resp = await AccountLinking.canCreatePrimaryUser(pwlessSignUpResp.recipeUserId);
            assert.deepStrictEqual(resp.status, "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR");
        });

        it("should return OK if a conflicting user is only on a different tenant", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkNoVerify,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            assert(primUser.isPrimaryUser);

            const pwlessSignUpResp = await Passwordless.signInUp({
                email,
                tenantId: "tenant1",
                userContext: { doNotLink: true },
            });

            const resp = await AccountLinking.canCreatePrimaryUser(pwlessSignUpResp.recipeUserId);
            assert.deepStrictEqual(resp.status, "OK");
        });
    });

    describe("createPrimaryUser", () => {
        it("should return ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR if a conflicting user was shared on the tenant", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkNoVerify,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            assert(primUser.isPrimaryUser);

            const pwlessSignUpResp = await Passwordless.signInUp({
                email,
                tenantId: "tenant1",
                userContext: { doNotLink: true },
            });

            const shareRes = await MultiTenancy.associateUserToTenant("tenant1", primUser.loginMethods[0].recipeUserId);
            assert.strictEqual(shareRes.status, "OK");

            const resp = await AccountLinking.createPrimaryUser(pwlessSignUpResp.recipeUserId);
            assert.deepStrictEqual(resp.status, "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR");
        });

        it("should return OK if a conflicting user is only on a different tenant", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkNoVerify,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            assert(primUser.isPrimaryUser);

            const pwlessSignUpResp = await Passwordless.signInUp({
                email,
                tenantId: "tenant1",
                userContext: { doNotLink: true },
            });

            const resp = await AccountLinking.createPrimaryUser(pwlessSignUpResp.recipeUserId);
            assert.deepStrictEqual(resp.status, "OK");
        });
    });

    describe("linkAccounts", () => {
        it("should be able to link to a shared user", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkNoVerify,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            assert(primUser.isPrimaryUser);

            const pwlessSignUpResp = await Passwordless.signInUp({
                email,
                tenantId: "tenant1",
                userContext: { doNotLink: true },
            });

            const shareRes = await MultiTenancy.associateUserToTenant("tenant1", primUser.loginMethods[0].recipeUserId);
            assert.strictEqual(shareRes.status, "OK");

            const resp = await AccountLinking.linkAccounts(pwlessSignUpResp.recipeUserId, primUser.id);
            assert.deepStrictEqual(resp.status, "OK");
        });

        it("should return OK even if the primary user is only on a different tenant", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkNoVerify,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            assert(primUser.isPrimaryUser);

            const pwlessSignUpResp = await Passwordless.signInUp({
                email,
                tenantId: "tenant1",
                userContext: { doNotLink: true },
            });

            const resp = await AccountLinking.linkAccounts(pwlessSignUpResp.recipeUserId, primUser.id);
            assert.deepStrictEqual(resp.status, "OK");
        });
    });

    describe("isEmailChangeAllowed", () => {
        it("should return false for primary user if a conflicting user was shared on the tenant", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkNoVerify,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const email2 = `test2+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            assert(primUser.isPrimaryUser);

            const pwlessSignUpResp = await Passwordless.signInUp({ email: email2, tenantId: "tenant1" });
            await AccountLinking.createPrimaryUser(pwlessSignUpResp.recipeUserId);

            const shareRes = await MultiTenancy.associateUserToTenant("tenant1", primUser.loginMethods[0].recipeUserId);
            assert.strictEqual(shareRes.status, "OK");

            const resp = await AccountLinking.isEmailChangeAllowed(pwlessSignUpResp.recipeUserId, email, false);

            assert.deepStrictEqual(resp, false);
        });

        it("should return false for recipe user if a conflicting user was shared on the tenant and verification is required", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkIfVerified,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const email2 = `test2+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            primUser = (await AccountLinking.createPrimaryUser(primUser.loginMethods[0].recipeUserId)).user;
            assert(primUser.isPrimaryUser);

            const pwlessSignUpResp = await Passwordless.signInUp({ email: email2, tenantId: "tenant1" });

            const shareRes = await MultiTenancy.associateUserToTenant("tenant1", primUser.loginMethods[0].recipeUserId);
            assert.strictEqual(shareRes.status, "OK");

            const resp = await AccountLinking.isEmailChangeAllowed(pwlessSignUpResp.recipeUserId, email, false);

            assert.deepStrictEqual(resp, false);
        });

        it("should return true if a conflicting user is only present on another tenant", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkNoVerify,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const email2 = `test2+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            assert(primUser.isPrimaryUser);

            const pwlessSignUpResp = await Passwordless.signInUp({ email: email2, tenantId: "tenant1" });
            await AccountLinking.createPrimaryUser(pwlessSignUpResp.recipeUserId);

            const resp = await AccountLinking.isEmailChangeAllowed(pwlessSignUpResp.recipeUserId, email, false);

            assert.deepStrictEqual(resp, true);
        });
    });

    describe("isSignUpAllowed", () => {
        it("should return false if a conflicting user was shared on the tenant", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init(),
                    EmailVerification.init({
                        mode: "REQUIRED",
                    }),
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkIfVerified,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            primUser = (await AccountLinking.createPrimaryUser(primUser.loginMethods[0].recipeUserId)).user;
            assert(primUser.isPrimaryUser);

            const shareRes = await MultiTenancy.associateUserToTenant("tenant1", primUser.loginMethods[0].recipeUserId);
            assert.strictEqual(shareRes.status, "OK");

            const resp = await AccountLinking.isSignUpAllowed("tenant1", {
                email,
                recipeId: "passwordless",
            });
            assert.deepStrictEqual(resp, false);
        });

        it("should return true if a conflicting user is only on a different tenant", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkIfVerified,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            primUser = (await AccountLinking.createPrimaryUser(primUser.loginMethods[0].recipeUserId)).user;
            assert(primUser.isPrimaryUser);

            const resp = await AccountLinking.isSignUpAllowed(
                "tenant1",
                {
                    email,
                    recipeId: "passwordless",
                },
                false
            );
            assert.deepStrictEqual(resp, true);
        });
    });

    describe("isSignInAllowed", () => {
        it("should return false if a conflicting user was shared on the tenant", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init(),
                    EmailVerification.init({
                        mode: "REQUIRED",
                    }),
                    ThirdParty.init(),
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkIfVerified,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
                thirdPartyEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            primUser = (await AccountLinking.createPrimaryUser(primUser.loginMethods[0].recipeUserId)).user;
            assert(primUser.isPrimaryUser);

            const tpSignUpResp = await ThirdParty.manuallyCreateOrUpdateUser("tenant1", "tpid", "asdf", email, false);

            const shareRes = await MultiTenancy.associateUserToTenant("tenant1", primUser.loginMethods[0].recipeUserId);
            assert.strictEqual(shareRes.status, "OK");

            const resp = await AccountLinking.isSignInAllowed("tenant1", tpSignUpResp.recipeUserId);
            assert.deepStrictEqual(resp, false);
        });

        it("should return true if a conflicting user is only on a different tenant", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init(),
                    EmailVerification.init({
                        mode: "REQUIRED",
                    }),
                    MultiTenancy.init(),
                    EmailPassword.init(),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: automaticallyLinkIfVerified,
                    }),
                ],
            });

            const createTenant = await MultiTenancy.createOrUpdateTenant("tenant1", {
                emailPasswordEnabled: true,
                passwordlessEnabled: true,
            });
            assert.strictEqual(createTenant.status, "OK");

            const email = `test+${Date.now()}@example.com`;
            const password = "password123";
            let primUser = (await EmailPassword.signUp("public", email, password)).user;
            primUser = (await AccountLinking.createPrimaryUser(primUser.loginMethods[0].recipeUserId)).user;
            assert(primUser.isPrimaryUser);

            const pwlessSignUpResp = await Passwordless.signInUp({
                email,
                tenantId: "tenant1",
                userContext: { doNotLink: true },
            });

            const resp = await AccountLinking.isSignInAllowed("tenant1", pwlessSignUpResp.recipeUserId);
            assert.deepStrictEqual(resp, true);
        });
    });
});

const automaticallyLinkNoVerify = async (_accountInfo, _user, _session, _tenantId, userContext) => {
    if (userContext.doNotLink === true) {
        return { shouldAutomaticallyLink: false };
    }
    return {
        shouldAutomaticallyLink: true,
        shouldRequireVerification: false,
    };
};

const automaticallyLinkIfVerified = async (_accountInfo, _user, _session, _tenantId, userContext) => {
    if (userContext?.doNotLink === true) {
        return { shouldAutomaticallyLink: false };
    }
    return {
        shouldAutomaticallyLink: true,
        shouldRequireVerification: true,
    };
};
