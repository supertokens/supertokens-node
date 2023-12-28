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

describe(`mfa with account linking: ${printPath("[test/mfa/mfa.withAccountLinking.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test that thirdparty user sign up is rejected when another user with same email unverified exists", async function () {
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
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: async () => ({
                        shouldAutomaticallyLink: true,
                        shouldRequireVerification: true,
                    }),
                }),
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

        let res = await epSignUp(app, "test1@example.com", "password1", undefined);
        assert.equal("OK", res.body.status);

        let cookies = extractInfoFromResponse(res);
        let accessToken = cookies.accessTokenFromAny;

        res = await plessPhoneSigninUp(app, "+919876543210", accessToken);
        assert.equal("OK", res.body.status);

        res = await tpSignInUp(app, "custom", "test1@example.com", undefined);
        assert.equal("SIGN_IN_UP_NOT_ALLOWED", res.body.status);
    });

    it("test factor setup with same email as another existing user when automatic account linking is turned off", async function () {
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

        let res = await tpSignInUp(app, "custom", "test1@example.com", undefined);
        assert.equal("OK", res.body.status);

        res = await epSignUp(app, "test2@example.com", "password1", undefined);
        assert.equal("OK", res.body.status);

        let cookies = extractInfoFromResponse(res);
        let accessToken = cookies.accessTokenFromAny;

        res = await plessEmailSignInUp(app, "test1@example.com", accessToken);
        assert.equal("OK", res.body.status);
        assert.equal(true, res.body.user.isPrimaryUser);
        assert.equal(2, res.body.user.loginMethods.length);
        assert.equal("emailpassword", res.body.user.loginMethods[0].recipeId);
        assert.equal("passwordless", res.body.user.loginMethods[1].recipeId);
    });

    it("test factor setup with same email as another existing user when automatic account linking is turned on but verification not required", async function () {
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
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: () => {
                        return {
                            shouldAutomaticallyLink: true,
                            shouldRequireVerification: false,
                        };
                    },
                }),
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

        let res = await tpSignInUp(app, "custom", "test1@example.com", undefined);
        assert.equal("OK", res.body.status);

        res = await epSignUp(app, "test2@example.com", "password1", undefined);
        assert.equal("OK", res.body.status);

        let cookies = extractInfoFromResponse(res);
        let accessToken = cookies.accessTokenFromAny;

        res = await plessEmailSignInUp(app, "test1@example.com", accessToken);
        assert.equal("SIGN_IN_UP_NOT_ALLOWED", res.body.status);
        assert.equal(
            "Cannot setup factor because there is another account with same email or phone number. Please contact support. (ERR_CODE_012)",
            res.body.reason
        );

        const usersRes = await SuperTokens.getUsersOldestFirst({
            tenantId: "public",
        });

        // we expect only 2 users because we should not have the user created by the factor setup, since the factor setup is expected to fail
        assert.equal(2, usersRes.users.length);
    });

    it("test factor setup with same email as another existing user when automatic account linking is turned on and verification is required", async function () {
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
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: () => {
                        return {
                            shouldAutomaticallyLink: true,
                            shouldRequireVerification: true,
                        };
                    },
                }),
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

        let res = await tpSignInUp(app, "custom", "test1@example.com", undefined);
        assert.equal("OK", res.body.status);

        res = await epSignUp(app, "test2@example.com", "password1", undefined);
        assert.equal("OK", res.body.status);

        let cookies = extractInfoFromResponse(res);
        let accessToken = cookies.accessTokenFromAny;

        res = await plessEmailSignInUp(app, "test1@example.com", accessToken);
        assert.equal("SIGN_IN_UP_NOT_ALLOWED", res.body.status);
        assert.equal(
            "Cannot setup factor because there is another account with same email or phone number. Please contact support. (ERR_CODE_012)",
            res.body.reason
        );

        const usersRes = await SuperTokens.getUsersOldestFirst({
            tenantId: "public",
        });

        // we expect only 2 users because we should not have the user created by the factor setup, since the factor setup is expected to fail
        assert.equal(2, usersRes.users.length);
    });

    it("test factor setup with thirdparty same email as another existing user when automatic account linking is turned on and verification is required", async function () {
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
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: () => {
                        return {
                            shouldAutomaticallyLink: true,
                            shouldRequireVerification: true,
                        };
                    },
                }),
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

        let res = await tpSignInUp(app, "custom", "test1@example.com", undefined);
        assert.equal("OK", res.body.status);

        res = await epSignUp(app, "test2@example.com", "password1", undefined);
        assert.equal("OK", res.body.status);

        let cookies = extractInfoFromResponse(res);
        let accessToken = cookies.accessTokenFromAny;

        res = await tpSignInUp(app, "custom", "test2@example.com", accessToken);
        assert.equal("OK", res.body.status);

        res = await tpSignInUp(app, "custom2", "test1@example.com", accessToken);
        assert.equal("SIGN_IN_UP_NOT_ALLOWED", res.body.status);
        assert.equal(
            "Cannot setup factor because there is another account with same email or phone number. Please contact support. (ERR_CODE_012)",
            res.body.reason
        );

        const usersRes = await SuperTokens.getUsersOldestFirst({
            tenantId: "public",
        });

        // we expect only 2 users because we should not have the user created by the factor setup, since the factor setup is expected to fail
        assert.equal(2, usersRes.users.length);
    });

    it("test that unverified sign up is not allowed as a factor setup", async function () {
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
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: async () => ({
                        shouldAutomaticallyLink: true,
                        shouldRequireVerification: true,
                    }),
                }),
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

        let res = await tpSignInUp(app, "custom", "test@example.com", undefined);
        assert.equal("OK", res.body.status);

        let cookies = extractInfoFromResponse(res);
        let accessToken = cookies.accessTokenFromAny;

        res = await epSignUp(app, "test2@example.com", "password1", accessToken);
        assert.equal("SIGN_UP_NOT_ALLOWED", res.body.status);
        assert.equal("The factor setup is not allowed because the email is not verified. Please contact support. (ERR_CODE_010)", res.body.reason);
    });

    it("test with account linking case 1", async function () {
        // auto account linking is turned off
        // Google signing up with e2  -> recipe user
        // auto account linking is turned on
        // Sign up with google with email e1 (with auto account linking on + verification required)
        // Second factor is email password e2 -> should be rejected
        // Google signing in with e2 -> should be allowed and become a primary user.

        let shouldAutomaticallyLink = false;
        let shouldRequireVerification = false;

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
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: async () => ({
                        shouldAutomaticallyLink,
                        shouldRequireVerification,
                    }),
                }),
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
                MultiFactorAuth.init({
                    firstFactors: ["emailpassword", "thirdparty"],
                }),
                Session.init(),
            ],
        });

        const app = getTestExpressApp();

        let res = await tpSignInUp(app, "custom", "test2@example.com");
        assert.equal("OK", res.body.status);

        shouldAutomaticallyLink = true;
        shouldRequireVerification = true;

        res = await tpSignInUp(app, "custom", "test1@example.com");
        assert.equal("OK", res.body.status);

        let cookies = extractInfoFromResponse(res);
        let accessToken = cookies.accessTokenFromAny;

        res = await epSignUp(app, "test2@example.com", "password2", accessToken);
        assert.equal("SIGN_UP_NOT_ALLOWED", res.body.status);
        assert.equal("The factor setup is not allowed because the email is not verified. Please contact support. (ERR_CODE_010)", res.body.reason);

        res = await tpSignInUp(app, "custom", "test2@example.com", undefined);
        assert.equal("OK", res.body.status);

        assert.equal(true, res.body.user.isPrimaryUser);
    });

    it("test with account linking case 2", async function () {
        // auto account linking is turned off
        // Google signing up with e2  -> recipe user
        // auto account linking is turned on
        // Sign up with google with email e1 (with auto account linking on + verification required)
        // Second factor is email otp e2 -> should be linked
        // Google signing in with e2 -> should link with google account with email e1

        let shouldAutomaticallyLink = false;
        let shouldRequireVerification = false;

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
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: async () => ({
                        shouldAutomaticallyLink,
                        shouldRequireVerification,
                    }),
                }),
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
                MultiFactorAuth.init({
                    firstFactors: ["emailpassword", "thirdparty"],
                }),
                Session.init(),
            ],
        });

        const app = getTestExpressApp();

        let res = await tpSignInUp(app, "custom", "test2@example.com");
        assert.equal("OK", res.body.status);

        shouldAutomaticallyLink = true;
        shouldRequireVerification = true;

        res = await tpSignInUp(app, "custom", "test1@example.com");
        assert.equal("OK", res.body.status);

        let cookies = extractInfoFromResponse(res);
        let accessToken = cookies.accessTokenFromAny;

        res = await plessEmailSignInUp(app, "test2@example.com", accessToken);
        assert.equal("OK", res.body.status);

        res = await tpSignInUp(app, "custom", "test2@example.com", undefined);
        assert.equal("OK", res.body.status);
        assert.equal(true, res.body.user.isPrimaryUser);
        assert.equal(3, res.body.user.loginMethods.length);
    });
});
