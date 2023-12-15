const { printPath, setupST, startSTWithMultitenancy, killAllST, cleanST } = require("../utils");
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

describe(`mfa-recipeFunctions: ${printPath("[test/mfa/mfa.recipeFunctions.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test getFactorsSetupForUser with passwordless otp-email", async function () {
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

        const user = await EmailPassword.signUp("public", "test@example.com", "password");
        let factorIds = await MultiFactorAuth.getFactorsSetupForUser("public", user.user.id);
        assert.deepEqual(factorIds, ["emailpassword", "otp-email"]);
    });

    it("test getFactorsSetupForUser with passwordless otp-email and link-email", async function () {
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
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                }),
                ThirdParty.init(),
                Totp.init(),
                MultiFactorAuth.init(),
                Session.init(),
            ],
        });

        const user = await EmailPassword.signUp("public", "test@example.com", "password");
        let factorIds = await MultiFactorAuth.getFactorsSetupForUser("public", user.user.id);
        assert.deepEqual(factorIds, ["emailpassword", "otp-email", "link-email"]);
    });

    it("test getFactorsSetupForUser with otp-phone", async function () {
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

        const user = await Passwordless.signInUp({
            tenantId: "public",
            phoneNumber: "+919876543210",
        });
        let factorIds = await MultiFactorAuth.getFactorsSetupForUser("public", user.user.id);
        assert.deepEqual(factorIds, ["otp-phone"]);
    });

    it("test getFactorsSetupForUser with totp", async function () {
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

        const user = await Passwordless.signInUp({
            tenantId: "public",
            phoneNumber: "+919876543210",
        });
        const deviceRes = await Totp.createDevice(user.user.id);
        const otp = new OTPAuth.TOTP({
            digits: 6,
            period: 30,
            secret: deviceRes.secret,
        }).generate();
        await Totp.verifyDevice("public", user.user.id, deviceRes.deviceName, otp);

        let factorIds = await MultiFactorAuth.getFactorsSetupForUser("public", user.user.id);
        assert.deepEqual(factorIds, ["otp-phone", "totp"]);
    });

    it("test getFactorsSetupForUser with totp but totp disabled in core", async function () {
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

        const user = await Passwordless.signInUp({
            tenantId: "public",
            phoneNumber: "+919876543210",
        });
        const deviceRes = await Totp.createDevice(user.user.id);
        const otp = new OTPAuth.TOTP({
            digits: 6,
            period: 30,
            secret: deviceRes.secret,
        }).generate();
        await Totp.verifyDevice("public", user.user.id, deviceRes.deviceName, otp);

        await Multitenancy.createOrUpdateTenant("public", { totpEnabled: false });

        let factorIds = await MultiFactorAuth.getFactorsSetupForUser("public", user.user.id);
        assert.deepEqual(factorIds, ["otp-phone"]);
    });

    it("test getFactorsSetupForUser with linked accounts", async function () {
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

        const user1 = await EmailPassword.signUp("public", "test@example.com", "password");
        const user2 = await Passwordless.signInUp({
            tenantId: "public",
            phoneNumber: "+919876543210",
        });
        await AccountLinking.createPrimaryUser(new SuperTokens.RecipeUserId(user1.user.id));
        await AccountLinking.linkAccounts(new SuperTokens.RecipeUserId(user2.user.id), user1.user.id);

        let factorIds = await MultiFactorAuth.getFactorsSetupForUser("public", user1.user.id);
        assert.deepEqual(factorIds, ["emailpassword", "otp-email", "otp-phone"]);
    });

    it("test getMFARequirementsForAuth with passwordless otp-email", async function () {
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

        const user = await EmailPassword.signUp("public", "test@example.com", "password");

        const testCases = [
            { drfu: [], drft: [], c: {}, e: [] },
            { drfu: ["otp-phone"], drft: [], c: {}, e: ["otp-phone"] },
            { drfu: ["otp-phone", "otp-email"], drft: [], c: {}, e: ["otp-phone", "otp-email"] },
            { drfu: ["otp-phone", "otp-email"], drft: [], c: { "otp-email": 0 }, e: ["otp-phone"] },
            { drfu: ["otp-phone"], drft: ["otp-email"], c: {}, e: ["otp-phone", "otp-email"] },
            {
                drfu: ["otp-phone", "otp-email", "totp"],
                drft: [],
                c: { "otp-phone": 0, "otp-email": 1 },
                e: ["otp-email", "totp"],
            },
        ];

        for (const tc of testCases) {
            let requirements = await MultiFactorAuthRecipe.getInstanceOrThrowError().recipeInterfaceImpl.getMFARequirementsForAuth(
                {
                    user: user.user,
                    defaultRequiredFactorIdsForUser: tc.drfu,
                    defaultRequiredFactorIdsForTenant: tc.drft,
                    completedFactors: tc.c,
                    tenantId: "public",
                    accessTokenPayload: {},
                    factorsSetUpForUser: [],
                    userContext: {},
                }
            );
            requirements = requirements[0].oneOf;
            assert(
                requirements.length === tc.e.length &&
                    requirements.every((t) => tc.e.includes(t)) &&
                    tc.e.every((t) => requirements.includes(t))
            );
        }
    });
});
