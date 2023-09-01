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

describe(`emailverificationTests: ${printPath("[test/accountlinking/emailverification.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("verifyEmailUsingToken tests", function () {
        it("verifyEmailUsingToken links account if required", async function () {
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
                    EmailPassword.init(),
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abcd",
                "test@example.com",
                false
            );
            assert(tpUser.user.isPrimaryUser === false);
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            let epUser = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                epUser.loginMethods[0].recipeUserId
            );

            {
                let user = await supertokens.getUser(epUser.id);
                assert(user.isPrimaryUser === false);
            }

            let userFromVerification = await EmailVerification.verifyEmailUsingToken("public", token.token);
            assert(userFromVerification.user.recipeUserId.getAsString() === epUser.id);

            {
                let user = await supertokens.getUser(epUser.id);
                assert(user.isPrimaryUser === true);
                assert(user.id === tpUser.user.id);
            }
        });

        it("verifyEmailUsingToken links account only if the associated email is verified", async function () {
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
                    EmailPassword.init(),
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abcd",
                "test@example.com",
                false
            );
            assert(tpUser.user.isPrimaryUser === false);
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            let epUser = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            {
                let token = await EmailVerification.createEmailVerificationToken(
                    "public",
                    epUser.loginMethods[0].recipeUserId
                );
                await EmailVerification.verifyEmailUsingToken("public", token.token, false);
                let user = await supertokens.getUser(epUser.id);
                assert(user.isPrimaryUser === false);
            }

            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                epUser.loginMethods[0].recipeUserId,
                "test2@example.com"
            );

            {
                let user = await supertokens.getUser(epUser.id);
                assert(user.isPrimaryUser === false);
            }

            let userFromVerification = await EmailVerification.verifyEmailUsingToken("public", token.token);
            assert(userFromVerification.user.recipeUserId.getAsString() === epUser.id);

            {
                let user = await supertokens.getUser(epUser.id);
                assert(user.isPrimaryUser === false);
                assert(user.id === epUser.id);
            }
        });

        it("verifyEmailUsingToken creates primary user if required", async function () {
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
                    EmailPassword.init(),
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let epUser = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                epUser.loginMethods[0].recipeUserId
            );

            {
                let user = await supertokens.getUser(epUser.id);
                assert(user.isPrimaryUser === false);
            }

            let userFromVerification = await EmailVerification.verifyEmailUsingToken("public", token.token);
            assert(userFromVerification.user.recipeUserId.getAsString() === epUser.id);

            {
                let user = await supertokens.getUser(epUser.id);
                assert(user.isPrimaryUser === true);
            }
        });

        it("verifyEmailUsingToken does not link account if account linking is disabled", async function () {
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
                    EmailPassword.init(),
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abcd",
                "test@example.com",
                false
            );
            assert(tpUser.user.isPrimaryUser === false);
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            let epUser = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                epUser.loginMethods[0].recipeUserId
            );

            {
                let user = await supertokens.getUser(epUser.id);
                assert(user.isPrimaryUser === false);
            }

            let userFromVerification = await EmailVerification.verifyEmailUsingToken("public", token.token);
            assert(userFromVerification.user.recipeUserId.getAsString() === epUser.id);

            {
                let user = await supertokens.getUser(epUser.id);
                assert(user.isPrimaryUser === false);
                assert(user.id === epUser.id);
            }
        });

        it("verifyEmailUsingToken does not create a primary user if account linking is disabled", async function () {
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
                    EmailPassword.init(),
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            let epUser = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                epUser.loginMethods[0].recipeUserId
            );

            {
                let user = await supertokens.getUser(epUser.id);
                assert(user.isPrimaryUser === false);
            }

            let userFromVerification = await EmailVerification.verifyEmailUsingToken("public", token.token);
            assert(userFromVerification.user.recipeUserId.getAsString() === epUser.id);

            {
                let user = await supertokens.getUser(epUser.id);
                assert(user.isPrimaryUser === false);
            }
        });

        it("verifyEmailUsingToken does not create a primary user if account linking is disabled and attemptAccountLinking is false", async function () {
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
                    EmailPassword.init(),
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: false,
                            };
                        },
                    }),
                ],
            });

            let epUser = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                epUser.loginMethods[0].recipeUserId
            );

            {
                let user = await supertokens.getUser(epUser.id);
                assert(user.isPrimaryUser === false);
            }

            let userFromVerification = await EmailVerification.verifyEmailUsingToken("public", token.token, false);
            assert(userFromVerification.user.recipeUserId.getAsString() === epUser.id);

            {
                let user = await supertokens.getUser(epUser.id);
                assert(user.isPrimaryUser === false);
            }
        });

        it("verifyEmailUsingToken does not link accounts if attemptAccountLinking is false even if account linking callback allows it", async function () {
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
                    EmailPassword.init(),
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abcd",
                "test@example.com",
                false
            );
            assert(tpUser.user.isPrimaryUser === false);
            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(tpUser.user.id));

            let epUser = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                epUser.loginMethods[0].recipeUserId
            );

            {
                let user = await supertokens.getUser(epUser.id);
                assert(user.isPrimaryUser === false);
            }

            let userFromVerification = await EmailVerification.verifyEmailUsingToken("public", token.token, false);
            assert(userFromVerification.user.recipeUserId.getAsString() === epUser.id);

            {
                let user = await supertokens.getUser(epUser.id);
                assert(user.isPrimaryUser === false);
                assert(user.id === epUser.id);
            }
        });
    });

    describe("isEmailVerified tests", function () {
        it("isEmailVerified checks recipe level user and not primary user", async function () {
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
                    EmailPassword.init(),
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abcd",
                "test@example.com",
                true
            );
            assert(tpUser.user.isPrimaryUser);
            let epUser = (await EmailPassword.signUp("public", "test2@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);

            await AccountLinking.linkAccounts(epUser.loginMethods[0].recipeUserId, tpUser.user.id);

            epUser = await supertokens.getUser(epUser.id);
            assert(epUser.isPrimaryUser === true);
            assert(epUser.loginMethods.length === 2);

            for (let i = 0; i < epUser.loginMethods.length; i++) {
                let lm = epUser.loginMethods[i];
                if (lm.recipeId === "emailpassword") {
                    assert(!(await EmailVerification.isEmailVerified(lm.recipeUserId)));
                } else {
                    assert(await EmailVerification.isEmailVerified(supertokens.convertToRecipeUserId(epUser.id)));
                }
            }
        });
    });

    describe("unverifyEmail tests", function () {
        it("unverifyEmail unverifies only recipe level user and has no effect on account linking", async function () {
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
                    EmailPassword.init(),
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: async function (input) {
                            return {
                                shouldAutomaticallyLink: true,
                                shouldRequireVerification: true,
                            };
                        },
                    }),
                ],
            });

            let tpUser = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abcd",
                "test@example.com",
                true
            );
            assert(tpUser.user.isPrimaryUser);

            let epUser = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            assert(epUser.isPrimaryUser === false);
            {
                let token = await EmailVerification.createEmailVerificationToken(
                    "public",
                    supertokens.convertToRecipeUserId(epUser.id)
                );
                await EmailVerification.verifyEmailUsingToken("public", token.token);
            }

            {
                let linkedUser = await supertokens.getUser(epUser.id);
                assert(linkedUser.isPrimaryUser === true);
                assert(linkedUser.loginMethods.length === 2);

                assert(await EmailVerification.isEmailVerified(supertokens.convertToRecipeUserId(tpUser.user.id)));

                for (let i = 0; i < linkedUser.loginMethods.length; i++) {
                    let lm = linkedUser.loginMethods[i];
                    if (lm.recipeId === "emailpassword") {
                        assert(await EmailVerification.isEmailVerified(lm.recipeUserId));
                    } else {
                        assert(
                            await EmailVerification.isEmailVerified(supertokens.convertToRecipeUserId(linkedUser.id))
                        );
                    }
                }
            }

            await EmailVerification.unverifyEmail(supertokens.convertToRecipeUserId(epUser.id));

            {
                let linkedUser = await supertokens.getUser(epUser.id);
                assert(linkedUser.isPrimaryUser === true);
                assert(linkedUser.loginMethods.length === 2);

                assert(await EmailVerification.isEmailVerified(supertokens.convertToRecipeUserId(tpUser.user.id)));

                for (let i = 0; i < linkedUser.loginMethods.length; i++) {
                    let lm = linkedUser.loginMethods[i];
                    if (lm.recipeId === "emailpassword") {
                        assert(!(await EmailVerification.isEmailVerified(lm.recipeUserId)));
                    } else {
                        assert(
                            await EmailVerification.isEmailVerified(supertokens.convertToRecipeUserId(linkedUser.id))
                        );
                    }
                }
            }
        });
    });
});
