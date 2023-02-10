const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdPartyEmailPassword = require("../../recipe/thirdpartyemailpassword");
const {
    thirdPartySignInUp,
    getUsersByEmail,
    emailPasswordSignUp,
    thirdPartyManuallyCreateOrUpdateUser,
} = require("../../lib/build/recipe/thirdpartyemailpassword");
const { maxVersion } = require("../../lib/build/utils");
let { Querier } = require("../../lib/build/querier");
let { middleware, errorHandler } = require("../../framework/express");

describe(`getUsersByEmail: ${printPath("[test/thirdpartyemailpassword/getUsersByEmailFeature.test.js]")}`, function () {
    const MockThirdPartyProvider = {
        id: "mock",
    };

    const MockThirdPartyProvider2 = {
        id: "mock2",
    };

    const testSTConfig = {
        supertokens: {
            connectionURI: "http://localhost:8080",
        },
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            websiteDomain: "supertokens.io",
        },
        recipeList: [
            ThirdPartyEmailPassword.init({
                signInAndUpFeature: {
                    providers: [MockThirdPartyProvider],
                },
            }),
        ],
    };

    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("invalid email yields empty users array", async function () {
        await startST();
        STExpress.init(testSTConfig);

        let apiVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion();
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        // given there are no users

        // when
        const thirdPartyUsers = await getUsersByEmail("john.doe@example.com");

        // then
        assert.strictEqual(thirdPartyUsers.length, 0);
    });

    it("valid email yields third party users", async function () {
        await startST();
        STExpress.init({
            ...testSTConfig,
            recipeList: [
                ThirdPartyEmailPassword.init({
                    signInAndUpFeature: {
                        providers: [MockThirdPartyProvider, MockThirdPartyProvider2],
                    },
                }),
            ],
        });

        let apiVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion();
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        await emailPasswordSignUp("john.doe@example.com", "somePass");
        await thirdPartyManuallyCreateOrUpdateUser("mock", "thirdPartyJohnDoe", "john.doe@example.com");
        await thirdPartyManuallyCreateOrUpdateUser("mock2", "thirdPartyDaveDoe", "john.doe@example.com");

        const thirdPartyUsers = await getUsersByEmail("john.doe@example.com");

        assert.strictEqual(thirdPartyUsers.length, 3);

        thirdPartyUsers.forEach((user) => {
            assert.strictEqual(user.email, "john.doe@example.com");
        });
    });
});
