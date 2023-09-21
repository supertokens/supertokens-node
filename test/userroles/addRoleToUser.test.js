const assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST, areArraysEqual } = require("../utils");
const STExpress = require("../..");
const { ProcessState } = require("../../lib/build/processState");
const UserRolesRecipe = require("../../lib/build/recipe/userroles").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");
const { default: SessionRecipe } = require("../../lib/build/recipe/session/recipe");

describe(`addRoleToUserTest: ${printPath("[test/userroles/addRoleToUser.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("addRoleToUserTest", () => {
        it("add a role to a user", async function () {
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
            const role = "role";

            // create a new role
            {
                const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, []);
                assert.strictEqual(result.status, "OK");
                assert(result.createdNewRole);
            }

            // add the role to a user
            {
                const result = await UserRolesRecipe.addRoleToUser("public", userId, role);
                assert.strictEqual(result.status, "OK");
                assert(!result.didUserAlreadyHaveRole);
            }

            // check that user has role
            {
                const result = await UserRolesRecipe.getRolesForUser("public", userId);
                assert.strictEqual(result.status, "OK");
                assert.strictEqual(result.roles.length, 1);
                assert.strictEqual(result.roles[0], role);
            }
        });

        it("add duplicate role to the user", async function () {
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
            const role = "role";

            // create a new role
            {
                const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, []);
                assert.strictEqual(result.status, "OK");
                assert(result.createdNewRole);
            }

            // add the role to a user
            {
                const result = await UserRolesRecipe.addRoleToUser("public", userId, role);
                assert.strictEqual(result.status, "OK");
                assert(!result.didUserAlreadyHaveRole);
            }

            // add the same role to the user
            {
                const result = await UserRolesRecipe.addRoleToUser("public", userId, role);
                assert.strictEqual(result.status, "OK");
                assert(result.didUserAlreadyHaveRole);
            }

            // check that user has role
            {
                const result = await UserRolesRecipe.getRolesForUser("public", userId);
                assert.strictEqual(result.status, "OK");
                assert.strictEqual(result.roles.length, 1);
                assert.strictEqual(result.roles[0], role);
            }
        });

        it("add unknown role to the user", async function () {
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
            const role = "unknownRole";

            // add the unknown role to the user
            {
                const result = await UserRolesRecipe.addRoleToUser("public", userId, role);
                assert.strictEqual(result.status, "UNKNOWN_ROLE_ERROR");
            }
        });
    });
});
