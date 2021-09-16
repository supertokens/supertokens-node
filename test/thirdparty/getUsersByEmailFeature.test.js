const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdPartyRecipe = require("../../lib/build/recipe/thirdparty/recipe").default;
const { signInUp } = require("../../lib/build/recipe/thirdparty");
const { getUsersByEmail } = require("../../lib/build/recipe/thirdparty");
const { maxVersion } = require("../../lib/build/utils");
let { Querier } = require("../../lib/build/querier");

describe(`getUsersByEmail: ${printPath("[test/thirdparty/getUsersByEmailFeature.test.js]")}`, function () {
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
            ThirdPartyRecipe.init({
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

        let apiVersion = await Querier.getNewInstanceOrThrowError(false).getAPIVersion();
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
                ThirdPartyRecipe.init({
                    signInAndUpFeature: {
                        providers: [MockThirdPartyProvider, MockThirdPartyProvider2],
                    },
                }),
            ],
        });

        let apiVersion = await Querier.getNewInstanceOrThrowError(false).getAPIVersion();
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        await signInUp("mock", "thirdPartyJohnDoe", { id: "john.doe@example.com", isVerified: true });
        await signInUp("mock2", "thirdPartyDaveDoe", { id: "john.doe@example.com", isVerified: false });

        const thirdPartyUsers = await getUsersByEmail("john.doe@example.com");

        assert.strictEqual(thirdPartyUsers.length, 2);

        thirdPartyUsers.forEach((user) => {
            assert.notStrictEqual(user.thirdParty.id, undefined);
            assert.notStrictEqual(user.id, undefined);
            assert.notStrictEqual(user.timeJoined, undefined);
            assert.strictEqual(user.email, "john.doe@example.com");
        });
    });
});
