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
const { printPath, setupST, startST, stopST, killAllST, cleanST, resetAll } = require("../utils");
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
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (await ThirdParty.signInUp("google", "abcd", "test@example.com", true)).user;
            assert(user.isPrimaryUser === true);
        });

        it("sign up in succeeds and does not make primary user if not verified", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (await ThirdParty.signInUp("google", "abcd", "test@example.com", false)).user;
            assert(user.isPrimaryUser === false);
        });

        it("sign up in succeeds and makes primary user if not verified and verification not required", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (await ThirdParty.signInUp("google", "abcd", "test@example.com", false)).user;
            assert(user.isPrimaryUser === true);
        });

        it("sign up in succeeds and does not make primary user if account linking is disabled even if verified", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (await ThirdParty.signInUp("google", "abcd", "test@example.com", true)).user;
            assert(user.isPrimaryUser === false);
        });

        it("sign up in succeeds and does not make primary user if account linking is disabled and not verified", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (await ThirdParty.signInUp("google", "abcd", "test@example.com", false)).user;
            assert(user.isPrimaryUser === false);
        });

        it("sign up in fails cause changed email already associated with another primary user", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user1 = (await ThirdParty.signInUp("google", "abcd", "test@example.com", true)).user;
            assert(user1.isPrimaryUser === true);

            let user2 = (await ThirdParty.signInUp("github", "abcd", "test2@example.com", true)).user;
            assert(user2.isPrimaryUser === true);

            let resp = await ThirdParty.signInUp("github", "abcd", "test@example.com", true);
            assert(resp.status === "SIGN_IN_UP_NOT_ALLOWED");
            assert(
                resp.reason ===
                    "Cannot sign in / up because new email cannot be applied to existing account. Please contact support."
            );
        });

        it("sign up in fails cause changed email already associated with another primary user when the user trying to sign in is linked with another user", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user1 = (await ThirdParty.signInUp("google", "abcd", "test@example.com", true)).user;
            assert(user1.isPrimaryUser === true);

            let user2 = (await ThirdParty.signInUp("github", "abcd", "test2@example.com", true)).user;
            assert(user2.isPrimaryUser === true);

            let user3 = (await ThirdParty.signInUp("github2", "abcd", "test2@example.com", true)).user;
            assert(user2.isPrimaryUser === true);
            assert(user3.id === user2.id);
            assert(user3.loginMethods.length === 2);

            let resp = await ThirdParty.signInUp("github2", "abcd", "test@example.com", true);
            assert(resp.status === "SIGN_IN_UP_NOT_ALLOWED");
            assert(
                resp.reason ===
                    "Cannot sign in / up because new email cannot be applied to existing account. Please contact support."
            );
        });

        it("sign up in succeeds when changed email belongs to a recipe user even though the new email is already associated with another primary user", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user1 = (await ThirdParty.signInUp("google", "abcd", "test@example.com", true)).user;
            assert(user1.isPrimaryUser === true);

            let user2 = (await ThirdParty.signInUp("github", "abcd", "test2@example.com", false)).user;
            assert(user2.isPrimaryUser === false);

            let resp = await ThirdParty.signInUp("github", "abcd", "test@example.com", false);
            assert(resp.status === "OK");
        });

        it("sign up in succeeds when changed email belongs to a primary user even though the new email is already associated with another recipe user user", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user1 = (await ThirdParty.signInUp("google", "abcd", "test@example.com", false)).user;
            assert(user1.isPrimaryUser === false);

            let user2 = (await ThirdParty.signInUp("github", "abcd", "test2@example.com", true)).user;
            assert(user2.isPrimaryUser === true);

            let resp = await ThirdParty.signInUp("github", "abcd", "test@example.com", false);
            assert(resp.status === "OK");
        });

        it("sign up change email succeeds when email is changed to another recipe user's account", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user1 = (await ThirdParty.signInUp("google", "abcd", "test@example.com", false)).user;
            assert(user1.isPrimaryUser === false);

            let user2 = (await ThirdParty.signInUp("github", "abcd", "test2@example.com", false)).user;
            assert(user2.isPrimaryUser === false);

            let resp = await ThirdParty.signInUp("github", "abcd", "test@example.com", false);
            assert(resp.status === "OK");
        });

        it("sign up in succeeds to change email of primary user", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user1 = (await ThirdParty.signInUp("google", "abcd", "test@example.com", true)).user;
            assert(user1.isPrimaryUser === true);

            let resp = await ThirdParty.signInUp("google", "abcd", "test2@example.com", false);
            assert(resp.status === "OK");

            {
                let users = await supertokens.listUsersByAccountInfo({
                    email: "test@example.com",
                });
                assert(users.length === 0);
            }

            {
                let users = await supertokens.listUsersByAccountInfo({
                    email: "test2@example.com",
                });
                assert(users.length === 1);
            }
        });

        it("sign up in does not create primary user during sign in", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user1 = (await ThirdParty.signInUp("google", "abcd", "test@example.com", false)).user;
            assert(user1.isPrimaryUser === false);

            user1 = (await ThirdParty.signInUp("google", "abcd", "test@example.com", true)).user;
            assert(user1.isPrimaryUser === false);
        });

        it("sign up in does not link accounts during sign in", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (await ThirdParty.signInUp("github", "abcd", "test@example.com", true)).user;
            assert(user.isPrimaryUser === true);

            let user1 = (await ThirdParty.signInUp("google", "abcd", "test@example.com", false)).user;
            assert(user1.isPrimaryUser === false);

            user1 = (await ThirdParty.signInUp("google", "abcd", "test@example.com", true)).user;
            assert(user1.isPrimaryUser === false);
        });

        it("sign up in links accounts during sign up with another third party account", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (await ThirdParty.signInUp("github", "abcd", "test@example.com", true)).user;
            assert(user.isPrimaryUser === true);

            let user1 = (await ThirdParty.signInUp("google", "abcd", "test@example.com", true)).user;
            assert(user1.isPrimaryUser === true);
            assert(user1.id === user.id);
            assert(user1.loginMethods.length === 2);
            assert(user1.loginMethods[0].thirdParty.id === "github");
            assert(user1.loginMethods[1].thirdParty.id === "google");
        });

        it("sign up creates primary user only if verified and verification is required and marks email as verified", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (await ThirdParty.signInUp("github", "abcd", "test@example.com", true)).user;
            assert(user.isPrimaryUser === true);

            let isVerified = await EmailVerification.isEmailVerified(user.loginMethods[0].recipeUserId);
            assert(isVerified === true);
        });

        it("sign up does not creates primary user if not verified and verification is required and does not mark email as verified", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (await ThirdParty.signInUp("github", "abcd", "test@example.com", false)).user;
            assert(user.isPrimaryUser === false);

            let isVerified = await EmailVerification.isEmailVerified(user.loginMethods[0].recipeUserId);
            assert(isVerified === false);
        });

        it("sign up creates primary user if not verified and verification is not required and does not mark email as verified", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (await ThirdParty.signInUp("github", "abcd", "test@example.com", false)).user;
            assert(user.isPrimaryUser === true);

            let isVerified = await EmailVerification.isEmailVerified(user.loginMethods[0].recipeUserId);
            assert(isVerified === false);
        });

        it("sign up does not crash if is verified boolean is true, but email verification recipe is not initialised, and does not create primary user", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (await ThirdParty.signInUp("github", "abcd", "test@example.com", true)).user;
            assert(user.isPrimaryUser === false);
        });

        it("sign up does not crash if is verified boolean is true, but email verification recipe is not initialised, and creates primary user if verification not required", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (await ThirdParty.signInUp("github", "abcd", "test@example.com", true)).user;
            assert(user.isPrimaryUser === true);
        });
    });

    describe("linkThirdPartyAccountWithUserFromSession tests", function () {
        it("linkThirdPartyAccountWithUserFromSession links account successfully and creates new recipe user when linking to primary user, and marks email as verified", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (await ThirdParty.signInUp("google", "abcd", "test@example.com", true)).user;
            assert(user.isPrimaryUser === true);

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(user.id)
            );

            let resp = await ThirdParty.linkThirdPartyAccountWithUserFromSession({
                session,
                thirdPartyId: "github",
                thirdPartyUserId: "abcd",
                email: "test@example.com",
                isVerified: true,
            });
            assert(resp.status === "OK");
            assert(resp.wereAccountsAlreadyLinked === false);

            let pUser = await supertokens.getUser(user.id);
            assert(pUser.loginMethods.length === 2);
            assert(pUser.loginMethods[0].verified === true);
            assert(pUser.loginMethods[1].verified === true);
        });

        it("linkThirdPartyAccountWithUserFromSession links account successfully and creates new recipe user when linking to primary user, and also creates a new primary user", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            if (userContext.doNotLink) {
                                return {
                                    shouldAutomaticallyLink: false,
                                };
                            }
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (
                await ThirdParty.signInUp("google", "abcd", "test@example.com", true, {
                    doNotLink: true,
                })
            ).user;
            assert(user.isPrimaryUser === false);

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(user.id)
            );

            let resp = await ThirdParty.linkThirdPartyAccountWithUserFromSession({
                session,
                thirdPartyId: "github",
                thirdPartyUserId: "abcd",
                email: "test@example.com",
                isVerified: true,
            });
            assert(resp.status === "OK");
            assert(resp.wereAccountsAlreadyLinked === false);

            let pUser = await supertokens.getUser(user.id);
            assert(pUser.isPrimaryUser === true);
            assert(pUser.loginMethods.length === 2);
        });

        it("linkThirdPartyAccountWithUserFromSession prevents linking if session user's email is not verified", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            if (userContext.doNotLink) {
                                return {
                                    shouldAutomaticallyLink: false,
                                };
                            }
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (
                await ThirdParty.signInUp("google", "abcd", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;
            assert(user.isPrimaryUser === false);

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(user.id)
            );

            try {
                await ThirdParty.linkThirdPartyAccountWithUserFromSession({
                    session,
                    thirdPartyId: "github",
                    thirdPartyUserId: "abcd",
                    email: "test@example.com",
                    isVerified: true,
                });
                assert(false);
            } catch (err) {
                assert(err.type === "INVALID_CLAIMS");
                assert.deepStrictEqual(err.payload, [
                    {
                        id: "st-ev",
                        reason: {
                            actualValue: false,
                            expectedValue: true,
                            message: "wrong value",
                        },
                    },
                ]);
            }
        });

        it("linkThirdPartyAccountWithUserFromSession succeeds linking even if session's email is not verified, but is a primary user", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            if (userContext.forceLinking) {
                                return {
                                    shouldAutomaticallyLink: true,
                                    shouldRequireVerification: false,
                                };
                            }
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (
                await ThirdParty.signInUp("google", "abcd", "test@example.com", false, {
                    forceLinking: true,
                })
            ).user;
            assert(user.isPrimaryUser === true);
            assert(user.loginMethods[0].verified === false);

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(user.id)
            );

            let resp = await ThirdParty.linkThirdPartyAccountWithUserFromSession({
                session,
                thirdPartyId: "github",
                thirdPartyUserId: "abcd",
                email: "test@example.com",
                isVerified: true,
            });
            assert(resp.status === "OK");
        });

        it("linkThirdPartyAccountWithUserFromSession succeeds, and marks new user email as verified even if sign in, but keeps primary user's email verification status unchanged - with email verification not required", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            if (userContext.doNotLink) {
                                return {
                                    shouldAutomaticallyLink: false,
                                };
                            }
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (await ThirdParty.signInUp("google", "abcd", "test@example.com", false)).user;
            assert(user.isPrimaryUser === true);
            assert(user.loginMethods[0].verified === false);

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(user.id)
            );

            let user2 = (
                await ThirdParty.signInUp("github", "abcd", "test@example.com", false, {
                    doNotLink: true,
                })
            ).user;
            assert(user2.isPrimaryUser === false);

            let resp = await ThirdParty.linkThirdPartyAccountWithUserFromSession({
                session,
                thirdPartyId: "github",
                thirdPartyUserId: "abcd",
                email: "test@example.com",
                isVerified: true,
            });
            assert(resp.status === "OK");

            user2 = await supertokens.getUser(user2.id);
            assert(user2.isPrimaryUser === true);
            assert(user2.id === user.id);
            assert(user2.loginMethods[0].verified === false);
            assert(user2.loginMethods[0].thirdParty.id === "google");
            assert(user2.loginMethods[0].thirdParty.userId === "abcd");
            assert(user2.loginMethods[1].verified === true);
            assert(user2.loginMethods[1].thirdParty.id === "github");
            assert(user2.loginMethods[1].thirdParty.userId === "abcd");
        });

        it("linkThirdPartyAccountWithUserFromSession returns NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR if email verification required and new account does not already exist", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            if (userContext.doNotLink) {
                                return {
                                    shouldAutomaticallyLink: false,
                                };
                            }
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (await ThirdParty.signInUp("google", "abcd", "test@example.com", true)).user;
            assert(user.isPrimaryUser === true);
            assert(user.loginMethods[0].verified === true);

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(user.id)
            );

            let resp = await ThirdParty.linkThirdPartyAccountWithUserFromSession({
                session,
                thirdPartyId: "github",
                thirdPartyUserId: "abcd",
                email: "test2@example.com",
                isVerified: false,
            });
            assert(resp.status === "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR");
            assert(resp.primaryUserId === user.id);
            assert(resp.email === "test2@example.com");
            let user2 = await supertokens.listUsersByAccountInfo({
                thirdParty: {
                    id: "github",
                    userId: "abcd",
                },
            });
            assert(resp.recipeUserId.getAsString() === user2[0].id);
            assert(user2[0].isPrimaryUser === false);
        });

        it("linkThirdPartyAccountWithUserFromSession returns NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR if email verification required and new account already existed", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            if (userContext.doNotLink) {
                                return {
                                    shouldAutomaticallyLink: false,
                                };
                            }
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (await ThirdParty.signInUp("google", "abcd", "test@example.com", true)).user;
            assert(user.isPrimaryUser === true);
            assert(user.loginMethods[0].verified === true);

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(user.id)
            );

            let user2 = (
                await ThirdParty.signInUp("github", "abcd", "test2@example.com", false, {
                    doNotLink: true,
                })
            ).user;
            assert(user2.isPrimaryUser === false);

            let resp = await ThirdParty.linkThirdPartyAccountWithUserFromSession({
                session,
                thirdPartyId: "github",
                thirdPartyUserId: "abcd",
                email: "test2@example.com",
                isVerified: false,
            });
            assert(resp.status === "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR");
            assert(resp.primaryUserId === user.id);
            assert(resp.email === "test2@example.com");
            user2 = await supertokens.listUsersByAccountInfo({
                thirdParty: {
                    id: "github",
                    userId: "abcd",
                },
            });
            assert(resp.recipeUserId.getAsString() === user2[0].id);
            assert(user2[0].isPrimaryUser === false);
        });

        it("linkThirdPartyAccountWithUserFromSession returns ACCOUNT_LINKING_NOT_ALLOWED_ERROR when existing recipe user id email is same as another primary user id", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            if (userContext.doNotLink) {
                                return {
                                    shouldAutomaticallyLink: false,
                                };
                            }
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user0 = (await ThirdParty.signInUp("google", "abcde", "test2@example.com", true)).user;
            assert(user0.isPrimaryUser === true);

            let user = (await ThirdParty.signInUp("google", "abcd", "test@example.com", true)).user;
            assert(user.isPrimaryUser === true);
            assert(user.loginMethods[0].verified === true);

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(user.id)
            );

            let user2 = (
                await ThirdParty.signInUp("github", "abcd", "test2@example.com", true, {
                    doNotLink: true,
                })
            ).user;
            assert(user2.isPrimaryUser === false);

            let resp = await ThirdParty.linkThirdPartyAccountWithUserFromSession({
                session,
                thirdPartyId: "github",
                thirdPartyUserId: "abcd",
                email: "test2@example.com",
                isVerified: false,
            });
            assert.deepStrictEqual(resp, {
                status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                description: "Not allowed because it will lead to two primary user id having same account info.",
            });
        });

        it("linkThirdPartyAccountWithUserFromSession returns ACCOUNT_LINKING_NOT_ALLOWED_ERROR when passing in a primary user id to the existing session", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async (_, __, ___, userContext) => {
                            if (userContext.doNotLink) {
                                return {
                                    shouldAutomaticallyLink: false,
                                };
                            }
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (await ThirdParty.signInUp("google", "abcd", "test@example.com", true)).user;
            assert(user.isPrimaryUser === true);
            assert(user.loginMethods[0].verified === true);

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(user.id)
            );

            let user2 = (await ThirdParty.signInUp("github", "abcd", "test2@example.com", true)).user;
            assert(user2.isPrimaryUser === true);

            let resp = await ThirdParty.linkThirdPartyAccountWithUserFromSession({
                session,
                thirdPartyId: "github",
                thirdPartyUserId: "abcd",
                email: "test2@example.com",
                isVerified: false,
            });
            assert.deepStrictEqual(resp, {
                status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                description: "New user is already linked to another account or is a primary user.",
            });
        });

        it("linkThirdPartyAccountWithUserFromSession returns SIGN_IN_NOT_ALLOWED if email is trying to be changed and linking to itself.", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user = (await ThirdParty.signInUp("google", "abcd", "test@example.com", true)).user;
            assert(user.isPrimaryUser === true);

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(user.id)
            );

            let user2 = (await ThirdParty.signInUp("github", "abcd", "test2@example.com", true)).user;
            assert(user2.isPrimaryUser === true);

            let resp = await ThirdParty.linkThirdPartyAccountWithUserFromSession({
                session,
                thirdPartyId: "github",
                thirdPartyUserId: "abcd",
                email: "test@example.com",
                isVerified: false,
            });
            assert.deepStrictEqual(resp, {
                status: "SIGN_IN_NOT_ALLOWED",
                reason: "Email already associated with another primary user.",
            });
        });

        it("linkThirdPartyAccountWithUserFromSession fails cause changed email already associated with another primary user, when the user trying to sign in is linked with another user", async function () {
            await startST();
            supertokens.init({
                supertokens: {
                    connectionURI: "http://localhost:8080",
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
                                ThirdParty.Google({
                                    clientId: "",
                                    clientSecret: "",
                                }),
                            ],
                        },
                    }),
                ],
            });

            let user1 = (await ThirdParty.signInUp("google", "abcd", "test@example.com", true)).user;
            assert(user1.isPrimaryUser === true);

            let user2 = (await ThirdParty.signInUp("github", "abcd", "test2@example.com", true)).user;
            assert(user2.isPrimaryUser === true);

            let user3 = (await ThirdParty.signInUp("github2", "abcd", "test2@example.com", true)).user;
            assert(user2.isPrimaryUser === true);
            assert(user3.id === user2.id);
            assert(user3.loginMethods.length === 2);

            let session = await Session.createNewSessionWithoutRequestResponse(
                supertokens.convertToRecipeUserId(user2.id)
            );

            let resp = await ThirdParty.linkThirdPartyAccountWithUserFromSession({
                session,
                thirdPartyId: "github2",
                thirdPartyUserId: "abcd",
                email: "test@example.com",
                isVerified: false,
            });
            assert.deepStrictEqual(resp, {
                status: "SIGN_IN_NOT_ALLOWED",
                reason: "Email already associated with another primary user.",
            });
        });
    });
});
