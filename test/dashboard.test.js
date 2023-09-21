const {
    printPath,
    setupST,
    startSTWithMultitenancyAndAccountLinki,
    startSTWithMultitenancyAndAccountLinkingng,
    killAllST,
    cleanST,
    resetAll,
    startSTWithMultitenancyAndAccountLinking,
} = require("./utils");
let STExpress = require("../");
let Session = require("../recipe/session");
let Passwordless = require("../recipe/passwordless");
let ThirdParty = require("../recipe/thirdparty");
let EmailPassword = require("../recipe/emailpassword");
let AccountLinking = require("../recipe/accountlinking");
let EmailVerification = require("../recipe/emailverification");
let UserMetadata = require("../recipe/usermetadata");
let Dashboard = require("../recipe/dashboard");
let DashboardRecipe = require("../lib/build/recipe/dashboard/recipe").default;
let assert = require("assert");
let { ProcessState } = require("../lib/build/processState");
const express = require("express");
const request = require("supertest");
let { middleware, errorHandler } = require("../framework/express");

describe(`dashboard: ${printPath("[test/dashboard.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("Test that normalised config is generated correctly", async function () {
        const connectionURI = await startSTWithMultitenancyAndAccountLinking();

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Dashboard.init()],
            });

            let config = DashboardRecipe.getInstanceOrThrowError().config;

            assert.equal(config.apiKey, undefined);
            assert.equal(config.authMode, "email-password");

            resetAll();
        }

        {
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Dashboard.init({ apiKey: "test" })],
            });

            let config = DashboardRecipe.getInstanceOrThrowError().config;

            assert.equal(config.authMode, "api-key");
            assert.equal(config.apiKey, "test");
        }
    });

    describe("with account linking", () => {
        it("should get user info with first&last names", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Dashboard.init({
                        override: {
                            functions: (oI) => ({
                                ...oI,
                                shouldAllowAccess: async () => true,
                            }),
                        },
                    }),
                    EmailPassword.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => ({
                            shouldAutomaticallyLink: true,
                            shouldRequireVerification: true,
                        }),
                    }),
                    EmailVerification.init({ mode: "REQUIRED" }),
                    UserMetadata.init(),
                    Session.init(),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true)
            ).user;
            assert(user.isPrimaryUser === true);
            let epUser = await EmailPassword.signUp("public", "test@example.com", "password123");
            const linkRes = await AccountLinking.linkAccounts(epUser.user.loginMethods[0].recipeUserId, user.id);
            assert(linkRes.status, "OK");

            let res = await request(app).get("/auth/dashboard/api/users?limit=100").expect(200);
            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual(res.body.users.length, 1);
            const expectedLinkedUser = {
                id: user.id,
                tenantIds: user.tenantIds,
                phoneNumbers: [],
                isPrimaryUser: true,
                emails: ["test@example.com"],
                thirdParty: [
                    {
                        id: "google",
                        userId: "abcd",
                    },
                ],
                timeJoined: user.timeJoined,
                loginMethods: [
                    {
                        email: "test@example.com",
                        recipeId: "thirdparty",
                        recipeUserId: user.id,
                        tenantIds: user.tenantIds,
                        thirdParty: {
                            id: "google",
                            userId: "abcd",
                        },
                        timeJoined: user.timeJoined,
                        verified: true,
                    },
                    {
                        email: "test@example.com",
                        recipeId: "emailpassword",
                        recipeUserId: epUser.user.id,
                        tenantIds: user.tenantIds,
                        timeJoined: epUser.user.timeJoined,
                        verified: true,
                    },
                ],
            };
            assert.deepStrictEqual(res.body.users, [expectedLinkedUser]);
            for (const u of res.body.users) {
                let metadataRes = await request(app)
                    .get(`/auth/dashboard/api/user/metadata?userId=${u.id}`)
                    .expect(200);
                assert.deepStrictEqual(metadataRes.body, {
                    status: "OK",
                    data: {},
                });
                await request(app)
                    .put(`/auth/dashboard/api/user/metadata`)
                    .set("Content-Type", "application/json")
                    .send(
                        JSON.stringify({
                            userId: u.id,
                            data: JSON.stringify({
                                first_name: "test",
                                last_name: "user",
                            }),
                        })
                    )
                    .expect(200);
                metadataRes = await request(app).get(`/auth/dashboard/api/user/metadata?userId=${u.id}`).expect(200);
                assert.deepStrictEqual(metadataRes.body, {
                    status: "OK",
                    data: {
                        first_name: "test",
                        last_name: "user",
                    },
                });
                const getUserRes = await request(app).get(`/auth/dashboard/api/user?userId=${u.id}`).expect(200);
                assert.deepStrictEqual(getUserRes.body.user, {
                    ...expectedLinkedUser,
                    firstName: "test",
                    lastName: "user",
                });
            }
        });

        it("should reset password of linked user", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Dashboard.init({
                        override: {
                            functions: (oI) => ({
                                ...oI,
                                shouldAllowAccess: async () => true,
                            }),
                        },
                    }),
                    EmailPassword.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => ({
                            shouldAutomaticallyLink: true,
                            shouldRequireVerification: true,
                        }),
                    }),
                    EmailVerification.init({ mode: "REQUIRED" }),
                    UserMetadata.init(),
                    Session.init(),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true)
            ).user;
            assert(user.isPrimaryUser === true);
            let epUser = await EmailPassword.signUp("public", "test@example.com", "password123");
            const linkRes = await AccountLinking.linkAccounts(epUser.user.loginMethods[0].recipeUserId, user.id);
            assert(linkRes.status, "OK");

            // TODO: validate that this should not be a 500
            // const updatePwWrongId = await request(app)
            //     .put(`/auth/dashboard/api/user/password`)
            //     .set("Content-Type", "application/json")
            //     .send(
            //         JSON.stringify({
            //             recipeUserId: user.id,
            //             newPassword: "newPassword123",
            //         })
            //     )
            //     .expect(200);
            // assert.strictEqual(updatePwWrongId.body.status, "OK");
            // const signInResWrongPW = await EmailPassword.signIn("public", "test@example.com", "newPassword123");
            // assert.strictEqual(signInResWrongPW.status, "WRONG_CREDENTIALS_ERROR");

            const updatePw = await request(app)
                .put(`/auth/dashboard/api/user/password`)
                .set("Content-Type", "application/json")
                .send(
                    JSON.stringify({
                        recipeUserId: epUser.user.id,
                        newPassword: "newPassword123",
                    })
                )
                .expect(200);
            assert.strictEqual(updatePw.body.status, "OK");

            const signInRes = await EmailPassword.signIn("public", "test@example.com", "newPassword123");
            assert.strictEqual(signInRes.status, "OK");
        });

        it("should link accounts after verification", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Dashboard.init({
                        override: {
                            functions: (oI) => ({
                                ...oI,
                                shouldAllowAccess: async () => true,
                            }),
                        },
                    }),
                    EmailPassword.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => ({
                            shouldAutomaticallyLink: true,
                            shouldRequireVerification: true,
                        }),
                    }),
                    EmailVerification.init({ mode: "REQUIRED" }),
                    UserMetadata.init(),
                    Session.init(),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true)
            ).user;
            assert(user.isPrimaryUser === true);
            let epUser = await EmailPassword.signUp("public", "test@example.com", "password123");

            const verify = await request(app)
                .put(`/auth/dashboard/api/user/email/verify`)
                .set("Content-Type", "application/json")
                .send(
                    JSON.stringify({
                        recipeUserId: epUser.user.id,
                        verified: true,
                    })
                )
                .expect(200);
            assert.strictEqual(verify.body.status, "OK");

            const signInRes = await EmailPassword.signIn("public", "test@example.com", "password123");
            assert.strictEqual(signInRes.status, "OK");
            assert.deepStrictEqual(signInRes.user.toJson(), {
                ...user,
                loginMethods: [
                    user.loginMethods[0].toJson(),
                    {
                        ...epUser.user.loginMethods[0].toJson(),
                        verified: true,
                    },
                ],
            });
        });

        it("should delete all linked users if removeAllLinkedAccounts is true", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Dashboard.init({
                        override: {
                            functions: (oI) => ({
                                ...oI,
                                shouldAllowAccess: async () => true,
                            }),
                        },
                    }),
                    EmailPassword.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => ({
                            shouldAutomaticallyLink: true,
                            shouldRequireVerification: true,
                        }),
                    }),
                    EmailVerification.init({ mode: "REQUIRED" }),
                    UserMetadata.init(),
                    Session.init(),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true)
            ).user;
            assert(user.isPrimaryUser === true);
            let epUser = await EmailPassword.signUp("public", "test@example.com", "password123");
            const linkRes = await AccountLinking.linkAccounts(epUser.user.loginMethods[0].recipeUserId, user.id);
            assert(linkRes.status, "OK");

            const deleteRes = await request(app)
                .delete(`/auth/dashboard/api/user?userId=${user.id}&removeAllLinkedAccounts=true`)
                .expect(200);
            assert.deepStrictEqual(deleteRes.body, {
                status: "OK",
            });

            let res = await request(app).get("/auth/dashboard/api/users?limit=100").expect(200);
            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual(res.body.users.length, 0);
        });

        it("should not delete all linked users if removeAllLinkedAccounts is false when deleting the primary user", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Dashboard.init({
                        override: {
                            functions: (oI) => ({
                                ...oI,
                                shouldAllowAccess: async () => true,
                            }),
                        },
                    }),
                    EmailPassword.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => ({
                            shouldAutomaticallyLink: true,
                            shouldRequireVerification: true,
                        }),
                    }),
                    EmailVerification.init({ mode: "REQUIRED" }),
                    UserMetadata.init(),
                    Session.init(),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true)
            ).user;
            assert(user.isPrimaryUser === true);
            let epUser = await EmailPassword.signUp("public", "test@example.com", "password123");
            const linkRes = await AccountLinking.linkAccounts(epUser.user.loginMethods[0].recipeUserId, user.id);
            assert(linkRes.status, "OK");

            const deleteRes = await request(app)
                .delete(`/auth/dashboard/api/user?userId=${user.id}&removeAllLinkedAccounts=false`)
                .expect(200);
            assert.deepStrictEqual(deleteRes.body, {
                status: "OK",
            });

            let res = await request(app).get("/auth/dashboard/api/users?limit=100").expect(200);
            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual(res.body.users.length, 1);

            const epLoginMethod = epUser.user.loginMethods[0].toJson();
            epLoginMethod.verified = true;
            delete epLoginMethod.phoneNumber;
            delete epLoginMethod.thirdParty;

            assert.deepStrictEqual(res.body.users, [
                {
                    ...user.toJson(),
                    thirdParty: [],
                    timeJoined: epUser.user.timeJoined,
                    loginMethods: [epLoginMethod],
                },
            ]);
        });

        it("should not delete all linked users if removeAllLinkedAccounts is false when deleting the recipe user", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Dashboard.init({
                        override: {
                            functions: (oI) => ({
                                ...oI,
                                shouldAllowAccess: async () => true,
                            }),
                        },
                    }),
                    EmailPassword.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => ({
                            shouldAutomaticallyLink: true,
                            shouldRequireVerification: true,
                        }),
                    }),
                    EmailVerification.init({ mode: "REQUIRED" }),
                    UserMetadata.init(),
                    Session.init(),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true)
            ).user;
            assert(user.isPrimaryUser === true);
            let epUser = await EmailPassword.signUp("public", "test@example.com", "password123");
            const linkRes = await AccountLinking.linkAccounts(epUser.user.loginMethods[0].recipeUserId, user.id);
            assert(linkRes.status, "OK");

            const deleteRes = await request(app)
                .delete(`/auth/dashboard/api/user?userId=${epUser.user.id}&removeAllLinkedAccounts=false`)
                .expect(200);
            assert.deepStrictEqual(deleteRes.body, {
                status: "OK",
            });

            let res = await request(app).get("/auth/dashboard/api/users?limit=100").expect(200);
            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual(res.body.users.length, 1);

            const expectedUser = user.toJson();
            delete expectedUser.loginMethods[0].phoneNumber;
            assert.deepStrictEqual(res.body.users, [expectedUser]);
        });
    });

    describe("deleteUser", () => {
        it("should respond with error if userId is missing", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Dashboard.init({
                        override: {
                            functions: (oI) => ({
                                ...oI,
                                shouldAllowAccess: async () => true,
                            }),
                        },
                    }),
                    EmailPassword.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => ({
                            shouldAutomaticallyLink: true,
                            shouldRequireVerification: true,
                        }),
                    }),
                    EmailVerification.init({ mode: "REQUIRED" }),
                    UserMetadata.init(),
                    Session.init(),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            const deleteRes = await request(app).delete(`/auth/dashboard/api/user`).expect(400);
            assert.deepStrictEqual(deleteRes.body, {
                message: "Missing required parameter 'userId'",
            });
        });

        it("should respond with error if userId is empty", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Dashboard.init({
                        override: {
                            functions: (oI) => ({
                                ...oI,
                                shouldAllowAccess: async () => true,
                            }),
                        },
                    }),
                    EmailPassword.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => ({
                            shouldAutomaticallyLink: true,
                            shouldRequireVerification: true,
                        }),
                    }),
                    EmailVerification.init({ mode: "REQUIRED" }),
                    UserMetadata.init(),
                    Session.init(),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            const deleteRes = await request(app).delete(`/auth/dashboard/api/user?userId`).expect(400);
            assert.deepStrictEqual(deleteRes.body, {
                message: "Missing required parameter 'userId'",
            });
        });
    });

    describe("userPut", () => {
        it("should respond with error if another user exists with the same email", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Dashboard.init({
                        override: {
                            functions: (oI) => ({
                                ...oI,
                                shouldAllowAccess: async () => true,
                            }),
                        },
                    }),
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => ({
                            shouldAutomaticallyLink: true,
                            shouldRequireVerification: true,
                        }),
                    }),
                    EmailVerification.init({ mode: "REQUIRED" }),
                    UserMetadata.init(),
                    Session.init(),
                ],
            });

            const app = express();
            app.use(middleware());
            app.use(errorHandler());

            const signUp1 = await Passwordless.signInUp({
                tenantId: "public",
                phoneNumber: `+3630${Date.now().toString().substr(-7)}`,
            });
            assert.strictEqual(signUp1.status, "OK");
            const signUp2 = await Passwordless.signInUp({
                tenantId: "public",
                phoneNumber: `+3670${Date.now().toString().substr(-7)}`,
            });
            assert.strictEqual(signUp2.status, "OK");

            const resp = await request(app)
                .put(`/auth/dashboard/api/user`)
                .set("Content-Type", "application/json")
                .send(
                    JSON.stringify({
                        recipeId: "passwordless",
                        recipeUserId: signUp2.user.loginMethods[0].recipeUserId.getAsString(),
                        phone: signUp1.user.phoneNumbers[0],
                        email: "",
                        firstName: "",
                        lastName: "",
                    })
                )
                .expect(200);

            assert.strictEqual(resp.body.status, "PHONE_NUMBER_CHANGE_NOT_ALLOWED_ERROR");
        });
    });
});
