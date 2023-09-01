const assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST, areArraysEqual } = require("../utils");
const STExpress = require("../..");
const { ProcessState } = require("../../lib/build/processState");
const UserRolesRecipe = require("../../lib/build/recipe/userroles").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");
const { default: SessionRecipe } = require("../../lib/build/recipe/session/recipe");

describe(`getRolesForUser: ${printPath("[test/userroles/getRolesForUser.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("getRolesForUser", () => {
        it("create roles, add them to a user check that the user has the roles", async function () {
            const connectionURI = await startST();

            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [SessionRecipe.init(), UserRolesRecipe.init()],
            });

            // Only run for version >= 2.14
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.13") === "2.13") {
                return this.skip();
            }

            const userId = "userId";
            const roles = ["role1", "role2", "role3"];

            // create roles and add them to a user

            for (let role in roles) {
                const result = await UserRolesRecipe.createNewRoleOrAddPermissions(roles[role], []);
                assert.strictEqual(result.status, "OK");
                assert(result.createdNewRole);

                const response = await UserRolesRecipe.addRoleToUser("public", userId, roles[role]);
                assert.strictEqual(response.status, "OK");
                assert(!response.didUserAlreadyHaveRole);
            }

            // check that user has the roles
            const result = await UserRolesRecipe.getRolesForUser("public", userId);
            assert.strictEqual(result.status, "OK");
            assert(areArraysEqual(roles, result.roles));
        });
    });
});
