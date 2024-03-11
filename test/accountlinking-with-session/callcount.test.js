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
let { verifySession } = require("../../recipe/session/framework/express");
let assert = require("assert");
let EmailPassword = require("../../recipe/emailpassword");
let Passwordless = require("../../recipe/passwordless");
let ThirdParty = require("../../recipe/thirdparty");
let AccountLinking = require("../../recipe/accountlinking");
let EmailVerification = require("../../recipe/emailverification");
let MultiFactorAuth = require("../../recipe/multifactorauth");
let TOTP = require("../../recipe/totp");
let Multitenancy = require("../../recipe/multitenancy");
let { TOTP: TOTPGenerator } = require("otpauth");

const setup = async function setup(config = {}) {
    const info = {
        coreCallCount: 0,
    };
    const connectionURI = await startSTWithMultitenancyAndAccountLinking();
    supertokens.init({
        // debug: true,
        supertokens: {
            connectionURI,
            networkInterceptor: (request, userContext) => {
                ++info.coreCallCount;
                // console.log(`[${request.method}] ${request.url}?${new URLSearchParams(request.params).toString()}`);
                // console.log("cache", userContext?.key, Object.keys(userContext?._default?.coreCallCache ?? {}));
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
            Passwordless.init({
                flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                contactMethod: "EMAIL_OR_PHONE",
            }),
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
                        if (_tenantId?.DO_NOT_LINK || userContext?.DO_NOT_LINK) {
                            return { shouldAutomaticallyLink: false };
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
            Multitenancy.init(),
            Session.init(),
            config.initMFA &&
                MultiFactorAuth.init({
                    firstFactors: config.firstFactors,
                }),
            config.initMFA && TOTP.init({}),
        ].filter((init) => !!init),
    });

    const app = express();
    app.use(middleware());
    app.use(errorHandler());
    app.get("/verify", verifySession(), (req, res) => res.send({ status: "OK" }));
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
        it("should call the core <=6 times without MFA or AL", async () => {
            const { app, info } = await setup({ initAccountLinking: false, initMFA: false });
            const email = getTestEmail();
            const resp = await signUpPOST(app, email);
            assert.strictEqual(resp.body.status, "OK");

            assert.strictEqual(info.coreCallCount, 6);
        });
        it("should call the core <=8 times with AL without MFA", async () => {
            const { app, info } = await setup({ initAccountLinking: true, initMFA: false });
            const email = getTestEmail();
            const resp = await signUpPOST(app, email);
            assert.strictEqual(resp.body.status, "OK");

            assert.strictEqual(info.coreCallCount, 8);
        });

        it("should call the core <=12 times with MFA and AL", async () => {
            const { app, info } = await setup({ initAccountLinking: true, initMFA: true });
            const email = getTestEmail();
            const resp = await signUpPOST(app, email);
            assert.strictEqual(resp.body.status, "OK");

            assert.strictEqual(info.coreCallCount, 12);
        });
    });

    describe("sign in", function () {
        it("should call the core <=6 times without MFA or AL", async () => {
            const { app, info } = await setup({ initAccountLinking: false, initMFA: false });
            const email = getTestEmail();
            await createEmailPasswordUser(email, true);
            info.coreCallCount = 0;

            const resp = await signInPOST(app, email);
            assert.strictEqual(resp.body.status, "OK");

            assert.strictEqual(info.coreCallCount, 6);
        });
        it("should call the core <=9 times with AL without MFA", async () => {
            const { app, info } = await setup({ initAccountLinking: true, initMFA: false });

            const email = getTestEmail();
            await createEmailPasswordUser(email);
            info.coreCallCount = 0;

            const resp = await signInPOST(app, email);
            assert.strictEqual(resp.body.status, "OK");

            assert.strictEqual(info.coreCallCount, 9);
        });

        it("should call the core <=13 times with MFA and AL", async () => {
            const { app, info } = await setup({ initAccountLinking: true, initMFA: true });

            const email = getTestEmail();
            await createEmailPasswordUser(email);
            info.coreCallCount = 0;

            const resp = await signInPOST(app, email);
            assert.strictEqual(resp.body.status, "OK");

            assert.strictEqual(info.coreCallCount, 13);
        });
    });

    describe("sign up w/ session", function () {
        it("should call the core <=3 times without MFA or AL", async () => {
            const { app, info } = await setup({ initAccountLinking: false, initMFA: false });
            const email = getTestEmail();
            let user = await createThirdPartyUser(email, true);
            user = await makeUserPrimary(user);
            const session = await getSessionForUser(user);
            info.coreCallCount = 0;

            const resp = await signUpPOST(app, email, session);
            assert.strictEqual(resp.body.status, "OK");

            assert.strictEqual(info.coreCallCount, 3);
        });

        it("should call the core <=9 times with AL without MFA", async () => {
            const { app, info } = await setup({ initAccountLinking: true, initMFA: false });

            const email = getTestEmail();
            const user = await createThirdPartyUser(email, true);
            const session = await getSessionForUser(user);
            info.coreCallCount = 0;

            const resp = await signUpPOST(app, email, session);
            assert.strictEqual(resp.body.status, "OK");
            assert.strictEqual(info.coreCallCount, 9);
        });

        it("should call the core <=17 times with MFA and AL while marking the new user verified, migrating the session and make the session user primary", async () => {
            const { app, info } = await setup({ initAccountLinking: true, initMFA: true });

            const email = getTestEmail();
            let user = await createThirdPartyUser(email, true);
            const session = await getSessionForUser(user);
            info.coreCallCount = 0;
            // console.log("==========");
            const resp = await signUpPOST(app, email, session);
            assert.strictEqual(resp.body.status, "OK");

            assert.strictEqual(info.coreCallCount, 17);
        });
        it("should call the core <=15 times with MFA and AL while migrating the session and making the session user primary", async () => {
            const { app, info } = await setup({ initAccountLinking: true, initMFA: true });

            const email = getTestEmail();
            let user = await createThirdPartyUser(email, false);
            const session = await getSessionForUser(user);
            info.coreCallCount = 0;
            // console.log("==========");
            const resp = await signUpPOST(app, email, session);
            assert.strictEqual(resp.body.status, "OK");

            assert.strictEqual(info.coreCallCount, 15);
        });
        it("should call the core <=13 times with MFA and AL while migrating the session", async () => {
            const { app, info } = await setup({ initAccountLinking: true, initMFA: true });

            const email = getTestEmail();
            let user = await createThirdPartyUser(email, false);
            user = await makeUserPrimary(user);
            const session = await getSessionForUser(user);
            info.coreCallCount = 0;
            // console.log("==========");
            const resp = await signUpPOST(app, email, session);
            assert.strictEqual(resp.body.status, "OK");

            assert.strictEqual(info.coreCallCount, 13);
        });
        it("should call the core <=9 times with MFA and AL", async () => {
            const { app, info } = await setup({ initAccountLinking: true, initMFA: true });

            const email = getTestEmail();
            let user = await createThirdPartyUser(email, false);
            user = await makeUserPrimary(user);
            const session = await getSessionForUser(user);
            await session.fetchAndSetClaim(MultiFactorAuth.MultiFactorAuthClaim);
            info.coreCallCount = 0;
            // console.log("==========");
            const resp = await signUpPOST(app, email, session);
            assert.strictEqual(resp.body.status, "OK");

            assert.strictEqual(info.coreCallCount, 9);
        });
    });

    describe("factor completion", function () {
        it("should call the core <=8 times when completing otp-email", async () => {
            const { app, info } = await setup({ initAccountLinking: true, initMFA: true });

            const email = getTestEmail();
            const user = await createThirdPartyUser(email, true);
            const session = await getSessionForUser(user);

            const code0 = await Passwordless.createCode({ email, tenantId: "public", session });
            const resp0 = await consumeCodePOST(app, code0, session);
            assert.strictEqual(resp0.body.status, "OK");

            const code = await Passwordless.createCode({ email, tenantId: "public", session });
            // console.log("=======================");
            info.coreCallCount = 0;

            const resp = await consumeCodePOST(app, code, session);
            assert.strictEqual(resp.body.status, "OK");
            assert.strictEqual(info.coreCallCount, 8);
        });

        it("should call the core <=5 times when completing totp", async () => {
            const { app, info } = await setup({ initAccountLinking: true, initMFA: true });

            const email = getTestEmail();
            const user = await createThirdPartyUser(email, true);
            const session = await getSessionForUser(user);

            const device = await TOTP.createDevice(user.id);
            const totpGen = new TOTPGenerator({ secret: device.secret });
            const verifyRes = await TOTP.verifyDevice(
                "public",
                user.id,
                device.deviceName,
                totpGen.generate({ timestamp: Date.now() - 30000 })
            );
            assert.strictEqual(verifyRes.status, "OK");

            // console.log("=======================");
            info.coreCallCount = 0;

            const resp = await totpVerifyPOST(app, totpGen.generate({ timestamp: Date.now() + 30000 }), session);
            assert.strictEqual(resp.body.status, "OK");
            assert.strictEqual(info.coreCallCount, 5);
        });
    });
});

async function consumeCodePOST(app, code, session) {
    return postAPI(
        app,
        "/auth/signinup/code/consume",
        code.userInputCode !== undefined
            ? {
                  preAuthSessionId: code.preAuthSessionId,
                  userInputCode: code.userInputCode,
                  deviceId: code.deviceId,
              }
            : {
                  preAuthSessionId: code.preAuthSessionId,
                  linkCode: code.linkCode,
              },
        session
    );
}

async function totpVerifyPOST(app, totp, session) {
    return postAPI(
        app,
        "/auth/totp/verify",
        {
            totp,
        },
        session
    );
}

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
