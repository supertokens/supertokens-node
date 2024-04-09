const { startSTWithMultitenancyAndAccountLinking } = require("../utils");
let supertokens = require("../..");
let Session = require("../../recipe/session");
let assert = require("assert");
let EmailPassword = require("../../recipe/emailpassword");
let Passwordless = require("../../recipe/passwordless");
let ThirdParty = require("../../recipe/thirdparty");
let AccountLinking = require("../../recipe/accountlinking");
let EmailVerification = require("../../recipe/emailverification");
let MultiFactorAuth = require("../../recipe/multifactorauth");
let Multitenancy = require("../../recipe/multitenancy");
const express = require("express");
let { middleware, errorHandler } = require("../../framework/express");
const request = require("supertest");

exports.setup = async function setup(config = {}) {
    const connectionURI = await startSTWithMultitenancyAndAccountLinking();
    supertokens.init({
        // debug: true,
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
            Passwordless.init({
                contactMethod: "EMAIL_OR_PHONE",
                flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                emailDelivery: {
                    service: {
                        sendEmail: (input) => {
                            if (config.emailInputs) {
                                config.emailInputs.push(input);
                            }
                            return;
                        },
                    },
                },
                smsDelivery: {
                    service: {
                        sendSms: (input) => {
                            if (config.smsInputs) {
                                config.smsInputs.push(input);
                            }
                            return;
                        },
                    },
                },
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
            AccountLinking.init({
                shouldDoAutomaticAccountLinking: (_newAccountInfo, _user, _session, _tenantId, userContext) => {
                    if (userContext.DO_NOT_LINK) {
                        return { shouldAutomaticallyLink: false };
                    }
                    if (config.shouldDoAutomaticAccountLinking) {
                        return config.shouldDoAutomaticAccountLinking(
                            _newAccountInfo,
                            _user,
                            _session,
                            _tenantId,
                            userContext
                        );
                    }
                    return (
                        config.shouldDoAutomaticAccountLinkingValue ?? {
                            shouldAutomaticallyLink: true,
                            shouldRequireVerification: true,
                        }
                    );
                },
            }),
            EmailVerification.init({
                mode: "OPTIONAL",
            }),
            MultiFactorAuth.init({
                firstFactors: config.firstFactors,
            }),
            Multitenancy.init(),
            Session.init(),
        ],
    });

    await Multitenancy.createOrUpdateTenant("tenant1", {
        passwordlessEnabled: true,
        thirdPartyEnabled: true,
        emailPasswordEnabled: true,
    });
    await Multitenancy.createOrUpdateTenant("tenant2", {
        passwordlessEnabled: true,
        thirdPartyEnabled: true,
        emailPasswordEnabled: true,
    });

    const app = express();
    app.use(middleware());
    app.use(errorHandler());
    return app;
};

exports.createPasswordlessUser = async function createPasswordlessUser(
    accountInfo,
    isVerified = true,
    tenantId = "public"
) {
    const res = await Passwordless.signInUp({ ...accountInfo, tenantId, userContext: { DO_NOT_LINK: true } });
    assert.strictEqual(res.status, "OK");

    if (isVerified === false) {
        await EmailVerification.unverifyEmail(res.recipeUserId);
    }
    return res.user;
};

exports.createEmailPasswordUser = async function createEmailPasswordUser(
    email,
    isVerified = false,
    tenantId = "public"
) {
    const res = await EmailPassword.signUp(tenantId, email, exports.testPassword, undefined, { DO_NOT_LINK: true });
    assert.strictEqual(res.status, "OK");

    if (isVerified) {
        const token = await EmailVerification.createEmailVerificationToken(tenantId, res.recipeUserId);
        const verifyRes = await EmailVerification.verifyEmailUsingToken(tenantId, token.token, false);
        assert.strictEqual(verifyRes.status, "OK");
    }

    return res.user;
};

exports.createThirdPartyUser = async function createThirdPartyUser(
    email,
    isVerified = false,
    tenantId = "public",
    thirdPartyUserId = email
) {
    const res = await ThirdParty.manuallyCreateOrUpdateUser(
        tenantId,
        "custom",
        thirdPartyUserId,
        email,
        isVerified,
        undefined,
        {
            DO_NOT_LINK: true,
        }
    );
    assert.strictEqual(res.status, "OK");

    return res.user;
};

exports.makeUserPrimary = async function makeUserPrimary(user) {
    const res = await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);
    assert.strictEqual(res.status, "OK");
    return res.user;
};

exports.linkUsers = async function linkUsers(primaryUser, otherUser) {
    const res = await AccountLinking.linkAccounts(otherUser.loginMethods[0].recipeUserId, primaryUser.id);
    assert.strictEqual(res.status, "OK");
    return res.user;
};

exports.getUpdatedUserFromDBForRespCompare = async function getUpdatedUserFromDBForRespCompare(user) {
    return JSON.parse(JSON.stringify((await supertokens.getUser(user.id)).toJson()));
};

exports.getSessionForUser = async function getSessionForUser(user, tenantId = "public") {
    return Session.createNewSessionWithoutRequestResponse(tenantId, user.loginMethods[0].recipeUserId);
};

exports.postAPI = async function post(app, path, body, session) {
    const req = request(app).post(path);
    if (session) {
        const sessionTokens = session.getAllSessionTokensDangerously();
        req.set("Authorization", `Bearer ${sessionTokens.accessToken}`);
    }
    return req.send(body);
};

exports.getAPI = async function getAPI(app, path, session) {
    const req = request(app).get(path);
    if (session) {
        const sessionTokens = session.getAllSessionTokensDangerously();
        req.set("Authorization", `Bearer ${sessionTokens.accessToken}`);
    }
    return req.send();
};

exports.putAPI = async function putAPI(app, path, body, session) {
    const req = request(app).put(path);
    if (session) {
        const sessionTokens = session.getAllSessionTokensDangerously();
        req.set("Authorization", `Bearer ${sessionTokens.accessToken}`);
    }
    return req.send(body);
};

exports.getTestEmail = function getTestEmail(suffix) {
    return `john.doe+${Date.now()}+${suffix ?? 1}@supertokens.io`;
};

exports.getTestPhoneNumber = function () {
    return `+3630${Date.now().toString().substr(-7)}`;
};

exports.testPassword = "Asdf12..";
exports.wrongPassword = "nopenope";

exports.getSessionFromResponse = function getSessionFromResponse(resp) {
    return Session.getSessionWithoutRequestResponse(resp.headers["st-access-token"], undefined);
};
