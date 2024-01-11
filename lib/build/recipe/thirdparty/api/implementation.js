"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const session_1 = __importDefault(require("../../session"));
const recipe_1 = __importDefault(require("../../accountlinking/recipe"));
const __1 = require("../../..");
const recipeUserId_1 = __importDefault(require("../../../recipeUserId"));
const emailverification_1 = __importDefault(require("../../emailverification"));
const recipe_2 = __importDefault(require("../../emailverification/recipe"));
const error_1 = __importDefault(require("../../session/error"));
const multifactorauth_1 = __importDefault(require("../../multifactorauth"));
const recipe_3 = __importDefault(require("../../multifactorauth/recipe"));
const recipe_4 = __importDefault(require("../../session/recipe"));
const utils_1 = require("../../multifactorauth/utils");
function getAPIInterface() {
    return {
        authorisationUrlGET: async function ({ provider, redirectURIOnProviderDashboard, userContext }) {
            const authUrl = await provider.getAuthorisationRedirectURL({
                redirectURIOnProviderDashboard,
                userContext,
            });
            return Object.assign({ status: "OK" }, authUrl);
        },
        signInUpPOST: async function (input) {
            const { provider, tenantId, options, userContext } = input;
            let oAuthTokensToUse = {};
            if ("redirectURIInfo" in input && input.redirectURIInfo !== undefined) {
                oAuthTokensToUse = await provider.exchangeAuthCodeForOAuthTokens({
                    redirectURIInfo: input.redirectURIInfo,
                    userContext,
                });
            } else if ("oAuthTokens" in input && input.oAuthTokens !== undefined) {
                oAuthTokensToUse = input.oAuthTokens;
            } else {
                throw Error("should never come here");
            }
            const userInfo = await provider.getUserInfo({ oAuthTokens: oAuthTokensToUse, userContext });
            if (userInfo.email === undefined && provider.config.requireEmail === false) {
                userInfo.email = {
                    id: await provider.config.generateFakeEmail({
                        thirdPartyUserId: userInfo.thirdPartyUserId,
                        tenantId,
                        userContext,
                    }),
                    isVerified: true,
                };
            }
            let emailInfo = userInfo.email;
            if (emailInfo === undefined) {
                return {
                    status: "NO_EMAIL_GIVEN_BY_PROVIDER",
                };
            }
            // API FLOW STARTS HERE
            while (true) {
                try {
                    let existingUsers = await __1.listUsersByAccountInfo(
                        tenantId,
                        {
                            thirdParty: {
                                id: provider.id,
                                userId: userInfo.thirdPartyUserId,
                            },
                        },
                        false,
                        userContext
                    );
                    // existingUsers is expected to be either 0 or 1 in length
                    if (existingUsers.length > 1) {
                        throw new Error(
                            "You have found a bug. Please report it on https://github.com/supertokens/supertokens-node/issues"
                        );
                    }
                    // Factor Login flow is described here -> https://github.com/supertokens/supertokens-core/issues/554#issuecomment-1857915021
                    // - no session -> normal operation
                    // - with session:
                    //   - mfa disabled ->
                    //     - if session overwrite is not allowed -> we don’t do auto account linking and no manual account linking (even if user has switched on automatic account linking)
                    //       - the 2nd account already exists -> no op (do not change the db)
                    //       - the 2nd account does not exist -> isSignUpAllowed -> create a recipe user
                    //     - if session overwrite is allowed -> we ignore the input session and just do normal operation as if there was no input session.
                    //   - mfa enabled -> we don’t do auto account linking (even if user has switched on automatic account linking)
                    //     - the 2nd account already exists:
                    //       - if user is already linked to first account -> modify session’s completed and next array
                    //       - if user is not already linked to first account -> Contact support case (cause we can’t do account linking here cause the other account may have some info already in it, and we do not call shouldDoAutomaticAccountLinking function)
                    //     - the 2nd account does not exist -> creating and linking (if linking is allowed, if not, we aren’t creating either + isAllowedToSetupFactor + (2nd factor is verification || login method with same email and its verified))
                    //       - If linking is not allowed, we return a support status code
                    //       - The code path should never use the session overwrite boolean in this case!
                    let session = await session_1.default.getSession(
                        options.req,
                        options.res,
                        {
                            sessionRequired: false,
                            overrideGlobalClaimValidators: () => [],
                        },
                        userContext
                    );
                    const mfaInstance = recipe_3.default.getInstance();
                    let isSignIn = existingUsers.length !== 0;
                    if (mfaInstance === undefined) {
                        if (session === undefined) {
                            if (isSignIn) {
                                // MFA is disabled
                                // No Active session
                                // Sign In
                                let existingUser = existingUsers[0];
                                emailInfo = await checkIfEmailChangeIsAllowedAndUpdateEmailInfo(
                                    emailInfo,
                                    existingUser,
                                    provider,
                                    userInfo,
                                    userContext
                                );
                                let signInUpResponse = await options.recipeImplementation.signInUp({
                                    thirdPartyId: provider.id,
                                    thirdPartyUserId: userInfo.thirdPartyUserId,
                                    email: emailInfo.id,
                                    isVerified: emailInfo.isVerified,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                    tenantId,
                                    // we do not want to attempt accountlinking when there is an active session and MFA is turned on
                                    shouldAttemptAccountLinkingIfAllowed: true,
                                    userContext,
                                });
                                if (signInUpResponse.status === "SIGN_IN_UP_NOT_ALLOWED") {
                                    return signInUpResponse;
                                }
                                await checkIfSignInIsAllowed(tenantId, signInUpResponse.user, userContext);
                                signInUpResponse.user = await recipe_1.default
                                    .getInstance()
                                    .createPrimaryUserIdOrLinkAccounts({
                                        tenantId,
                                        user: signInUpResponse.user,
                                        userContext,
                                    });
                                session = await session_1.default.createNewSession(
                                    options.req,
                                    options.res,
                                    tenantId,
                                    signInUpResponse.recipeUserId,
                                    {},
                                    {},
                                    userContext
                                );
                                return {
                                    status: "OK",
                                    createdNewRecipeUser: signInUpResponse.createdNewRecipeUser,
                                    user: signInUpResponse.user,
                                    session,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                };
                            } else {
                                // MFA is disabled
                                // No Active session
                                // Sign Up
                                await checkIfSignUpIsAllowed(tenantId, emailInfo, provider, userInfo, userContext);
                                let signInUpResponse = await options.recipeImplementation.signInUp({
                                    thirdPartyId: provider.id,
                                    thirdPartyUserId: userInfo.thirdPartyUserId,
                                    email: emailInfo.id,
                                    isVerified: emailInfo.isVerified,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                    tenantId,
                                    // we do not want to attempt accountlinking when there is an active session and MFA is turned on
                                    shouldAttemptAccountLinkingIfAllowed: true,
                                    userContext,
                                });
                                if (signInUpResponse.status === "SIGN_IN_UP_NOT_ALLOWED") {
                                    return signInUpResponse;
                                }
                                session = await session_1.default.createNewSession(
                                    options.req,
                                    options.res,
                                    tenantId,
                                    signInUpResponse.recipeUserId,
                                    {},
                                    {},
                                    userContext
                                );
                                return {
                                    status: "OK",
                                    createdNewRecipeUser: signInUpResponse.createdNewRecipeUser,
                                    user: signInUpResponse.user,
                                    session,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                };
                            }
                        } else {
                            // active session
                            let overwriteSessionDuringSignInUp = recipe_4.default.getInstanceOrThrowError().config
                                .overwriteSessionDuringSignInUp;
                            if (isSignIn) {
                                // MFA is disabled
                                // Active session
                                // Sign In
                                let existingUser = existingUsers[0];
                                emailInfo = await checkIfEmailChangeIsAllowedAndUpdateEmailInfo(
                                    emailInfo,
                                    existingUser,
                                    provider,
                                    userInfo,
                                    userContext
                                );
                                let signInUpResponse = await options.recipeImplementation.signInUp({
                                    thirdPartyId: provider.id,
                                    thirdPartyUserId: userInfo.thirdPartyUserId,
                                    email: emailInfo.id,
                                    isVerified: emailInfo.isVerified,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                    tenantId,
                                    shouldAttemptAccountLinkingIfAllowed: overwriteSessionDuringSignInUp,
                                    userContext,
                                });
                                if (signInUpResponse.status === "SIGN_IN_UP_NOT_ALLOWED") {
                                    return signInUpResponse;
                                }
                                if (overwriteSessionDuringSignInUp) {
                                    await checkIfSignInIsAllowed(tenantId, signInUpResponse.user, userContext);
                                    signInUpResponse.user = await recipe_1.default
                                        .getInstance()
                                        .createPrimaryUserIdOrLinkAccounts({
                                            tenantId,
                                            user: signInUpResponse.user,
                                            userContext,
                                        });
                                    session = await session_1.default.createNewSession(
                                        options.req,
                                        options.res,
                                        tenantId,
                                        signInUpResponse.recipeUserId,
                                        {},
                                        {},
                                        userContext
                                    );
                                }
                                return {
                                    status: "OK",
                                    createdNewRecipeUser: signInUpResponse.createdNewRecipeUser,
                                    user: signInUpResponse.user,
                                    session,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                };
                            } else {
                                // MFA is disabled
                                // Active session
                                // Sign Up
                                await checkIfSignUpIsAllowed(tenantId, emailInfo, provider, userInfo, userContext);
                                let signInUpResponse = await options.recipeImplementation.signInUp({
                                    thirdPartyId: provider.id,
                                    thirdPartyUserId: userInfo.thirdPartyUserId,
                                    email: emailInfo.id,
                                    isVerified: emailInfo.isVerified,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                    tenantId,
                                    shouldAttemptAccountLinkingIfAllowed: overwriteSessionDuringSignInUp,
                                    userContext,
                                });
                                if (signInUpResponse.status === "SIGN_IN_UP_NOT_ALLOWED") {
                                    return signInUpResponse;
                                }
                                if (overwriteSessionDuringSignInUp) {
                                    session = await session_1.default.createNewSession(
                                        options.req,
                                        options.res,
                                        tenantId,
                                        signInUpResponse.recipeUserId,
                                        {},
                                        {},
                                        userContext
                                    );
                                }
                                return {
                                    status: "OK",
                                    createdNewRecipeUser: signInUpResponse.createdNewRecipeUser,
                                    user: signInUpResponse.user,
                                    session,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                };
                            }
                        }
                    } else {
                        // MFA is active
                        if (session === undefined) {
                            // first factor
                            if (isSignIn) {
                                // MFA is enabled
                                // No Active session / first factor
                                // Sign In
                                let existingUser = existingUsers[0];
                                emailInfo = await checkIfEmailChangeIsAllowedAndUpdateEmailInfo(
                                    emailInfo,
                                    existingUser,
                                    provider,
                                    userInfo,
                                    userContext
                                );
                                let signInUpResponse = await options.recipeImplementation.signInUp({
                                    thirdPartyId: provider.id,
                                    thirdPartyUserId: userInfo.thirdPartyUserId,
                                    email: emailInfo.id,
                                    isVerified: emailInfo.isVerified,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                    tenantId,
                                    // we do not want to attempt accountlinking when there is an active session and MFA is turned on
                                    shouldAttemptAccountLinkingIfAllowed: true,
                                    userContext,
                                });
                                if (signInUpResponse.status === "SIGN_IN_UP_NOT_ALLOWED") {
                                    return signInUpResponse;
                                }
                                await checkIfSignInIsAllowed(tenantId, signInUpResponse.user, userContext);
                                await checkIfValidFirstFactor(tenantId, userContext);
                                signInUpResponse.user = await recipe_1.default
                                    .getInstance()
                                    .createPrimaryUserIdOrLinkAccounts({
                                        tenantId,
                                        user: signInUpResponse.user,
                                        userContext,
                                    });
                                session = await session_1.default.createNewSession(
                                    options.req,
                                    options.res,
                                    tenantId,
                                    signInUpResponse.recipeUserId,
                                    {},
                                    {},
                                    userContext
                                );
                                await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                                    session: session,
                                    factorId: "thirdparty",
                                    userContext,
                                });
                                return {
                                    status: "OK",
                                    createdNewRecipeUser: signInUpResponse.createdNewRecipeUser,
                                    user: signInUpResponse.user,
                                    session,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                };
                            } else {
                                // MFA is enabled
                                // No Active session / first factor
                                // Sign Up
                                await checkIfSignUpIsAllowed(tenantId, emailInfo, provider, userInfo, userContext);
                                await checkIfValidFirstFactor(tenantId, userContext);
                                let signInUpResponse = await options.recipeImplementation.signInUp({
                                    thirdPartyId: provider.id,
                                    thirdPartyUserId: userInfo.thirdPartyUserId,
                                    email: emailInfo.id,
                                    isVerified: emailInfo.isVerified,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                    tenantId,
                                    // we do not want to attempt accountlinking when there is an active session and MFA is turned on
                                    shouldAttemptAccountLinkingIfAllowed: true,
                                    userContext,
                                });
                                if (signInUpResponse.status === "SIGN_IN_UP_NOT_ALLOWED") {
                                    return signInUpResponse;
                                }
                                session = await session_1.default.createNewSession(
                                    options.req,
                                    options.res,
                                    tenantId,
                                    signInUpResponse.recipeUserId,
                                    {},
                                    {},
                                    userContext
                                );
                                await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                                    session: session,
                                    factorId: "thirdparty",
                                    userContext,
                                });
                                return {
                                    status: "OK",
                                    createdNewRecipeUser: signInUpResponse.createdNewRecipeUser,
                                    user: signInUpResponse.user,
                                    session,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                };
                            }
                        } else {
                            // secondary factors
                            let sessionUser = await __1.getUser(session.getUserId(), input.userContext);
                            if (sessionUser === undefined) {
                                throw new error_1.default({
                                    type: error_1.default.UNAUTHORISED,
                                    message: "Session user not found",
                                });
                            }
                            if (isSignIn) {
                                // MFA is enabled
                                // Active session / secondary factor
                                // Sign In / Factor completion
                                let existingUser = existingUsers[0];
                                emailInfo = await checkIfEmailChangeIsAllowedAndUpdateEmailInfo(
                                    emailInfo,
                                    existingUser,
                                    provider,
                                    userInfo,
                                    userContext
                                );
                                let signInUpResponse = await options.recipeImplementation.signInUp({
                                    thirdPartyId: provider.id,
                                    thirdPartyUserId: userInfo.thirdPartyUserId,
                                    email: emailInfo.id,
                                    isVerified: emailInfo.isVerified,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                    tenantId,
                                    // we do not want to attempt accountlinking when there is an active session and MFA is turned on
                                    shouldAttemptAccountLinkingIfAllowed: false,
                                    userContext,
                                });
                                if (signInUpResponse.status === "SIGN_IN_UP_NOT_ALLOWED") {
                                    return signInUpResponse;
                                }
                                if (signInUpResponse.user.id !== sessionUser.id) {
                                    return {
                                        status: "SIGN_IN_UP_NOT_ALLOWED",
                                        reason:
                                            "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_016)",
                                    };
                                }
                                await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                                    session: session,
                                    factorId: "thirdparty",
                                    userContext,
                                });
                                return {
                                    status: "OK",
                                    createdNewRecipeUser: signInUpResponse.createdNewRecipeUser,
                                    user: signInUpResponse.user,
                                    session,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                };
                            } else {
                                // MFA is enabled
                                // Active session / secondary factor
                                // Sign Up / Factor setup
                                if (emailInfo.isVerified === false) {
                                    checkFactorUserAccountInfoForVerification(sessionUser, { email: emailInfo.id });
                                }
                                await multifactorauth_1.default.assertAllowedToSetupFactorElseThrowInvalidClaimError(
                                    session,
                                    "thirdparty",
                                    userContext
                                );
                                await checkIfFactorUserBeingCreatedCanBeLinkedWithSessionUser(
                                    tenantId,
                                    sessionUser,
                                    { email: emailInfo.id },
                                    userContext
                                );
                                let signInUpResponse = await options.recipeImplementation.signInUp({
                                    thirdPartyId: provider.id,
                                    thirdPartyUserId: userInfo.thirdPartyUserId,
                                    email: emailInfo.id,
                                    isVerified: emailInfo.isVerified,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                    tenantId,
                                    shouldAttemptAccountLinkingIfAllowed: false,
                                    userContext,
                                });
                                if (signInUpResponse.status === "SIGN_IN_UP_NOT_ALLOWED") {
                                    return signInUpResponse;
                                }
                                signInUpResponse.user = await linkAccountsForFactorSetup(
                                    sessionUser,
                                    signInUpResponse.recipeUserId,
                                    userContext
                                );
                                await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                                    session: session,
                                    factorId: "thirdparty",
                                    userContext,
                                });
                                return {
                                    status: "OK",
                                    createdNewRecipeUser: signInUpResponse.createdNewRecipeUser,
                                    user: signInUpResponse.user,
                                    session,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                };
                            }
                        }
                    }
                } catch (err) {
                    if (err instanceof SignInUpError) {
                        return err.response;
                    } else if (err instanceof RecurseError) {
                        continue;
                    } else {
                        throw err;
                    }
                }
            }
        },
        appleRedirectHandlerPOST: async function ({ formPostInfoFromProvider, options }) {
            const stateInBase64 = formPostInfoFromProvider.state;
            const state = Buffer.from(stateInBase64, "base64").toString();
            const stateObj = JSON.parse(state);
            const redirectURI = stateObj.frontendRedirectURI;
            const urlObj = new URL(redirectURI);
            for (const [key, value] of Object.entries(formPostInfoFromProvider)) {
                urlObj.searchParams.set(key, `${value}`);
            }
            options.res.setHeader("Location", urlObj.toString(), false);
            options.res.setStatusCode(303);
            options.res.sendHTMLResponse("");
        },
    };
}
exports.default = getAPIInterface;
class SignInUpError extends Error {
    constructor(response) {
        super(response.status);
        this.response = response;
    }
}
class RecurseError extends Error {
    constructor() {
        super("RECURSE");
    }
}
// Helper functions
const checkIfSignUpIsAllowed = async (tenantId, emailInfo, provider, userInfo, userContext) => {
    let isSignUpAllowed = await recipe_1.default.getInstance().isSignUpAllowed({
        newUser: {
            recipeId: "thirdparty",
            email: emailInfo.id,
            thirdParty: {
                id: provider.id,
                userId: userInfo.thirdPartyUserId,
            },
        },
        isVerified: emailInfo.isVerified,
        tenantId,
        userContext,
    });
    if (!isSignUpAllowed) {
        // On the frontend, this should show a UI of asking the user
        // to login using a different method.
        throw new SignInUpError({
            status: "SIGN_IN_UP_NOT_ALLOWED",
            reason:
                "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_006)",
        });
    }
};
const checkIfEmailChangeIsAllowedAndUpdateEmailInfo = async (
    emailInfo,
    existingUser,
    provider,
    userInfo,
    userContext
) => {
    // this is a sign in. So before we proceed, we need to check if an email change
    // is allowed since the email could have changed from the social provider's side.
    // We do this check here and not in the recipe function cause we want to keep the
    // recipe function checks to a minimum so that the dev has complete control of
    // what they can do.
    // The isEmailChangeAllowed function takes in a isVerified boolean. Now, even though
    // we already have that from the input, that's just what the provider says. If the
    // provider says that the email is NOT verified, it could have been that the email
    // is verified on the user's account via supertokens on a previous sign in / up.
    // So we just check that as well before calling isEmailChangeAllowed
    let recipeUserId = undefined;
    existingUser.loginMethods.forEach((lM) => {
        if (
            lM.hasSameThirdPartyInfoAs({
                id: provider.id,
                userId: userInfo.thirdPartyUserId,
            })
        ) {
            recipeUserId = lM.recipeUserId;
        }
    });
    if (!emailInfo.isVerified && recipe_2.default.getInstance() !== undefined) {
        emailInfo.isVerified = await emailverification_1.default.isEmailVerified(
            recipeUserId,
            emailInfo.id,
            userContext
        );
    }
    /**
     * In this API, during only a sign in, we check for isEmailChangeAllowed first, then
     * change the email by calling the recipe function, then check if is sign in allowed.
     * This may result in a few states where email change is allowed, but still, sign in
     * is not allowed:
     *
     * Various outcomes of isSignInAllowed vs isEmailChangeAllowed
     * isSignInAllowed result:
     * - is primary user -> TRUE
     * - is recipe user
     *      - other recipe user exists
     *          - no -> TRUE
     *          - yes
     *              - email verified -> TRUE
     *              - email unverified -> FALSE
     *      - other primary user exists
     *          - no -> TRUE
     *          - yes
     *              - email verification status
     *                  - this && primary -> TRUE
     *                  - !this && !primary -> FALSE
     *                  - this && !primary -> FALSE
     *                  - !this && primary -> FALSE
     *
     * isEmailChangeAllowed result:
     * - is primary user -> TRUE
     * - is recipe user
     *      - other recipe user exists
     *          - no -> TRUE
     *          - yes
     *              - email verified -> TRUE
     *              - email unverified -> TRUE
     *      - other primary user exists
     *          - no -> TRUE
     *          - yes
     *              - email verification status
     *                  - this && primary -> TRUE
     *                  - !this && !primary -> FALSE
     *                  - this && !primary -> TRUE
     *                  - !this && primary -> FALSE
     *
     * Based on the above, isEmailChangeAllowed can return true, but isSignInAllowed will return false
     * in the following situations:
     * - If a recipe user is signing in with a new email, other recipe users with the same email exist,
     * and one of them is unverfied. In this case, the email change will happen in the social login
     * recipe, but the user will not be able to login anyway.
     *
     * - If the recipe user is signing in with a new email, there exists a primary user with the same
     * email, but this new email is verified for the recipe user already, but the primary user's email
     * is not verified.
     */
    let isEmailChangeAllowed = await recipe_1.default.getInstance().isEmailChangeAllowed({
        user: existingUser,
        isVerified: emailInfo.isVerified,
        newEmail: emailInfo.id,
        userContext,
    });
    if (!isEmailChangeAllowed) {
        throw new SignInUpError({
            status: "SIGN_IN_UP_NOT_ALLOWED",
            reason:
                "Cannot sign in / up because new email cannot be applied to existing account. Please contact support. (ERR_CODE_005)",
        });
    }
    return emailInfo;
};
const checkIfSignInIsAllowed = async (tenantId, user, userContext) => {
    let isSignInAllowed = await recipe_1.default.getInstance().isSignInAllowed({
        user,
        tenantId,
        userContext,
    });
    if (!isSignInAllowed) {
        throw new SignInUpError({
            status: "SIGN_IN_UP_NOT_ALLOWED",
            reason:
                "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_004)",
        });
    }
};
const checkIfValidFirstFactor = async (tenantId, userContext) => {
    let isValid = await utils_1.isValidFirstFactor(tenantId, "thirdparty", userContext);
    if (!isValid) {
        throw new error_1.default({
            type: error_1.default.UNAUTHORISED,
            message: "Session is required for secondary factors",
            payload: {
                clearTokens: false,
            },
        });
    }
};
const linkAccountsForFactorSetup = async (sessionUser, recipeUserId, userContext) => {
    if (!sessionUser.isPrimaryUser) {
        const createPrimaryRes = await recipe_1.default.getInstance().recipeInterfaceImpl.createPrimaryUser({
            recipeUserId: new recipeUserId_1.default(sessionUser.id),
            userContext,
        });
        if (createPrimaryRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
            throw new RecurseError();
        } else if (createPrimaryRes.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
            throw new RecurseError();
        }
    }
    const linkRes = await recipe_1.default.getInstance().recipeInterfaceImpl.linkAccounts({
        recipeUserId: recipeUserId,
        primaryUserId: sessionUser.id,
        userContext,
    });
    if (linkRes.status !== "OK") {
        throw new RecurseError();
    }
    if (linkRes.status !== "OK") {
        throw new RecurseError();
    }
    let user = await __1.getUser(recipeUserId.getAsString(), userContext);
    if (user === undefined) {
        // linked user not found
        throw new error_1.default({
            type: error_1.default.UNAUTHORISED,
            message: "User not found",
        });
    }
    return user;
};
const checkIfFactorUserBeingCreatedCanBeLinkedWithSessionUser = async (
    tenantId,
    sessionUser,
    accountInfo,
    userContext
) => {
    if (!sessionUser.isPrimaryUser) {
        const canCreatePrimary = await recipe_1.default.getInstance().recipeInterfaceImpl.canCreatePrimaryUser({
            recipeUserId: sessionUser.loginMethods[0].recipeUserId,
            userContext,
        });
        if (canCreatePrimary.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
            // Race condition since we just checked that it was not a primary user
            throw new RecurseError();
        }
        if (canCreatePrimary.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
            throw new SignInUpError({
                status: "SIGN_IN_UP_NOT_ALLOWED",
                reason: "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_018)",
            });
        }
    }
    // Check if the linking with session user going to fail and avoid user creation here
    const users = await __1.listUsersByAccountInfo(tenantId, accountInfo, true, userContext);
    for (const user of users) {
        if (user.isPrimaryUser && user.id !== sessionUser.id) {
            throw new SignInUpError({
                status: "SIGN_IN_UP_NOT_ALLOWED",
                reason: "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_019)",
            });
        }
    }
};
const checkFactorUserAccountInfoForVerification = (sessionUser, accountInfo) => {
    /*
        We discussed another method but did not go ahead with it, details below:

        We can allow the second factor to be linked to first factor even if the emails are different
        and not verified as long as there is no other user that exists (recipe or primary) that has the
        same email as that of the second factor. For example, if first factor is google login with e1
        and second factor is email password with e2, we allow linking them as long as there is no other
        user with email e2.

        We rejected this idea cause if auto account linking is switched off, then someone else can sign up
        with google using e2. This is OK as it would not link (since account linking is switched off).
        But, then if account linking is switched on, then the google sign in (and not sign up) with e2
        would actually cause it to be linked with the e1 account.
    */
    // we allow setup of unverified account info only if the session user has the same account info
    // and it is verified
    if (accountInfo.email !== undefined) {
        let foundVerifiedEmail = false;
        for (const lM of sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.loginMethods) {
            if (lM.hasSameEmailAs(accountInfo.email) && lM.verified) {
                foundVerifiedEmail = true;
                break;
            }
        }
        if (!foundVerifiedEmail) {
            throw new SignInUpError({
                status: "SIGN_IN_UP_NOT_ALLOWED",
                reason: "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_017)",
            });
        }
    }
};
// HELPER FUNCTIONS END
