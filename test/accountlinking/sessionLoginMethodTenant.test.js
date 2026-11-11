const assert = require("assert");
const { AuthUtils } = require("../../lib/build/authUtils");
const { User } = require("../../lib/build/user");
const getPasswordlessAPI = require("../../lib/build/recipe/passwordless/api/implementation").default;

describe("session login methods with no tenant", function () {
    const email = "x@example.com";

    function makeUser(recipeId, includeShareable) {
        const loginMethod = {
            recipeId,
            recipeUserId: "L",
            tenantIds: [],
            email,
            verified: true,
            timeJoined: 1,
            ...(recipeId === "thirdparty" ? { thirdParty: { id: "google", userId: "g1" } } : {}),
        };
        return new User({
            id: "P",
            isPrimaryUser: true,
            tenantIds: ["t2"],
            emails: [email],
            phoneNumbers: [],
            thirdParty: [],
            webauthn: { credentialIds: [] },
            timeJoined: 1,
            loginMethods: [
                loginMethod,
                ...(includeShareable ? [{ ...loginMethod, recipeUserId: "shareable", tenantIds: ["t1"] }] : []),
                {
                    recipeId: "emailpassword",
                    recipeUserId: "session",
                    tenantIds: ["t2"],
                    email: "session@example.com",
                    verified: true,
                    timeJoined: 1,
                },
            ],
        });
    }

    function makeInstance(recipeId, includeShareable, associations) {
        return {
            getRecipeInstanceOrThrow(name) {
                if (name === "accountlinking") {
                    return {
                        recipeInterfaceImpl: {
                            listUsersByAccountInfo: async () => [makeUser(recipeId, includeShareable)],
                            getUser: async () => makeUser(recipeId, includeShareable),
                        },
                    };
                }
                if (name === "multitenancy") {
                    return {
                        recipeInterfaceImpl: {
                            associateUserToTenant: async ({ recipeUserId }) => {
                                associations.push(recipeUserId.getAsString());
                                return { status: "OK" };
                            },
                        },
                    };
                }
                throw new Error("unexpected recipe " + name);
            },
            getRecipeInstance() {
                return undefined;
            },
        };
    }

    for (const recipeId of ["passwordless", "emailpassword", "thirdparty"]) {
        for (const includeShareable of [false, true]) {
            it(`${recipeId} skips a tenant-less login method${
                includeShareable ? " and tries the next method" : ""
            }`, async function () {
                const credentials = [];
                const associations = [];
                const result = await AuthUtils.getAuthenticatingUserAndAddToCurrentTenantIfRequired({
                    stInstance: makeInstance(recipeId, includeShareable, associations),
                    recipeId,
                    accountInfo: { email },
                    tenantId: "t2",
                    session: { getUserId: () => "P" },
                    checkCredentialsOnTenant: async (tenantId) => {
                        credentials.push(tenantId);
                        return true;
                    },
                    userContext: {},
                });
                assert.deepStrictEqual(credentials, includeShareable ? ["t1"] : []);
                assert.deepStrictEqual(associations, includeShareable ? ["shareable"] : []);
                assert.strictEqual(
                    result?.loginMethod.recipeUserId.getAsString(),
                    includeShareable ? "shareable" : undefined
                );
            });
        }
    }

    it("passwordless createCode and consumeCode both treat a tenant-less method as sign up", async function () {
        const associations = [];
        const instance = makeInstance("passwordless", false, associations);
        const consumeResult = await AuthUtils.getAuthenticatingUserAndAddToCurrentTenantIfRequired({
            stInstance: instance,
            recipeId: "passwordless",
            accountInfo: { email },
            tenantId: "t2",
            session: { getUserId: () => "P" },
            checkCredentialsOnTenant: async () => true,
            userContext: {},
        });
        let createIsSignUp;
        const original = AuthUtils.preAuthChecks;
        const stop = new Error("stop before code delivery");
        AuthUtils.preAuthChecks = async ({ isSignUp }) => {
            createIsSignUp = isSignUp;
            throw stop;
        };
        try {
            await assert.rejects(
                getPasswordlessAPI(instance).createCodePOST({
                    email,
                    tenantId: "t2",
                    session: { getUserId: () => "P" },
                    shouldTryLinkingWithSessionUser: true,
                    options: { config: {} },
                    userContext: {},
                }),
                (error) => error === stop
            );
        } finally {
            AuthUtils.preAuthChecks = original;
        }
        assert.strictEqual(createIsSignUp, true);
        assert.strictEqual(consumeResult, undefined);
        assert.deepStrictEqual(associations, []);
    });
});
