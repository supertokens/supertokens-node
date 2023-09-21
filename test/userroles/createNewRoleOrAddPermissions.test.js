const assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST, areArraysEqual } = require("../utils");
const STExpress = require("../..");
const { ProcessState } = require("../../lib/build/processState");
const UserRolesRecipe = require("../../lib/build/recipe/userroles").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");
const { default: SessionRecipe } = require("../../lib/build/recipe/session/recipe");

describe(`createNewRoleOrAddPermissionsTest: ${printPath(
    "[test/userroles/createNewRoleOrAddPermissions.test.js]"
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

            const result = await UserRolesRecipe.createNewRoleOrAddPermissions("newRole", []);
            assert.strictEqual(result.status, "OK");
            assert(result.createdNewRole);
        });

        it("create the same role twice", async function () {
            const connectionURI = await startST();

            const role = "role";

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

            {
                const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, []);
                assert.strictEqual(result.status, "OK");
                assert(result.createdNewRole);
            }

            {
                const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, []);
                assert.strictEqual(result.status, "OK");
                assert(!result.createdNewRole);
            }
        });

        it("create a role with permissions", async function () {
            const connectionURI = await startST();

            const role = "role";
            const permissions = ["permission1"];

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

            {
                const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, permissions);
                assert.strictEqual(result.status, "OK");
                assert(result.createdNewRole);
            }

            {
                // get permissions for roles
                const result = await UserRolesRecipe.getPermissionsForRole(role);
                assert.strictEqual(result.status, "OK");
                assert(areArraysEqual(result.permissions, permissions));
            }
        });

        it("add new permissions to a role", async function () {
            const connectionURI = await startST();

            const role = "role";
            const permissions = ["permission1"];

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

            {
                const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, permissions);
                assert.strictEqual(result.status, "OK");
                assert(result.createdNewRole);
            }

            // add additional permissions to the role

            {
                const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, [
                    "permission2",
                    "permission3",
                ]);
                assert.strictEqual(result.status, "OK");
                assert(!result.createdNewRole);
            }

            // check that the permissions have been added

            {
                const finalPermissions = ["permission1", "permission2", "permission3"];
                const result = await UserRolesRecipe.getPermissionsForRole(role);
                assert.strictEqual(result.status, "OK");
                assert(areArraysEqual(finalPermissions, result.permissions));
            }
        });

        it("add duplicate permission", async function () {
            const connectionURI = await startST();

            const role = "role";
            const permissions = ["permission1"];

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

            {
                const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, permissions);
                assert.strictEqual(result.status, "OK");
                assert(result.createdNewRole);
            }

            // add duplicate permissions to the role

            {
                const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, permissions);
                assert.strictEqual(result.status, "OK");
                assert(!result.createdNewRole);
            }

            // check that no additional permission has been added

            {
                const result = await UserRolesRecipe.getPermissionsForRole(role);
                assert.strictEqual(result.status, "OK");
                assert(areArraysEqual(result.permissions, permissions));
            }
        });
    });
});
