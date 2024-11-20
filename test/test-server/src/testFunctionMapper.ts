import { User } from "../../../lib/build";
import supertokens from "../../../";
import { RecipeLevelUser } from "../../../lib/build/recipe/accountlinking/types";

export type OverrideParamsType = {
    sendEmailToUserId: string | undefined;
    token: string | undefined;
    userPostPasswordReset: User | undefined;
    emailPostPasswordReset: string | undefined;
    sendEmailCallbackCalled: boolean | undefined;
    sendEmailToUserEmail: string | undefined;
    sendEmailToRecipeUserId: any | undefined;
    userInCallback: { id: string; email: string; recipeUserId: supertokens.RecipeUserId } | undefined;
    email: string | undefined;
    newAccountInfoInCallback: RecipeLevelUser | undefined;
    primaryUserInCallback: User | undefined;
    userIdInCallback: string | undefined;
    recipeUserIdInCallback: supertokens.RecipeUserId | string | undefined;
    info: {
        coreCallCount: number;
    };
    store: any;
    sendEmailInputs: any[]; // for passwordless sendEmail override
    sendSmsInputs: any[]; // for passwordless sendSms override
};

let sendEmailToUserId = undefined;
let token = undefined;
let userPostPasswordReset = undefined;
let emailPostPasswordReset = undefined;
let sendEmailCallbackCalled = false;
let sendEmailToUserEmail = undefined;
let sendEmailInputs: string[] = [];
let sendSmsInputs: string[] = [];
let sendEmailToRecipeUserId = undefined;
let userInCallback = undefined;
let email = undefined;
let primaryUserInCallback;
let newAccountInfoInCallback;
let userIdInCallback;
let recipeUserIdInCallback;
const info = {
    coreCallCount: 0,
};
let store;

export function getOverrideParams(): OverrideParamsType {
    let sessionVars = getSessionVars();
    return {
        sendEmailToUserId,
        token,
        userPostPasswordReset,
        emailPostPasswordReset,
        sendEmailCallbackCalled,
        sendEmailToUserEmail,
        sendEmailInputs,
        sendSmsInputs,
        sendEmailToRecipeUserId,
        userInCallback,
        email,
        newAccountInfoInCallback,
        primaryUserInCallback: primaryUserInCallback?.toJson(),
        userIdInCallback: userIdInCallback ?? sessionVars.userIdInCallback,
        recipeUserIdInCallback:
            recipeUserIdInCallback?.getAsString() ??
            recipeUserIdInCallback ??
            sessionVars.recipeUserIdInCallback?.getAsString(),
        info,
        store,
    };
}

export function resetOverrideParams() {
    sendEmailToUserId = undefined;
    token = undefined;
    userPostPasswordReset = undefined;
    emailPostPasswordReset = undefined;
    sendEmailCallbackCalled = false;
    sendEmailToUserEmail = undefined;
    sendEmailToRecipeUserId = undefined;
    sendEmailInputs = [];
    sendSmsInputs = [];
    userInCallback = undefined;
    email = undefined;
    newAccountInfoInCallback = undefined;
    primaryUserInCallback = undefined;
    userIdInCallback = undefined;
    recipeUserIdInCallback = undefined;
    info.coreCallCount = 0;
    store = undefined;
    userIdInCallback = undefined;
    recipeUserIdInCallback = undefined;
}

function getSessionVars() {
    return {
        userIdInCallback,
        recipeUserIdInCallback,
    };
}

