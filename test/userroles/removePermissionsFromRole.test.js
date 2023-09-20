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
        it("remove permissions from a role", async function () {
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

            // create role with permissions
            {
                const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, permissions);
                assert.strictEqual(result.status, "OK");
                assert(result.createdNewRole);
            }

            // remove permissions from role
            {
                const result = await UserRolesRecipe.removePermissionsFromRole(role, ["permission3"]);
                assert.strictEqual(result.status, "OK");
            }

            // check that permission has been removed from the role
            {
                const result = await UserRolesRecipe.getPermissionsForRole(role);
                assert.strictEqual(result.status, "OK");
                assert.strictEqual(result.permissions.length, 2);
                assert(!result.permissions.includes("permission3"));
            }
        });

        it("remove permissions from an unknown role", async function () {
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

            // remove permission from an unknown role
            const result = await UserRolesRecipe.removePermissionsFromRole("unknownRole");
            assert.strictEqual(result.status, "UNKNOWN_ROLE_ERROR");
        });
    });
});
