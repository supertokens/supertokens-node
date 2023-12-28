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

describe(`mfa race conditions: ${printPath("[test/mfa/mfa.raceConditions.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("for email password", function () {
        it("test when session user cannot become primary", async function () {
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
                            ],
                        },
                    }),
                    Totp.init(),
                    MultiFactorAuth.init(),
                    Session.init(),
                ],
            });

            const app = getTestExpressApp();

            let res = await tpSignInUp(app, "custom", "test@example.com");
            assert.equal("OK", res.body.status);

            let cookies = extractInfoFromResponse(res);
            let accessToken = cookies.accessTokenFromAny;

            MultiFactorAuthRecipe.getInstanceOrThrowError()._induceRaceCondition = async () => {
                let res = await plessEmailSignInUp(app, "test@example.com");
                assert.equal("OK", res.body.status);

                res = await AccountLinking.createPrimaryUser(new SuperTokens.RecipeUserId(res.body.user.id));
                assert.equal("OK", res.status);
            };

            res = await epSignUp(app, "test@example.com", "password1", accessToken);
            assert.equal("SIGN_UP_NOT_ALLOWED", res.body.status);
            let reason = res.body.reason;
            assert.equal(
                "Cannot setup factor because there is another account with same email or phone number. Please contact support. (ERR_CODE_012)",
                reason
            );

            res = await epSignUp(app, "test@example.com", "password1", accessToken);
            assert.equal("SIGN_UP_NOT_ALLOWED", res.body.status);
            assert.equal(reason, res.body.reason);
        });

        it("test when new user became a primary user in parallel", async function () {
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
                            ],
                        },
                    }),
                    Totp.init(),
                    MultiFactorAuth.init(),
                    Session.init(),
                ],
            });

            const app = getTestExpressApp();

            let res = await tpSignInUp(app, "custom", "test@example.com");
            assert.equal("OK", res.body.status);

            let cookies = extractInfoFromResponse(res);
            let accessToken = cookies.accessTokenFromAny;

            MultiFactorAuthRecipe.getInstanceOrThrowError()._induceRaceCondition = async () => {
                // Make the new user primary in parallel
                let users = await SuperTokens.getUsersNewestFirst({ tenantId: "public" });
                await AccountLinking.createPrimaryUser(users.users[0].loginMethods[0].recipeUserId);
            };

            res = await epSignUp(app, "test@example.com", "password1", accessToken);
            assert.equal("SIGN_UP_NOT_ALLOWED", res.body.status);
            let reason = res.body.reason;
            assert.equal(
                "Cannot setup factor because there is another account with same email or phone number. Please contact support. (ERR_CODE_012)",
                reason
            );

            res = await epSignUp(app, "test@example.com", "password1", accessToken);
            assert.equal("SIGN_UP_NOT_ALLOWED", res.body.status);
            assert.equal(reason, res.body.reason);
        });

        it("test when new user linked to another user in parallel", async function () {
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
                            ],
                        },
                    }),
                    Totp.init(),
                    MultiFactorAuth.init(),
                    Session.init(),
                ],
            });

            const app = getTestExpressApp();

            let res = await tpSignInUp(app, "custom", "test@example.com");
            assert.equal("OK", res.body.status);

            let cookies = extractInfoFromResponse(res);
            let accessToken = cookies.accessTokenFromAny;

            MultiFactorAuthRecipe.getInstanceOrThrowError()._induceRaceCondition = async () => {
                // link newly created user to another user
                let users = await SuperTokens.getUsersNewestFirst({ tenantId: "public" });
                let res = await plessPhoneSigninUp(app, "+919876543210");
                await AccountLinking.createPrimaryUser(new SuperTokens.RecipeUserId(res.body.user.id));
                await AccountLinking.linkAccounts(users.users[0].loginMethods[0].recipeUserId, res.body.user.id);
            };

            res = await epSignUp(app, "test@example.com", "password1", accessToken);
            assert.equal("SIGN_UP_NOT_ALLOWED", res.body.status);
            let reason = res.body.reason;
            assert.equal(
                "Cannot setup factor because there is another account with same email or phone number. Please contact support. (ERR_CODE_012)",
                reason
            );

            res = await epSignUp(app, "test@example.com", "password1", accessToken);
            assert.equal("SIGN_UP_NOT_ALLOWED", res.body.status);
            assert.equal(reason, res.body.reason);
        });
    });

    describe("for third party", function () {
        it("test when session user cannot become primary", async function () {
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

            let cookies = extractInfoFromResponse(res);
            let accessToken = cookies.accessTokenFromAny;

            MultiFactorAuthRecipe.getInstanceOrThrowError()._induceRaceCondition = async () => {
                let res = await plessEmailSignInUp(app, "test@example.com");
                assert.equal("OK", res.body.status);

                res = await AccountLinking.createPrimaryUser(new SuperTokens.RecipeUserId(res.body.user.id));
                assert.equal("OK", res.status);
            };

            res = await tpSignInUp(app, "custom", "test@example.com", accessToken);
            assert.equal("SIGN_IN_UP_NOT_ALLOWED", res.body.status);
            let reason = res.body.reason;
            assert.equal(
                "The factor you are trying to complete is not setup with the current user account. Please contact support. (ERR_CODE_009)",
                reason
            );

            res = await tpSignInUp(app, "custom", "test@example.com", accessToken);
            assert.equal("SIGN_IN_UP_NOT_ALLOWED", res.body.status);
            assert.equal(reason, res.body.reason);
        });

        it("test when new user became a primary user in parallel", async function () {
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

            let cookies = extractInfoFromResponse(res);
            let accessToken = cookies.accessTokenFromAny;

            MultiFactorAuthRecipe.getInstanceOrThrowError()._induceRaceCondition = async () => {
                // Make the new user primary in parallel
                let users = await SuperTokens.getUsersNewestFirst({ tenantId: "public" });
                await AccountLinking.createPrimaryUser(users.users[0].loginMethods[0].recipeUserId);
            };

            res = await tpSignInUp(app, "custom", "test@example.com", accessToken);
            assert.equal("SIGN_IN_UP_NOT_ALLOWED", res.body.status);
            let reason = res.body.reason;
            assert.equal(
                "The factor you are trying to complete is not setup with the current user account. Please contact support. (ERR_CODE_009)",
                reason
            );

            res = await tpSignInUp(app, "custom", "test@example.com", accessToken);
            assert.equal("SIGN_IN_UP_NOT_ALLOWED", res.body.status);
            assert.equal(reason, res.body.reason);
        });

        it("test when new user linked to another user in parallel", async function () {
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

            let cookies = extractInfoFromResponse(res);
            let accessToken = cookies.accessTokenFromAny;

            MultiFactorAuthRecipe.getInstanceOrThrowError()._induceRaceCondition = async () => {
                // link newly created user to another user
                let users = await SuperTokens.getUsersNewestFirst({ tenantId: "public" });
                let res = await plessPhoneSigninUp(app, "+919876543210");
                await AccountLinking.createPrimaryUser(new SuperTokens.RecipeUserId(res.body.user.id));
                await AccountLinking.linkAccounts(users.users[0].loginMethods[0].recipeUserId, res.body.user.id);
            };

            res = await tpSignInUp(app, "custom", "test@example.com", accessToken);
            assert.equal("SIGN_IN_UP_NOT_ALLOWED", res.body.status);
            let reason = res.body.reason;
            assert.equal(
                "The factor you are trying to complete is not setup with the current user account. Please contact support. (ERR_CODE_009)",
                reason
            );

            res = await tpSignInUp(app, "custom", "test@example.com", accessToken);
            assert.equal("SIGN_IN_UP_NOT_ALLOWED", res.body.status);
            assert.equal(reason, res.body.reason);
        });

        it("test when new user cannot be linked to session user", async function () {
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

            let cookies = extractInfoFromResponse(res);
            let accessToken = cookies.accessTokenFromAny;

            MultiFactorAuthRecipe.getInstanceOrThrowError()._induceRaceCondition = async () => {
                // link newly created user to another user
                let users = await SuperTokens.getUsersNewestFirst({ tenantId: "public" });
                let res = await plessEmailSignInUp(app, "test2@example.com");
                await AccountLinking.createPrimaryUser(new SuperTokens.RecipeUserId(res.body.user.id));
            };

            res = await tpSignInUp(app, "custom", "test2@example.com", accessToken);
            assert.equal("SIGN_IN_UP_NOT_ALLOWED", res.body.status);
            let reason = res.body.reason;
            assert.equal(
                "The factor you are trying to complete is not setup with the current user account. Please contact support. (ERR_CODE_009)",
                reason
            );

            res = await tpSignInUp(app, "custom", "test2@example.com", accessToken);
            assert.equal("SIGN_IN_UP_NOT_ALLOWED", res.body.status);
            assert.equal(reason, res.body.reason);
        });
    });
});
