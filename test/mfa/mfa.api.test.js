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

const {
    printPath,
    setupST,
    startSTWithMultitenancy,
    killAllST,
    cleanST,
    extractInfoFromResponse,
} = require("../utils");
let assert = require("assert");
const express = require("express");
let { ProcessState } = require("../../lib/build/processState");
let SuperTokens = require("../../");
let { middleware, errorHandler } = require("../../framework/express");
let MultiFactorAuth = require("../../lib/build/recipe/multifactorauth");
let MultiFactorAuthRecipe = require("../../lib/build/recipe/multifactorauth/recipe").default;
let UserMetadata = require("../../lib/build/recipe/usermetadata");
let Session = require("../../lib/build/recipe/session");
let Totp = require("../../lib/build/recipe/totp");
let EmailPassword = require("../../lib/build/recipe/emailpassword");
let Passwordless = require("../../lib/build/recipe/passwordless");
let ThirdParty = require("../../lib/build/recipe/thirdparty");
let Multitenancy = require("../../lib/build/recipe/multitenancy");
let AccountLinking = require("../../lib/build/recipe/accountlinking");
const OTPAuth = require("otpauth");
const { json } = require("body-parser");
const request = require("supertest");
const {
    epSignIn,
    epSignUp,
    plessEmailSignInUp,
    plessPhoneSigninUp,
    tpSignInUp,
    getMfaInfo,
    getTestExpressApp,
} = require("./utils");

