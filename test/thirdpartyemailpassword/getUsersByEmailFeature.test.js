const { printPath, setupST, startST, killAllST, cleanST, createServerlessCacheForTesting } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdPartyEmailPassword = require("../../recipe/thirdpartyemailpassword");
const { signInUp, getUsersByEmail, signUp } = require("../../lib/build/recipe/thirdpartyemailpassword");
const { removeServerlessCache } = require("../../lib/build/utils");

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
        await createServerlessCacheForTesting();
        await removeServerlessCache();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("invalid email yields empty users array", async function () {
        await startST();
        STExpress.init(testSTConfig);

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

        await signUp("john.doe@example.com", "somePass");
        await signInUp("mock", "thirdPartyJohnDoe", { id: "john.doe@example.com", isVerified: true });
        await signInUp("mock2", "thirdPartyDaveDoe", { id: "john.doe@example.com", isVerified: false });

        const thirdPartyUsers = await getUsersByEmail("john.doe@example.com");

        assert.strictEqual(thirdPartyUsers.length, 3);

        thirdPartyUsers.forEach((user) => {
            assert.strictEqual(user.email, "john.doe@example.com");
        });
    });
});
