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

async function setup(config = {}) {
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

                createAndSendCustomTextMessage: (input) => {
                    userInputCode = input.userInputCode;
                    console.log(input);
                    return;
                },
                createAndSendCustomEmail: (input) => {
                    console.log(input);
                    userInputCode = input.userInputCode;
                    return;
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
                                        thirdPartyUserId: oAuthTokens.userId ?? "user",
                                        email: {
                                            id: oAuthTokens.email ?? "email@test.com",
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
}
exports.setup = setup;

async function createPasswordlessUser(accountInfo, isVerified = true, tenantId = "public") {
    const res = await Passwordless.signInUp({ ...accountInfo, tenantId, userContext: { DO_NOT_LINK: true } });
    assert.strictEqual(res.status, "OK");

    if (isVerified === false) {
        await EmailVerification.unverifyEmail(res.recipeUserId);
    }
    return res.user;
}
exports.createPasswordlessUser = createPasswordlessUser;

async function createEmailPasswordUser(email, isVerified = false, tenantId = "public") {
    const res = await EmailPassword.signUp(tenantId, email, exports.testPassword, undefined, { DO_NOT_LINK: true });
    assert.strictEqual(res.status, "OK");

    if (isVerified) {
        const token = await EmailVerification.createEmailVerificationToken(tenantId, res.recipeUserId);
        const verifyRes = await EmailVerification.verifyEmailUsingToken(tenantId, token.token, false);
        assert.strictEqual(verifyRes.status, "OK");
    }

    return res.user;
}
exports.createEmailPasswordUser = createEmailPasswordUser;

async function createThirdPartyUser(email, isVerified = false, tenantId = "public", thirdPartyUserId = email) {
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
}
exports.createThirdPartyUser = createThirdPartyUser;

async function makeUserPrimary(user) {
    const res = await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);
    assert.strictEqual(res.status, "OK");
    return res.user;
}
exports.makeUserPrimary = makeUserPrimary;

async function linkUsers(primaryUser, otherUser) {
    const res = await AccountLinking.linkAccounts(otherUser.loginMethods[0].recipeUserId, primaryUser.id);
    assert.strictEqual(res.status, "OK");
    return res.user;
}
exports.linkUsers = linkUsers;

async function getUpdatedUserFromDBForRespCompare(user) {
    return JSON.parse(JSON.stringify((await supertokens.getUser(user.id)).toJson()));
}
exports.getUpdatedUserFromDBForRespCompare = getUpdatedUserFromDBForRespCompare;

async function getSessionForUser(user, tenantId = "public") {
    return Session.createNewSessionWithoutRequestResponse(tenantId, user.loginMethods[0].recipeUserId);
}
exports.getSessionForUser = getSessionForUser;

async function post(app, path, body, session) {
    const req = request(app).post(path);
    if (session) {
        const sessionTokens = session.getAllSessionTokensDangerously();
        req.set("Authorization", `Bearer ${sessionTokens.accessToken}`);
    }
    return req.send(body);
}
exports.post = post;
function getTestEmail(suffix) {
    return `john.doe+${Date.now()}+${suffix ?? 1}@supertokens.io`;
}
exports.getTestEmail = getTestEmail;
exports.testPassword = "Asdf12..";
exports.wrongPassword = "nopenope";
