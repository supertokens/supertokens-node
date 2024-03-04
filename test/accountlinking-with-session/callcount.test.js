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
const { printPath, setupST, killAllST, cleanST, startSTWithMultitenancyAndAccountLinking } = require("../utils");
const {
    getTestEmail,
    postAPI,
    getAPI,
    putAPI,
    createEmailPasswordUser,
    makeUserPrimary,
    getSessionForUser,
    getUpdatedUserFromDBForRespCompare,
    getSessionFromResponse,
    createThirdPartyUser,
    linkUsers,
    testPassword,
} = require("./utils");
let supertokens = require("../..");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
let Session = require("../../recipe/session");
let assert = require("assert");
let EmailPassword = require("../../recipe/emailpassword");
let Passwordless = require("../../recipe/passwordless");
let ThirdParty = require("../../recipe/thirdparty");
let AccountLinking = require("../../recipe/accountlinking");
let EmailVerification = require("../../recipe/emailverification");
let MultiFactorAuth = require("../../recipe/multifactorauth");
let Multitenancy = require("../../recipe/multitenancy");

const setup = async function setup(config = {}) {
    const info = {
        coreCallCount: 0,
    };
    const connectionURI = await startSTWithMultitenancyAndAccountLinking();
    supertokens.init({
        // debug: true,
        supertokens: {
            connectionURI,
            networkInterceptor: (request) => {
                ++info.coreCallCount;
                console.log(`[${request.method}] ${request.url} - ${JSON.stringify(request.body)}`);
                return request;
            },
        },
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            websiteDomain: "supertokens.io",
        },
        recipeList: [
            EmailPassword.init(),

            ThirdParty.init({
                signInAndUpFeature: {
                    providers: [
                        {
                            config: {
                                thirdPartyId: "custom",
                                authorizationEndpoint: "https://test.com/oauth/auth",
                                tokenEndpoint: "https://test.com/oauth/token",
                                requireEmail: false,
                                clients: [
                                    {
                                        clientId: "supertokens",
                                        clientSecret: "",
                                    },
                                ],
                            },
                            override: (oI) => ({
                                ...oI,
                                exchangeAuthCodeForOAuthTokens: ({ redirectURIInfo }) => redirectURIInfo,
                                getUserInfo: ({ oAuthTokens }) => {
                                    if (oAuthTokens.error) {
                                        throw new Error("Credentials error");
                                    }
                                    return {
                                        thirdPartyUserId: oAuthTokens.userId ?? "userId",
                                        email: oAuthTokens.email && {
                                            id: oAuthTokens.email,
                                            isVerified: oAuthTokens.isVerified === true,
                                        },
                                        rawUserInfoFromProvider: {},
                                    };
                                },
                            }),
                        },
                    ],
                },
            }),
            config.initAccountLinking &&
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: (_newAccountInfo, _user, _session, _tenantId, userContext) => {
                        if (userContext.DO_NOT_LINK) {
                            return { shouldAutomaticallyLink: false };
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
            config.initMFA &&
                MultiFactorAuth.init({
                    firstFactors: config.firstFactors,
                }),
            Multitenancy.init(),
            Session.init(),
        ].filter((init) => !!init),
    });

    const app = express();
    app.use(middleware());
    app.use(errorHandler());
    return { app, info };
};

describe(`Multi-recipe account linking flows core call counts: ${printPath(
    "[test/accountlinking-with-session/callcount.test.js]"
)}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("sign up", function () {
        it("should call the core <=7 times without MFA or AL", async () => {
            const { app, info } = await setup({ initAccountLinking: false, initMFA: false });
            const email = getTestEmail();
            const resp = await signUpPOST(app, email);
            assert.strictEqual(resp.body.status, "OK");

            // tenant info
            // user list by account info
            // signup
            // get user by id
            // get email verification info
            // create session
            assert(info.coreCallCount === 7);
        });
        it("should call the core <=7 times with AL without MFA", async () => {
            const { app, info } = await setup({ initAccountLinking: true, initMFA: false });
            const email = getTestEmail();
            const resp = await signUpPOST(app, email);
            assert.strictEqual(resp.body.status, "OK");

            // tenant info
            // 2 x user list by account info
            // signup
            // get user by id
            // get email verification info
            // create session
            assert(info.coreCallCount === 7);
        });

        it("should call the core <=11 times with MFA without AL", async () => {
            const { app, info } = await setup({ initAccountLinking: false, initMFA: true });
            const email = getTestEmail();
            const resp = await signUpPOST(app, email);
            assert.strictEqual(resp.body.status, "OK");

            // 2 x tenant info
            // 2 x user list by account info
            // signup
            // 2 x get user by id
            // get email verification info
            // create session
            // get metadata
            // regen session (add MFA claim)
            assert(info.coreCallCount === 11);
        });
        it("should call the core <=11 times with MFA and AL", async () => {
            const { app, info } = await setup({ initAccountLinking: true, initMFA: true });
            const email = getTestEmail();
            const resp = await signUpPOST(app, email);
            assert.strictEqual(resp.body.status, "OK");

            // 2 x tenant info
            // 2 x user list by account info
            // signup
            // 2 x get user by id
            // get email verification info
            // create session
            // get metadata
            // regen session (add MFA claim)
            assert(info.coreCallCount === 11);
        });
    });

    describe("sign in", function () {
        it("should call the core <=7 times without MFA or AL", async () => {
            const { app, info } = await setup({ initAccountLinking: false, initMFA: false });
            const email = getTestEmail();
            await createEmailPasswordUser(email, true);
            info.coreCallCount = 0;
            const resp = await signInPOST(app, email);
            assert.strictEqual(resp.body.status, "OK");

            // tenant info
            // user list by account info
            // signup
            // get user by id
            // get email verification info
            // create session
            assert(info.coreCallCount === 7);
        });
        it("should call the core <=7 times with AL without MFA", async () => {
            const { app, info } = await setup({ initAccountLinking: true, initMFA: false });

            const email = getTestEmail();
            await createEmailPasswordUser(email);
            info.coreCallCount = 0;

            const resp = await signInPOST(app, email);
            assert.strictEqual(resp.body.status, "OK");

            // tenant info
            // 2 x user list by account info
            // signup
            // get user by id
            // get email verification info
            // create session
            assert(info.coreCallCount === 7);
        });

        it("should call the core <=11 times with MFA without AL", async () => {
            const { app, info } = await setup({ initAccountLinking: false, initMFA: true });

            const email = getTestEmail();
            await createEmailPasswordUser(email);
            info.coreCallCount = 0;

            const resp = await signInPOST(app, email);
            assert.strictEqual(resp.body.status, "OK");

            // 2 x tenant info
            // 2 x user list by account info
            // signup
            // 2 x get user by id
            // get email verification info
            // create session
            // get metadata
            // regen session (add MFA claim)
            assert(info.coreCallCount === 11);
        });
        it("should call the core <=11 times with MFA and AL", async () => {
            const { app, info } = await setup({ initAccountLinking: true, initMFA: true });

            const email = getTestEmail();
            await createEmailPasswordUser(email);
            info.coreCallCount = 0;

            const resp = await signInPOST(app, email);
            assert.strictEqual(resp.body.status, "OK");

            // 2 x tenant info
            // 2 x user list by account info
            // signup
            // 2 x get user by id
            // get email verification info
            // create session
            // get metadata
            // regen session (add MFA claim)
            assert(info.coreCallCount === 11);
        });
    });

    describe("sign up w/ session", function () {
        it("should call the core <=6 times without MFA or AL", async () => {
            const { app, info } = await setup({ initAccountLinking: false, initMFA: false });
            const email = getTestEmail();
            const user = await createThirdPartyUser(email, true);
            const session = await getSessionForUser(user);
            info.coreCallCount = 0;

            const resp = await signUpPOST(app, email, session);
            assert.strictEqual(resp.body.status, "OK");

            // tenant info
            // user list by account info
            // signup
            // get user by id
            // get email verification info
            // create session
            assert.strictEqual(info.coreCallCount, 6);
        });

        it("should call the core <=9 times with AL without MFA", async () => {
            const { app, info } = await setup({ initAccountLinking: true, initMFA: false });

            const email = getTestEmail();
            const user = await createThirdPartyUser(email, true);
            const session = await getSessionForUser(user);
            info.coreCallCount = 0;

            const resp = await signUpPOST(app, email, session);
            assert.strictEqual(resp.body.status, "OK");

            // tenant info
            // 2 x user list by account info
            // signup
            // 2 x get user by id
            // get email verification info
            // link
            // create token
            // consume token

            assert.strictEqual(info.coreCallCount, 9);
        });

        it("should call the core <=17 times with MFA and AL", async () => {
            const { app, info } = await setup({ initAccountLinking: true, initMFA: true });

            const email = getTestEmail();
            const user = await createThirdPartyUser(email, true);
            const session = await getSessionForUser(user);
            info.coreCallCount = 0;
            console.log("==========");
            const resp = await signUpPOST(app, email, session);
            assert.strictEqual(resp.body.status, "OK");

            // 2 x tenant info
            // 2 x user list by account info
            // signup
            // 2 x get user by id
            // get email verification info
            // create session
            // get metadata
            // regen session (add MFA claim)
            assert(info.coreCallCount === 17);
        });
    });
});

async function signInUpPOST(app, email, isVerified, session, userId = email, error = undefined) {
    return postAPI(
        app,
        "/auth/signinup",
        {
            thirdPartyId: "custom",
            oAuthTokens: {
                email,
                isVerified,
                userId,
                error,
            },
        },
        session
    );
}

async function signUpPOST(app, email, session, password = testPassword) {
    return postAPI(
        app,
        "/auth/signup",
        {
            formFields: [
                { id: "email", value: email },
                { id: "password", value: password },
            ],
        },
        session
    );
}

async function signInPOST(app, email, session, password = testPassword) {
    return postAPI(
        app,
        "/auth/signin",
        {
            formFields: [
                { id: "email", value: email },
                { id: "password", value: password },
            ],
        },
        session
    );
}

async function mfaInfoPUT(app, session) {
    return putAPI(app, "/auth/mfa/info", undefined, session);
}