describe(`mfa-api: ${printPath("[test/mfa/mfa.api.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test with firstFactors not set allows all factors", async function () {
        const connectionURI = await startSTWithMultitenancy();
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
                EmailPassword.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                }),
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "custom",
                                    clients: [
                                        {
                                            clientId: "clientid1",
                                        },
                                    ],
                                },
                                override: (oI) => {
                                    oI.exchangeAuthCodeForOAuthTokens = async (input) => {
                                        return input.redirectURIInfo.redirectURIQueryParams;
                                    };
                                    oI.getUserInfo = async (input) => {
                                        return {
                                            thirdPartyUserId: input.oAuthTokens.email,
                                            email: {
                                                id: input.oAuthTokens.email,
                                                isVerified: true,
                                            },
                                        };
                                    };
                                    return oI;
                                },
                            },
                            {
                                config: {
                                    thirdPartyId: "custom2",
                                    clients: [
                                        {
                                            clientId: "clientid1",
                                        },
                                    ],
                                },
                                override: (oI) => {
                                    oI.exchangeAuthCodeForOAuthTokens = async (input) => {
                                        return input.redirectURIInfo.redirectURIQueryParams;
                                    };
                                    oI.getUserInfo = async (input) => {
                                        return {
                                            thirdPartyUserId: "custom2" + input.oAuthTokens.email,
                                            email: {
                                                id: input.oAuthTokens.email,
                                                isVerified: true,
                                            },
                                        };
                                    };
                                    return oI;
                                },
                            },
                        ],
                    },
                }),
                Totp.init(),
                MultiFactorAuth.init(),
                Session.init(),
            ],
        });

        const app = getTestExpressApp();

        let res = await epSignUp(app, "test@example.com", "password1");
        assert.equal("OK", res.body.status);

        res = await tpSignInUp(app, "custom", "test@example.com");
        assert.equal("OK", res.body.status);

        res = await plessEmailSignInUp(app, "test@example.com");
        assert.equal("OK", res.body.status);
    });

    it("test mfa info after first factor", async function () {
        const connectionURI = await startSTWithMultitenancy();
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
                EmailPassword.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                }),
                ThirdParty.init(),
                Totp.init(),
                MultiFactorAuth.init(),
                Session.init(),
            ],
        });

        const app = getTestExpressApp();

        await EmailPassword.signUp("public", "test@example.com", "password");

        let res = await epSignIn(app, "test@example.com", "password");
        assert.equal("OK", res.body.status);

        let cookies = extractInfoFromResponse(res);
        const accessToken = cookies.accessTokenFromAny;

        res = await getMfaInfo(app, accessToken);
        assert.equal("OK", res.body.status);
        assert.deepEqual(res.body.emails.emailpassword, ["test@example.com"]);
        assert.deepEqual([], res.body.factors.next);
        assert.deepEqual(["emailpassword", "otp-email", "thirdparty", "totp"], res.body.factors.isAllowedToSetup);

        res = await plessEmailSignInUp(app, "test@example.com", accessToken);
        assert.equal("OK", res.body.status);
        // the users must have been account linked now
        assert.equal(true, res.body.user.isPrimaryUser);
        assert.equal(2, res.body.user.loginMethods.length);

        res = await getMfaInfo(app, accessToken);
        assert.equal("OK", res.body.status);
        assert.deepEqual(res.body.emails.emailpassword, ["test@example.com"]);
        assert.deepEqual(res.body.emails["otp-email"], ["test@example.com"]);

        assert.deepEqual([], res.body.factors.next);
        assert.deepEqual(["emailpassword", "otp-email", "thirdparty", "totp"], res.body.factors.isAllowedToSetup);
    });

    it("test that only a valid first factor is allowed to login", async function () {
        const connectionURI = await startSTWithMultitenancy();
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
                EmailPassword.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                }),
                ThirdParty.init(),
                Totp.init(),
                MultiFactorAuth.init({
                    firstFactors: ["emailpassword"],
                }),
                Session.init(),
            ],
        });

        const app = getTestExpressApp();

        await EmailPassword.signUp("public", "test@example.com", "password");

        let res = await epSignIn(app, "test@example.com", "password");
        assert.equal("OK", res.body.status);

        res = await plessEmailSignInUp(app, "test@example.com", undefined);
        assert.equal(401, res.status);
    });

    it("test that only a valid first factor is allowed to login and tenant config is prioritised", async function () {
        const connectionURI = await startSTWithMultitenancy();
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
                EmailPassword.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                }),
                ThirdParty.init(),
                Totp.init(),
                MultiFactorAuth.init({
                    firstFactors: ["emailpassword"],
                }),
                Session.init(),
            ],
        });

        const app = getTestExpressApp();

        await Multitenancy.createOrUpdateTenant("public", {
            firstFactors: ["emailpassword", "otp-email"],
        });

        await EmailPassword.signUp("public", "test@example.com", "password");

        let res = await epSignIn(app, "test@example.com", "password");
        assert.equal("OK", res.body.status);

        res = await plessEmailSignInUp(app, "test@example.com");
        assert.equal("OK", res.body.status);
    });

    it("test that once user has more than one factor setup, they need 2FA to setup a new factor", async function () {
        const connectionURI = await startSTWithMultitenancy();
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
                EmailPassword.init(),
                Passwordless.init({
                    contactMethod: "EMAIL_OR_PHONE",
                    flowType: "USER_INPUT_CODE",
                }),
                ThirdParty.init(),
                Totp.init(),
                MultiFactorAuth.init(),
                Session.init(),
            ],
        });

        const app = getTestExpressApp();

        await Multitenancy.createOrUpdateTenant("public", {
            requiredSecondaryFactors: ["otp-email", "otp-phone"],
        });

        await EmailPassword.signUp("public", "test@example.com", "password");

        let res = await epSignIn(app, "test@example.com", "password");
        assert.equal("OK", res.body.status);

        let cookies = extractInfoFromResponse(res);
        let accessToken = cookies.accessTokenFromAny;

        res = await plessEmailSignInUp(app, "test@example.com", accessToken);
        assert.equal("OK", res.body.status);
        assert.equal(true, res.body.user.isPrimaryUser);
        assert.equal(2, res.body.user.loginMethods.length);

        // Try setting up totp without 2FA
        res = await epSignIn(app, "test@example.com", "password");
        assert.equal("OK", res.body.status);

        cookies = extractInfoFromResponse(res);
        accessToken = cookies.accessTokenFromAny;

        res = await plessPhoneSigninUp(app, "+919876543210", accessToken);
        assert.equal("SIGN_IN_UP_NOT_ALLOWED", res.body.status);
    });

    it("test that existing user sign in results in factor setup not allowed error", async function () {
        const connectionURI = await startSTWithMultitenancy();
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
                EmailPassword.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                }),
                ThirdParty.init(),
                Totp.init(),
                MultiFactorAuth.init({
                    firstFactors: ["emailpassword"],
                }),
                Session.init(),
            ],
        });

        const app = getTestExpressApp();

        await Multitenancy.createOrUpdateTenant("public", {
            firstFactors: ["emailpassword", "otp-email"],
        });

        await EmailPassword.signUp("public", "test1@example.com", "password");
        await EmailPassword.signUp("public", "test2@example.com", "password");

        let res = await epSignIn(app, "test1@example.com", "password");
        assert.equal("OK", res.body.status);

        let cookies = extractInfoFromResponse(res);
        let accessToken = cookies.accessTokenFromAny;

        res = await epSignIn(app, "test2@example.com", "password", accessToken);
        assert.equal("SIGN_IN_NOT_ALLOWED", res.body.status);
        assert.equal(
            "The factor you are trying to complete is not setup with the current user account. Please contact support. (ERR_CODE_009)",
            res.body.reason
        );

        cookies = extractInfoFromResponse(res);
        assert.equal(undefined, cookies.accessTokenFromAny);
    });

    it("test that a different primary user login throws factor setup not allowed error", async function () {
        const connectionURI = await startSTWithMultitenancy();
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
                EmailPassword.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                }),
                ThirdParty.init(),
                Totp.init(),
                MultiFactorAuth.init({
                    firstFactors: ["emailpassword"],
                }),
                Session.init(),
            ],
        });

        const app = getTestExpressApp();

        const user1 = await EmailPassword.signUp("public", "test1@example.com", "password");
        const user2 = await Passwordless.signInUp({
            tenantId: "public",
            email: "test1@example.com",
        });
        await AccountLinking.createPrimaryUser(user1.recipeUserId);
        await AccountLinking.linkAccounts(user2.recipeUserId, user1.user.id);

        const user3 = await EmailPassword.signUp("public", "test2@example.com", "password");
        const user4 = await Passwordless.signInUp({
            tenantId: "public",
            email: "test2@example.com",
        });
        await AccountLinking.createPrimaryUser(user3.recipeUserId);
        await AccountLinking.linkAccounts(user4.recipeUserId, user3.user.id);

        res = await epSignIn(app, "test2@example.com", "password");
        assert.equal("OK", res.body.status);

        let cookies = extractInfoFromResponse(res);
        const accessToken = cookies.accessTokenFromAny;

        res = await plessEmailSignInUp(app, "test1@example.com", accessToken);
        assert.equal("SIGN_IN_UP_NOT_ALLOWED", res.body.status);
        assert.equal(
            "The factor you are trying to complete is not setup with the current user account. Please contact support. (ERR_CODE_009)",
            res.body.reason
        );
        cookies = extractInfoFromResponse(res);
        assert.equal(undefined, cookies.accessTokenFromAny);
    });
});
