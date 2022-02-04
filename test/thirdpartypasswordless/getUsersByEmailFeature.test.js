const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
let STExpress = require("../../");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let ThirdPartyPasswordlessRecipe = require("../../lib/build/recipe/thirdpartypasswordless/recipe").default;
let ThirdPartyPasswordless = require("../../lib/build/recipe/thirdpartypasswordless");
const { thirdPartySignInUp } = require("../../lib/build/recipe/thirdpartypasswordless");
const { getUsersByEmail } = require("../../lib/build/recipe/thirdpartypasswordless");
const { maxVersion } = require("../../lib/build/utils");
let { Querier } = require("../../lib/build/querier");
let { middleware, errorHandler } = require("../../framework/express");

describe(`getUsersByEmail: ${printPath("[test/thirdpartypasswordless/getUsersByEmailFeature.test.js]")}`, function () {
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
            ThirdPartyPasswordless.init({
                contactMethod: "EMAIL",
                createAndSendCustomEmail: (input) => {
                    return;
                },
                flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                providers: [MockThirdPartyProvider],
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

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
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
                ThirdPartyPasswordless.init({
                    contactMethod: "EMAIL",
                    createAndSendCustomEmail: (input) => {
                        return;
                    },
                    flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    providers: [MockThirdPartyProvider, MockThirdPartyProvider2],
                }),
            ],
        });

        // run test if current CDI version >= 2.11
        if (!(await isCDIVersionCompatible("2.11"))) {
            return;
        }

        await thirdPartySignInUp("mock", "thirdPartyJohnDoe", { id: "john.doe@example.com", isVerified: true });
        await thirdPartySignInUp("mock2", "thirdPartyDaveDoe", { id: "john.doe@example.com", isVerified: false });

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
