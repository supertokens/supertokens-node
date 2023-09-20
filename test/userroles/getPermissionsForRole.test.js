const assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST, areArraysEqual } = require("../utils");
const STExpress = require("../..");
const { ProcessState } = require("../../lib/build/processState");
const UserRolesRecipe = require("../../lib/build/recipe/userroles").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");
const { default: SessionRecipe } = require("../../lib/build/recipe/session/recipe");

describe(`getPermissionsForRole: ${printPath("[test/userroles/getPermissionsForRole.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("getPermissionsForRole", () => {
        it("get permissions for a role", async function () {
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

            const role = "role";
            const permissions = ["permission1", "permission2", "permission3"];

            // create role
            {
                const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, permissions);
                assert.strictEqual(result.status, "OK");
                assert(result.createdNewRole);
            }

            // retrieve the permissions for the role
            const result = await UserRolesRecipe.getPermissionsForRole(role);

            assert.strictEqual(result.status, "OK");
            assert(areArraysEqual(permissions, result.permissions));
        });

        it("get permissions for an unknown role", async function () {
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

            // retrieve the users for role that does not exist
            const result = await UserRolesRecipe.getPermissionsForRole("unknownRole");
            assert.strictEqual(result.status, "UNKNOWN_ROLE_ERROR");
        });
    });
});
