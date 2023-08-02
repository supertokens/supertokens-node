const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdPartyRecipe = require("../../lib/build/recipe/thirdparty/recipe").default;
const { manuallyCreateOrUpdateUser } = require("../../lib/build/recipe/thirdparty");
const { maxVersion } = require("../../lib/build/utils");
let { Querier } = require("../../lib/build/querier");
let { middleware, errorHandler } = require("../../framework/express");

describe(`getUsersByEmail: ${printPath("[test/thirdparty/getUsersByEmailFeature.test.js]")}`, function () {
    const MockThirdPartyProvider = {
        config: {
            thirdPartyId: "mock",
        },
    };

    const MockThirdPartyProvider2 = {
        config: {
            thirdPartyId: "mock2",
        },
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

        let apiVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion();
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        // given there are no users

        // when
        const thirdPartyUsers = await STExpress.listUsersByAccountInfo({ email: "john.doe@example.com" });

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

        let apiVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion();
        if (maxVersion(apiVersion, "2.7") === "2.7") {
            return;
        }

        await manuallyCreateOrUpdateUser("public", "mock", "thirdPartyJohnDoe", "john.doe@example.com", false);
        await manuallyCreateOrUpdateUser("public", "mock2", "thirdPartyDaveDoe", "john.doe@example.com", false);

        const thirdPartyUsers = await STExpress.listUsersByAccountInfo({ email: "john.doe@example.com" });

        assert.strictEqual(thirdPartyUsers.length, 2);

        thirdPartyUsers.forEach((user) => {
            assert.notStrictEqual(user.loginMethods[0].thirdParty.id, undefined);
            assert.notStrictEqual(user.id, undefined);
            assert.notStrictEqual(user.loginMethods[0].recipeUserId.getAsString(), undefined);
            assert.notStrictEqual(user.loginMethods[0].timeJoined, undefined);
            assert.strictEqual(user.loginMethods[0].email, "john.doe@example.com");
        });
    });
});
