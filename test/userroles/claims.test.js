const assert = require("assert");
const { printPath, setupST, startST, killAllST, cleanST, mockResponse, mockRequest } = require("../utils");
const { ProcessState } = require("../../lib/build/processState");
const STExpress = require("../..");
const UserRoles = require("../../lib/build/recipe/userroles").default;
const Session = require("../../lib/build/recipe/session").default;
const { Querier } = require("../../lib/build/querier");
const { maxVersion } = require("../../lib/build/utils");

describe(`claimsTest: ${printPath("[test/userroles/claims.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("recipe init", () => {
        it("should add claims to session without config", async function () {
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
                recipeList: [UserRoles.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
            });

            // Only run for version >= 2.14
            const querier = Querier.getNewInstanceOrThrowError(undefined);
            const apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.13") === "2.13") {
                return this.skip();
            }

            const session = await Session.createNewSession(mockRequest(), mockResponse(), "userId");
            assert.deepStrictEqual(await session.getClaimValue(UserRoles.UserRoleClaim), []);
            assert.deepStrictEqual(await session.getClaimValue(UserRoles.PermissionClaim), []);
        });

        it("should not add claims if disabled in config", async function () {
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
                recipeList: [
                    UserRoles.init({
                        skipAddingPermissionsToAccessToken: true,
                        skipAddingRolesToAccessToken: true,
                    }),
                    Session.init({ getTokenTransferMethod: () => "cookie" }),
                ],
            });

            // Only run for version >= 2.14
            const querier = Querier.getNewInstanceOrThrowError(undefined);
            const apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.13") === "2.13") {
                return this.skip();
            }

            const session = await Session.createNewSession(mockRequest(), mockResponse(), "userId");
            assert.strictEqual(await session.getClaimValue(UserRoles.UserRoleClaim), undefined);
            assert.strictEqual(await session.getClaimValue(UserRoles.PermissionClaim), undefined);
        });

        it("should add claims to session with values", async function () {
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
                recipeList: [UserRoles.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
            });

            // Only run for version >= 2.14
            const querier = Querier.getNewInstanceOrThrowError(undefined);
            const apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.13") === "2.13") {
                return this.skip();
            }

            await UserRoles.createNewRoleOrAddPermissions("test", ["a", "b"]);
            await UserRoles.addRoleToUser("userId", "test");
            const session = await Session.createNewSession(mockRequest(), mockResponse(), "userId");
            assert.deepStrictEqual(await session.getClaimValue(UserRoles.UserRoleClaim), ["test"]);
            assert.deepStrictEqual(await session.getClaimValue(UserRoles.PermissionClaim), ["a", "b"]);
        });
    });

    describe("validation", () => {
        it("should validate roles", async function () {
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
                recipeList: [UserRoles.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
            });

            // Only run for version >= 2.14
            const querier = Querier.getNewInstanceOrThrowError(undefined);
            const apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.13") === "2.13") {
                return this.skip();
            }

            await UserRoles.createNewRoleOrAddPermissions("test", ["a", "b"]);
            await UserRoles.addRoleToUser("userId", "test");
            const session = await Session.createNewSession(mockRequest(), mockResponse(), "userId");

            await session.assertClaims([UserRoles.UserRoleClaim.validators.includes("test")]);

            let err;
            try {
                await session.assertClaims([UserRoles.UserRoleClaim.validators.includes("nope")]);
            } catch (ex) {
                console.log(ex);
                err = ex;
            }
            assert.ok(err);
            assert.strictEqual(err.type, "INVALID_CLAIMS");
            assert.strictEqual(err.payload.length, 1);
            assert.strictEqual(err.payload[0].id, "st-role");
            assert.deepStrictEqual(err.payload[0].reason, {
                message: "wrong value",
                expectedToInclude: "nope",
                actualValue: ["test"],
            });
        });
        it("should validate roles after refetching", async function () {
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
                recipeList: [
                    UserRoles.init({
                        skipAddingRolesToAccessToken: true,
                    }),
                    Session.init({ getTokenTransferMethod: () => "cookie" }),
                ],
            });

            // Only run for version >= 2.14
            const querier = Querier.getNewInstanceOrThrowError(undefined);
            const apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.13") === "2.13") {
                return this.skip();
            }

            const session = await Session.createNewSession(mockRequest(), mockResponse(), "userId");
            await UserRoles.createNewRoleOrAddPermissions("test", ["a", "b"]);
            await UserRoles.addRoleToUser("userId", "test");

            await session.assertClaims([UserRoles.UserRoleClaim.validators.includes("test")]);
        });
        it("should validate permissions", async function () {
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
                recipeList: [UserRoles.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
            });

            // Only run for version >= 2.14
            const querier = Querier.getNewInstanceOrThrowError(undefined);
            const apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.13") === "2.13") {
                return this.skip();
            }

            await UserRoles.createNewRoleOrAddPermissions("test", ["a", "b"]);
            await UserRoles.addRoleToUser("userId", "test");
            const session = await Session.createNewSession(mockRequest(), mockResponse(), "userId");

            await session.assertClaims([UserRoles.PermissionClaim.validators.includes("a")]);

            let err;
            try {
                await session.assertClaims([UserRoles.PermissionClaim.validators.includes("nope")]);
            } catch (ex) {
                console.log(ex);
                err = ex;
            }
            assert.ok(err);
            assert.strictEqual(err.type, "INVALID_CLAIMS");
            assert.strictEqual(err.payload.length, 1);
            assert.strictEqual(err.payload[0].id, "st-perm");
            assert.deepStrictEqual(err.payload[0].reason, {
                message: "wrong value",
                expectedToInclude: "nope",
                actualValue: ["a", "b"],
            });
        });
        it("should validate permissions after refetching", async function () {
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
                recipeList: [
                    UserRoles.init({
                        skipAddingPermissionsToAccessToken: true,
                    }),
                    Session.init({ getTokenTransferMethod: () => "cookie" }),
                ],
            });

            // Only run for version >= 2.14
            const querier = Querier.getNewInstanceOrThrowError(undefined);
            const apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.13") === "2.13") {
                return this.skip();
            }

            const session = await Session.createNewSession(mockRequest(), mockResponse(), "userId");
            await UserRoles.createNewRoleOrAddPermissions("test", ["a", "b"]);
            await UserRoles.addRoleToUser("userId", "test");

            await session.assertClaims([UserRoles.PermissionClaim.validators.includes("a")]);
        });
    });
});
