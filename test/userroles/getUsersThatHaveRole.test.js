const assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST, areArraysEqual } = require("../utils");
const STExpress = require("../..");
const { ProcessState } = require("../../lib/build/processState");
const UserRolesRecipe = require("../../lib/build/recipe/userroles").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");
const { default: SessionRecipe } = require("../../lib/build/recipe/session/recipe");

describe(`getUsersThatHaveRole: ${printPath("[test/userroles/getUsersThatHaveRole.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("getUsersThatHaveRole", () => {
        it("get users for a role", async function () {
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

            const users = ["user1", "user2", "user3"];
            const role = "role";

            // create role
            {
                const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, []);
                assert.strictEqual(result.status, "OK");
                assert(result.createdNewRole);
            }

            // add them to a user
            for (let user in users) {
                const response = await UserRolesRecipe.addRoleToUser("public", users[user], role);
                assert.strictEqual(response.status, "OK");
                assert(!response.didUserAlreadyHaveRole);
            }

            // retrieve the users for role
            const result = await UserRolesRecipe.getUsersThatHaveRole("public", role);
            assert.strictEqual(result.status, "OK");
            assert(areArraysEqual(users, result.users));
        });

        it("get users for an unknown role", async function () {
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

            // retrieve the users for role which that not exist
            const result = await UserRolesRecipe.getUsersThatHaveRole("public", "unknownRole");
            assert.strictEqual(result.status, "UNKNOWN_ROLE_ERROR");
        });
    });
});
