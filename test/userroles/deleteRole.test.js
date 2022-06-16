const assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST, areArraysEqual } = require("../utils");
const STExpress = require("../..");
const { ProcessState } = require("../../lib/build/processState");
const UserRolesRecipe = require("../../lib/build/recipe/userroles").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

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

    describe("deleteRole", () => {
        it("create roles, add them to a user and delete one of the roles", async function () {
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

            const roles = ["role1", "role2", "role3"];
            const userId = "user";

            // create role and it to user
            {
                for (let role in roles) {
                    const result = await UserRolesRecipe.createNewRoleOrAddPermissions(roles[role], []);
                    assert.strictEqual(result.status, "OK");
                    assert(result.createdNewRole);

                    const response = await UserRolesRecipe.addRoleToUser(userId, roles[role]);
                    assert.strictEqual(response.status, "OK");
                    assert(!response.didUserAlreadyHaveRole);
                }
            }

            // delete role, check that role does not exist, check that user does not have role
            {
                const result = await UserRolesRecipe.deleteRole("role3");
                assert.strictEqual(result.status, "OK");
                assert(result.didRoleExist);

                const allRolesResponse = await UserRolesRecipe.getAllRoles();
                assert.strictEqual(allRolesResponse.status, "OK");
                assert.strictEqual(allRolesResponse.roles.length, 2);
                assert(!allRolesResponse.roles.includes("role3"));

                const allUserRoles = await UserRolesRecipe.getRolesForUser(userId);
                assert.strictEqual(allUserRoles.status, "OK");
                assert.strictEqual(allUserRoles.roles.length, 2);
                assert(!allUserRoles.roles.includes("role3"));
            }
        });

        it("delete a role that does not exist", async function () {
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

            const result = await UserRolesRecipe.deleteRole("unknownRole");
            assert.strictEqual(result.status, "OK");
            assert(!result.didRoleExist);
        });
    });
});