export function getFunc(evalStr: string): (...args: any[]) => any {
    if (evalStr.startsWith("defaultValues:")) {
        const defaultValues = JSON.parse(evalStr.split("defaultValues:")[1]);
        if (!Array.isArray(defaultValues)) {
            throw new Error("defaultValues must be an array");
        }
        return () => defaultValues.pop();
    }

    if (evalStr.startsWith("session.fetchAndSetClaim")) {
        return async (a, c) => {
            userIdInCallback = a;
            recipeUserIdInCallback = c;
        };
    }

    if (evalStr.startsWith("accountlinking.init.onAccountLinked")) {
        return (a, n) => {
            primaryUserInCallback = a;
            newAccountInfoInCallback = n;
        };
    }

    if (evalStr.startsWith("accountlinking.init.shouldDoAutomaticAccountLinking")) {
        if (evalStr.includes("onlyLinkIfNewUserVerified")) {
            return async (newUserAccount, existingUser, session, tenantId, userContext) => {
                if (userContext.DO_NOT_LINK) {
                    return { shouldAutomaticallyLink: false };
                }
                // if the user account uses third party, and if it is about to be linked to an existing user
                if (newUserAccount.thirdParty !== undefined && existingUser !== undefined) {
                    // The main idea here is that we want to do account linking only if we know that the
                    // email is already verified for the newUserAccount. If we know that that's not the case,
                    // then we do not link it. It will result in a new user being created, and then an email
                    // verification email being sent out to them. Once they verify it, we will try linking again,
                    // but this time, we know that the email is verified, so it will succeed.
                    if (userContext.isVerified) {
                        // This signal comes in from the signInUp function override - from the third party provider.
                        return {
                            shouldAutomaticallyLink: true,
                            shouldRequireVerification: true,
                        };
                    }
                    // if (newUserAccount.recipeUserId !== undefined) {
                    //     let isEmailVerified = await EmailVerification.isEmailVerified(newUserAccount.recipeUserId, undefined, userContext);
                    //     if (isEmailVerified) {
                    //         return {
                    //             shouldAutomaticallyLink: true,
                    //             shouldRequireVerification: true,
                    //         }
                    //     }
                    // }
                    return {
                        shouldAutomaticallyLink: false,
                    };
                }
                return {
                    shouldAutomaticallyLink: true,
                    shouldRequireVerification: true,
                };
            };
        }
        return async (i, l, o, u, a) => {
            // Handle specific user context cases
            if (evalStr.includes("()=>({shouldAutomaticallyLink:!0,shouldRequireVerification:!1})")) {
                return { shouldAutomaticallyLink: true, shouldRequireVerification: false };
            }
            if (
                evalStr.includes(
                    "(i,l,o,u,a)=>a.DO_LINK?{shouldAutomaticallyLink:!0,shouldRequireVerification:!0}:{shouldAutomaticallyLink:!1}"
                )
            ) {
                if (a.DO_LINK) {
                    return { shouldAutomaticallyLink: true, shouldRequireVerification: true };
                }
                return { shouldAutomaticallyLink: false };
            }
            if (
                evalStr.includes(
                    "(i,l,o,u,a)=>a.DO_NOT_LINK?{shouldAutomaticallyLink:!1}:{shouldAutomaticallyLink:!0,shouldRequireVerification:!1}"
                )
            ) {
                if (a.DO_NOT_LINK) {
                    return { shouldAutomaticallyLink: false };
                }
                return { shouldAutomaticallyLink: true, shouldRequireVerification: false };
            }

            if (
                evalStr.includes(
                    "(i,l,o,u,a)=>a.DO_NOT_LINK?{shouldAutomaticallyLink:!1}:a.DO_LINK_WITHOUT_VERIFICATION?{shouldAutomaticallyLink:!0,shouldRequireVerification:!1}:{shouldAutomaticallyLink:!0,shouldRequireVerification:!0}"
                )
            ) {
                if (a.DO_NOT_LINK) {
                    return { shouldAutomaticallyLink: false };
                }
                if (a.DO_LINK_WITHOUT_VERIFICATION) {
                    return { shouldAutomaticallyLink: true, shouldRequireVerification: false };
                }
                return { shouldAutomaticallyLink: true, shouldRequireVerification: true };
            }

            if (
                evalStr.includes(
                    '(i,l,o,a,e)=>e.DO_NOT_LINK||"test2@example.com"===i.email&&void 0===l?{shouldAutomaticallyLink:!1}:{shouldAutomaticallyLink:!0,shouldRequireVerification:!1}'
                )
            ) {
                if (a.DO_NOT_LINK) {
                    return { shouldAutomaticallyLink: false };
                }
                if (i.email === "test2@example.com" && l === undefined) {
                    return { shouldAutomaticallyLink: false };
                }
                return { shouldAutomaticallyLink: true, shouldRequireVerification: false };
            }

            if (
                evalStr.includes(
                    "(i,l,o,d,t)=>t.DO_NOT_LINK||void 0!==l&&l.id===o.getUserId()?{shouldAutomaticallyLink:!1}:{shouldAutomaticallyLink:!0,shouldRequireVerification:!1}"
                )
            ) {
                if (a.DO_NOT_LINK) {
                    return { shouldAutomaticallyLink: false };
                }
                if (l !== undefined && l.id === o.getUserId()) {
                    return { shouldAutomaticallyLink: false };
                }
                return { shouldAutomaticallyLink: true, shouldRequireVerification: false };
            }

            if (
                evalStr.includes(
                    "(i,l,o,d,t)=>t.DO_NOT_LINK||void 0!==l&&l.id===o.getUserId()?{shouldAutomaticallyLink:!1}:{shouldAutomaticallyLink:!0,shouldRequireVerification:!0}"
                )
            ) {
                if (a.DO_NOT_LINK) {
                    return { shouldAutomaticallyLink: false };
                }
                if (l !== undefined && l.id === o.getUserId()) {
                    return { shouldAutomaticallyLink: false };
                }
                return { shouldAutomaticallyLink: true, shouldRequireVerification: true };
            }

            if (
                evalStr.includes(
                    '(i,l,o,a,e)=>e.DO_NOT_LINK||"test2@example.com"===i.email&&void 0===l?{shouldAutomaticallyLink:!1}:{shouldAutomaticallyLink:!0,shouldRequireVerification:!0}'
                )
            ) {
                if (a.DO_NOT_LINK) {
                    return { shouldAutomaticallyLink: false };
                }
                if (i.email === "test2@example.com" && l === undefined) {
                    return { shouldAutomaticallyLink: false };
                }
                return { shouldAutomaticallyLink: true, shouldRequireVerification: true };
            }

            if (
                evalStr.includes(
                    'async(i,e)=>{if("emailpassword"===i.recipeId){if(!((await supertokens.listUsersByAccountInfo("public",{email:i.email})).length>1))return{shouldAutomaticallyLink:!1}}return{shouldAutomaticallyLink:!0,shouldRequireVerification:!0}}'
                )
            ) {
                if (i.recipeId === "emailpassword") {
                    if ((await supertokens.listUsersByAccountInfo("public", { email: i.email })).length <= 1) {
                        return { shouldAutomaticallyLink: false };
                    }
                }
                return { shouldAutomaticallyLink: true, shouldRequireVerification: true };
            }

            if (
                evalStr.includes("async()=>({shouldAutomaticallyLink:!0,shouldRequireVerification:!0})") ||
                evalStr.includes("()=>({shouldAutomaticallyLink:!0,shouldRequireVerification:!0})")
            ) {
                return { shouldAutomaticallyLink: true, shouldRequireVerification: true };
            }

            return { shouldAutomaticallyLink: false };
        };
    }

    if (evalStr.startsWith("emailpassword.init.emailDelivery.override")) {
        return (input) => ({
            ...input,
            sendEmail: async function (e) {
                sendEmailCallbackCalled = true;

                if (e.user) {
                    sendEmailToUserId = e.user.id;

                    if (e.user.email) {
                        sendEmailToUserEmail = e.user.email;
                    }

                    if (e.user.recipeUserId) {
                        sendEmailToRecipeUserId = e.user.recipeUserId;
                    }
                }

                if (e.passwordResetLink) {
                    token = e.passwordResetLink.split("?")[1].split("&")[0].split("=")[1];
                }
            },
        });
    }

    if (evalStr.startsWith("emailpassword.init.override.apis")) {
        return (s) => ({
            ...s,
            passwordResetPOST: async (e) => {
                let modifiedE = e;
                if (evalStr.includes("DO_NOT_LINK")) {
                    modifiedE = {
                        ...e,
                        userContext: {
                            ...e.userContext,
                            DO_NOT_LINK: true,
                        },
                    };
                }
                let t = await s.passwordResetPOST(modifiedE);
                if (t.status === "OK") {
                    emailPostPasswordReset = t.email;
                    userPostPasswordReset = t.user;
                }
                return t;
            },
            signUpPOST: async (e) => {
                if (evalStr.includes("signUpPOST")) {
                    let n = await e.options.req.getJSONBody();
                    if (n.userContext && n.userContext.DO_LINK !== undefined) {
                        e.userContext.DO_LINK = n.userContext.DO_LINK;
                    }
                    return s.signUpPOST(e);
                }
                return s.signUpPOST(e);
            },
        });
    }

    if (evalStr.startsWith("emailverification.init.emailDelivery.override")) {
        return (input) => ({
            ...input,
            sendEmail: async function (a) {
                if (a.user) {
                    userInCallback = a.user;
                }

                if (a.emailVerifyLink) {
                    token = a.emailVerifyLink.split("?token=")[1].split("&tenantId=")[0];
                }
            },
        });
    }

    if (evalStr.startsWith("emailverification.init.getEmailForRecipeUserId")) {
        return async (R) => {
            if (evalStr.includes("random@example.com")) {
                return { status: "OK", email: "random@example.com" };
            }

            if (R.getAsString && R.getAsString() === "random") {
                return { status: "OK", email: "test@example.com" };
            }

            return { status: "UNKNOWN_USER_ID_ERROR" };
        };
    }

    if (evalStr.startsWith("emailverification.init.override.functions")) {
        return (i) => ({
            ...i,
            isEmailVerified: (e) => {
                email = e.email;
                return i.isEmailVerified(e);
            },
        });
    }

    if (evalStr.startsWith("multifactorauth.init.override.apis")) {
        return (e) => ({
            ...e,
            resyncSessionAndFetchMFAInfoPUT: async (r) => {
                let t = await r.options.req.getJSONBody();
                if (t.userContext && t.userContext.requireFactor !== undefined) {
                    r.userContext.requireFactor = t.userContext.requireFactor;
                }
                return e.resyncSessionAndFetchMFAInfoPUT(r);
            },
        });
    }

    if (evalStr.startsWith("multifactorauth.init.override.functions")) {
        return (e) => {
            return {
                ...e,
                getMFARequirementsForAuth: (e) => {
                    return e.userContext.requireFactor ? ["otp-phone"] : [];
                },
            };
        };
    }

    if (evalStr.startsWith("passwordless.init.emailDelivery.service.sendEmail")) {
        return (e) => {
            const { userContext, ...rest } = e;

            if (store && store.emailInputs) {
                store.emailInputs.push(rest);
            } else {
                store = { ...store, emailInputs: [rest] };
            }

            sendEmailInputs.push(rest);
        };
    }

    if (evalStr.startsWith("passwordless.init.smsDelivery.service.sendSms")) {
        return (e) => {
            delete e.userContext;
            sendSmsInputs.push(e);
        };
    }

    if (evalStr.startsWith("passwordless.init.override.apis")) {
        return (e) => ({
            ...e,
            consumeCodePOST: async (t) => {
                let o = await t.options.req.getJSONBody();
                if (o.userContext && o.userContext.DO_LINK !== undefined) {
                    t.userContext.DO_LINK = o.userContext.DO_LINK;
                }
                return e.consumeCodePOST(t);
            },
        });
    }

    if (evalStr.startsWith("session.override.functions")) {
        return (e) => ({
            ...e,
            createNewSession: async (s) => {
                const { PrimitiveClaim } = require("../../../lib/build/recipe/session/claims");
                let c = new PrimitiveClaim({
                    key: "some-key",
                    fetchValue: async (e, s) => {
                        userIdInCallback = e;
                        recipeUserIdInCallback = s;
                    },
                });
                s.accessTokenPayload = { ...s.accessTokenPayload, ...c.build(s.userId, s.recipeUserId) };
                return e.createNewSession(s);
            },
        });
    }

    if (evalStr.startsWith("supertokens.init.supertokens.networkInterceptor")) {
        return (o, l) => {
            info.coreCallCount += 1;
            return o;
        };
    }

    if (evalStr.startsWith("thirdparty.init.override.functions")) {
        if (evalStr.includes("setIsVerifiedInSignInUp")) {
            return (originalImplementation) => ({
                ...originalImplementation,
                signInUpPOST: async function (input) {
                    input.userContext.isVerified = input.isVerified; // this information comes from the third party provider
                    return await originalImplementation.signInUp(input);
                },
            });
        }
    }

    if (evalStr.startsWith("thirdparty.init.override.apis")) {
        return (n) => ({
            ...n,
            signInUpPOST: async function (s) {
                let o = await s.options.req.getJSONBody();
                if (o.userContext && o.userContext.DO_LINK !== undefined) {
                    s.userContext.DO_LINK = o.userContext.DO_LINK;
                }
                let a = await n.signInUpPOST(s);
                if (a.status === "OK") {
                    userInCallback = a.user;
                }
                return a;
            },
        });
    }

    if (evalStr.startsWith("thirdparty.init.signInAndUpFeature.providers")) {
        if (evalStr.includes("custom-ev")) {
            return (e) => ({
                ...e,
                exchangeAuthCodeForOAuthTokens: ({ redirectURIInfo: e }) => e,
                getUserInfo: ({ oAuthTokens: e }) => ({
                    thirdPartyUserId: e.userId ?? "user",
                    email: { id: e.email ?? "email@test.com", isVerified: true },
                    rawUserInfoFromProvider: {},
                }),
            });
        }
        if (evalStr.includes("custom-no-ev")) {
            return (e) => ({
                ...e,
                exchangeAuthCodeForOAuthTokens: ({ redirectURIInfo: e }) => e,
                getUserInfo: ({ oAuthTokens: e }) => ({
                    thirdPartyUserId: e.userId ?? "user",
                    email: { id: e.email ?? "email@test.com", isVerified: false },
                    rawUserInfoFromProvider: {},
                }),
            });
        }
        if (evalStr.includes("custom2")) {
            return (e) => {
                e.exchangeAuthCodeForOAuthTokens = async (e) => e.redirectURIInfo.redirectURIQueryParams;
                e.getUserInfo = async (e) => ({
                    thirdPartyUserId: "custom2" + e.oAuthTokens.email,
                    email: { id: e.oAuthTokens.email, isVerified: true },
                });
                return e;
            };
        }
        if (evalStr.includes("custom3")) {
            return (e) => {
                e.exchangeAuthCodeForOAuthTokens = async (e) => e.redirectURIInfo.redirectURIQueryParams;
                e.getUserInfo = async (e) => ({
                    thirdPartyUserId: e.oAuthTokens.email,
                    email: { id: e.oAuthTokens.email, isVerified: true },
                });
                return e;
            };
        }
        if (evalStr.includes("custom")) {
            return (r) => ({
                ...r,
                exchangeAuthCodeForOAuthTokens: ({ redirectURIInfo: r }) => r,
                getUserInfo: ({ oAuthTokens: r }) => {
                    if (r.error) throw new Error("Credentials error");
                    return {
                        thirdPartyUserId: r.userId ?? "userId",
                        email: r.email && { id: r.email, isVerified: r.isVerified === true },
                        rawUserInfoFromProvider: {},
                    };
                },
            });
        }
    }

    throw new Error("Unknown eval string: " + evalStr);
}
