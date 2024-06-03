/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
const {
    printPath,
    setupST,
    startST,
    stopST,
    killAllST,
    cleanST,
    resetAll,
    startSTWithMultitenancyAndAccountLinking,
} = require("../utils");
let supertokens = require("../../");
let Session = require("../../recipe/session");
let assert = require("assert");
let { ProcessState } = require("../../lib/build/processState");
let EmailPassword = require("../../recipe/emailpassword");
let ThirdParty = require("../../recipe/thirdparty");
let AccountLinking = require("../../recipe/accountlinking");
let EmailVerification = require("../../recipe/emailverification");

describe(`accountlinkingTests: ${printPath("[test/accountlinking/thirdparty.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("sign in up tests", function () {
        it("sign up in succeeds and makes primary user if verified", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true)
            ).user;
            assert(user.isPrimaryUser === true);
        });

        it("sign up in succeeds and does not make primary user if not verified", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", false)
            ).user;
            assert(user.isPrimaryUser === false);
        });

        it("sign up in succeeds and makes primary user if not verified and verification not required", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", false)
            ).user;
            assert(user.isPrimaryUser === true);
        });

        it("sign up in succeeds and does not make primary user if account linking is disabled even if verified", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true)
            ).user;
            assert(user.isPrimaryUser === false);
        });

        it("sign up in succeeds and does not make primary user if account linking is disabled and not verified", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", false)
            ).user;
            assert(user.isPrimaryUser === false);
        });

        it("sign up in fails cause changed email already associated with another primary user", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user1 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true)
            ).user;
            assert(user1.isPrimaryUser === true);

            let user2 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "abcd", "test2@example.com", true)
            ).user;
            assert(user2.isPrimaryUser === true);

            let resp = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "github",
                "abcd",
                "test@example.com",
                true
            );
            assert.strictEqual(resp.status, "EMAIL_CHANGE_NOT_ALLOWED_ERROR");
            assert.strictEqual(resp.reason, "Email already associated with another primary user.");
        });

        it("sign up in fails cause changed email already associated with another primary user when the user trying to sign in is linked with another user", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user1 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true)
            ).user;
            assert(user1.isPrimaryUser === true);

            let user2 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "abcd", "test2@example.com", true)
            ).user;
            assert(user2.isPrimaryUser === true);

            let user3 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "github2", "abcd", "test2@example.com", true)
            ).user;
            assert(user2.isPrimaryUser === true);
            assert(user3.id === user2.id);
            assert(user3.loginMethods.length === 2);

            let resp = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "github2",
                "abcd",
                "test@example.com",
                true
            );
            assert.strictEqual(resp.status, "EMAIL_CHANGE_NOT_ALLOWED_ERROR");
            assert.strictEqual(resp.reason, "Email already associated with another primary user.");
        });

        it("sign up in succeeds when changed email belongs to a recipe user even though the new email is already associated with another primary user", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user1 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true)
            ).user;
            assert(user1.isPrimaryUser === true);

            let user2 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "abcd", "test2@example.com", false)
            ).user;
            assert(user2.isPrimaryUser === false);

            let resp = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "github",
                "abcd",
                "test@example.com",
                false
            );
            assert(resp.status === "OK");
        });

        it("sign up in succeeds when changed email belongs to a primary user even though the new email is already associated with another recipe user user", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user1 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", false)
            ).user;
            assert(user1.isPrimaryUser === false);

            let user2 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "abcd", "test2@example.com", true)
            ).user;
            assert(user2.isPrimaryUser === true);

            let resp = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "github",
                "abcd",
                "test@example.com",
                false
            );
            assert(resp.status === "OK");
        });

        it("sign up change email succeeds when email is changed to another recipe user's account", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user1 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", false)
            ).user;
            assert(user1.isPrimaryUser === false);

            let user2 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "abcd", "test2@example.com", false)
            ).user;
            assert(user2.isPrimaryUser === false);

            let resp = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "github",
                "abcd",
                "test@example.com",
                false
            );
            assert(resp.status === "OK");
        });

        it("sign up in succeeds to change email of primary user", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user1 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true)
            ).user;
            assert(user1.isPrimaryUser === true);

            let resp = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abcd",
                "test2@example.com",
                false
            );
            assert(resp.status === "OK");

            {
                let users = await supertokens.listUsersByAccountInfo("public", {
                    email: "test@example.com",
                });
                assert(users.length === 0);
            }

            {
                let users = await supertokens.listUsersByAccountInfo("public", {
                    email: "test2@example.com",
                });
                assert(users.length === 1);
            }
        });

        it("sign up in creates primary user during sign in", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user1 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", false)
            ).user;
            assert(!user1.isPrimaryUser);

            user1 = (await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true))
                .user;
            assert(user1.isPrimaryUser);
        });

        it("sign up in does link accounts during sign in", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "abcd", "test@example.com", true)
            ).user;
            assert(user.isPrimaryUser);

            let user1 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", false)
            ).user;
            assert(!user1.isPrimaryUser);

            user1 = (await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true))
                .user;
            assert(user1.isPrimaryUser);
            assert.strictEqual(user1.id, user.id);
        });

        it("sign up in links accounts during sign up with another third party account", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "abcd", "test@example.com", true)
            ).user;
            assert(user.isPrimaryUser === true);

            let user1 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true)
            ).user;
            assert(user1.isPrimaryUser === true);
            assert(user1.id === user.id);
            assert(user1.loginMethods.length === 2);
            assert(user1.loginMethods[0].thirdParty.id === "github");
            assert(user1.loginMethods[1].thirdParty.id === "google");
        });

        it("sign up creates primary user only if verified and verification is required and marks email as verified", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "abcd", "test@example.com", true)
            ).user;
            assert(user.isPrimaryUser === true);

            let isVerified = await EmailVerification.isEmailVerified(user.loginMethods[0].recipeUserId);
            assert(isVerified === true);
        });

        it("sign up does not creates primary user if not verified and verification is required and does not mark email as verified", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "abcd", "test@example.com", false)
            ).user;
            assert(user.isPrimaryUser === false);

            let isVerified = await EmailVerification.isEmailVerified(user.loginMethods[0].recipeUserId);
            assert(isVerified === false);
        });

        it("sign up creates primary user if not verified and verification is not required and does not mark email as verified", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: false,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "abcd", "test@example.com", false)
            ).user;
            assert(user.isPrimaryUser === true);

            let isVerified = await EmailVerification.isEmailVerified(user.loginMethods[0].recipeUserId);
            assert(isVerified === false);
        });

        it("sign up does not crash if is verified boolean is true, but email verification recipe is not initialised, and creates primary user", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
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
                ],
            });

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "abcd", "test@example.com", true)
            ).user;
            assert(user.isPrimaryUser);
        });

        it("sign up does not crash if is verified boolean is true, but email verification recipe is not initialised, and creates primary user if verification not required", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: false,
                            };
                        },
                    }),
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
                ],
            });

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "abcd", "test@example.com", true)
            ).user;
            assert(user.isPrimaryUser === true);
        });

        it("sign in up verifies email based on linked accounts", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "abcd", "test@example.com", true)
            ).user;
            assert(user.isPrimaryUser === true);

            let user2 = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", false)
            ).user;
            assert(user2.isPrimaryUser === false);

            await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);

            // link accuonts above also verifies the account
            await EmailVerification.unverifyEmail(user2.loginMethods[0].recipeUserId);

            let pUser = await supertokens.getUser(user2.id);
            assert(pUser.isPrimaryUser === true);
            assert(pUser.loginMethods[1].verified === false);
            assert(pUser.loginMethods[1].thirdParty.id === "google");

            // now logging in should mark the email as verified
            pUser = (await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", false))
                .user;
            assert(pUser.isPrimaryUser === true);
            assert(pUser.loginMethods[1].verified === true);
            assert(pUser.loginMethods[1].thirdParty.id === "google");
        });

        it("sign in up verifies email if provider says that the email is verified", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", false)
            ).user;

            // now logging in should mark the email as verified
            user = (await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true))
                .user;
            assert(user.isPrimaryUser === false);
            assert(user.loginMethods.length === 1);
            assert(user.loginMethods[0].verified === true);
            assert(user.loginMethods[0].thirdParty.id === "google");

            // during sign up as well
            user = (await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "abcd", "test@example.com", true))
                .user;
            assert(user.isPrimaryUser === false);
            assert(user.loginMethods.length === 1);
            assert(user.loginMethods[0].verified === true);
            assert(user.loginMethods[0].thirdParty.id === "github");
        });

        it("sign in up does not crash if email verification recipe is not used", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init(),
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
                ],
            });

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", false)
            ).user;

            // now logging in should mark the email as verified
            user = (await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true))
                .user;
            assert(user.isPrimaryUser === false);
            assert(user.loginMethods.length === 1);
            assert(user.loginMethods[0].verified === true);
            assert(user.loginMethods[0].thirdParty.id === "google");

            // during sign up as well
            user = (await ThirdParty.manuallyCreateOrUpdateUser("public", "github", "abcd", "test@example.com", true))
                .user;
            assert(user.isPrimaryUser === false);
            assert(user.loginMethods.length === 1);
            assert(user.loginMethods[0].verified === true);
            assert(user.loginMethods[0].thirdParty.id === "github");
        });

        it("sign in up does not mark email as unverified even if provider says it's not verified but it was previously verified", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true)
            ).user;

            // now logging in should mark the email as verified
            user = (await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", false))
                .user;
            assert(user.isPrimaryUser === false);
            assert(user.loginMethods.length === 1);
            assert(user.loginMethods[0].verified === true);
            assert(user.loginMethods[0].thirdParty.id === "google");
        });

        it("sign up in does attempt to make primary user / account link during sign in", async function () {
            const connectionURI = await startSTWithMultitenancyAndAccountLinking();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async () => {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
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
                ],
            });

            let user = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", false)
            ).user;
            assert(user.isPrimaryUser === false);

            user = (await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd", "test@example.com", true))
                .user;
            assert(user.isPrimaryUser);
        });
    });
});
