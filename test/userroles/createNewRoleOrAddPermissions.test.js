const assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
const STExpress = require("../..");
const { ProcessState } = require("../../lib/build/processState");
const UserRolesRecipe = require("../../lib/build/recipe/userroles").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`createNewRoleOrAddPermissionsTest: ${printPath(
    "[test/usermetadata/createNewRoleOrAddPermissions.test.js]"
)}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("createNewRoleOrAddPermissions", () => {
        it("create a new role", async function () {
            await startST();

            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [UserRolesRecipe.init()],
            });

            // Only run for version >= 2.14
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.13") === "2.13") {
                return this.skip();
            }

            const result = await UserRolesRecipe.createNewRoleOrAddPermissions("newRole", []);
            assert.strictEqual(result.status, "OK");
            assert.strictEqual(result.createdNewRole, true);
        });

        it("create the same role twice", async function () {
            await startST();

            const role = "role";

            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [UserRolesRecipe.init()],
            });

            // Only run for version >= 2.14
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.13") === "2.13") {
                return this.skip();
            }

            {
                const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, []);
                assert.strictEqual(result.status, "OK");
                assert.strictEqual(result.createdNewRole, true);
            }

            {
                const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, []);
                assert.strictEqual(result.status, "OK");
                assert.strictEqual(result.createdNewRole, false);
            }
        });

        it("create a role with permissions", async function () {
            await startST();

            const role = "role";
            const permissions = ["permission1"];

            STExpress.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [UserRolesRecipe.init()],
            });

            // Only run for version >= 2.14
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.13") === "2.13") {
                return this.skip();
            }

            const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, permissions);
            assert.strictEqual(result.status, "OK");
            assert.strictEqual(result.createdNewRole, true);

            // get permissions for roles
            const retrievedPermissions = await UserRolesRecipe.getPermissionsForRole(role);
        });
    });
});
