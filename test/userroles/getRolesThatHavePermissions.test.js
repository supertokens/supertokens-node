const assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST, areArraysEqual } = require("../utils");
const STExpress = require("../..");
const { ProcessState } = require("../../lib/build/processState");
const UserRolesRecipe = require("../../lib/build/recipe/userroles").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");
const { default: SessionRecipe } = require("../../lib/build/recipe/session/recipe");

describe(`getRolesThatHavePermissions: ${printPath(
    "[test/userroles/getRolesThatHavePermissions.test.js]"
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

    describe("getRolesThatHavePermissions", () => {
        it("get roles that have permissions", async function () {
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

            const roles = ["role1", "role2", "role3"];
            const permission = "permission";

            // create roles with permission
            {
                for (let role in roles) {
                    const result = await UserRolesRecipe.createNewRoleOrAddPermissions(roles[role], [permission]);
                    assert.strictEqual(result.status, "OK");
                    assert(result.createdNewRole);
                }
            }

            // retrieve roles with permission
            {
                const result = await UserRolesRecipe.getRolesThatHavePermission(permission);
                assert.strictEqual(result.status, "OK");
                assert(areArraysEqual(roles, result.roles));
            }
        });

        it("get roles for unknown permission", async function () {
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

            // retrieve roles for unknown permission
            const result = await UserRolesRecipe.getRolesThatHavePermission("unknownPermission");
            assert.strictEqual(result.status, "OK");
            assert.strictEqual(result.roles.length, 0);
        });
    });
});
