"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const session_1 = __importDefault(require("../../session"));
const recipe_1 = __importDefault(require("../../accountlinking/recipe"));
const emailverification_1 = __importDefault(require("../../emailverification"));
const recipe_2 = __importDefault(require("../../emailverification/recipe"));
const error_1 = __importDefault(require("../../session/error"));
const recipe_3 = __importDefault(require("../../multifactorauth/recipe"));
const recipe_4 = __importDefault(require("../../session/recipe"));
const utils_1 = require("../../multifactorauth/utils");
const multifactorauth_1 = require("../../multifactorauth");
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
            /* Helper functions Begin */
            const assertThatSignUpIsAllowed = async (tenantId, emailInfo, provider, userInfo, userContext) => {
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
            const assertThatEmailChangeIsAllowedAndUpdateEmailInfo = async (
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
            const assertThatSignInIsAllowed = async (tenantId, user, userContext) => {
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
            /* Helper functions End */
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
            try {
                if (emailInfo === undefined) {
                    throw new SignInUpError({
                        status: "NO_EMAIL_GIVEN_BY_PROVIDER",
                    });
                }
                let existingUsers = await recipe_1.default.getInstance().recipeInterfaceImpl.listUsersByAccountInfo({
                    tenantId,
                    accountInfo: {
                        thirdParty: {
                            id: provider.id,
                            userId: userInfo.thirdPartyUserId,
                        },
                    },
                    doUnionOfAccountInfo: false,
                    userContext,
                });
                // existingUsers is expected to be either 0 or 1 in length
                if (existingUsers.length > 1) {
                    throw new Error(
                        "You have found a bug. Please report it on https://github.com/supertokens/supertokens-node/issues"
                    );
                }
                // Factor Login flow is described here -> https://github.com/supertokens/supertokens-core/issues/554#issuecomment-1857915021
                // Currently we do not support ThirdParty as a second factor. So we will be treating this as if this
                // is a first factor login always.
                // Additionally we do isValidFirstFactor check whenever MFA is enabled and a session is going to be created
                let { session } = input;
                const mfaInstance = recipe_3.default.getInstance();
                let isSignIn = existingUsers.length !== 0;
                if (session === undefined) {
                    if (isSignIn) {
                        // This branch - MFA is disabled / No active session / Sign in
                        if (mfaInstance !== undefined) {
                            // Everything is a normal operation here except we check for valid first factor if MFA is enabled
                            if (
                                !(await utils_1.isValidFirstFactor(
                                    input.tenantId,
                                    multifactorauth_1.FactorIds.THIRDPARTY,
                                    input.userContext
                                ))
                            ) {
                                throw new error_1.default({
                                    type: error_1.default.UNAUTHORISED,
                                    message: "Session is required for secondary factors",
                                    payload: {
                                        clearTokens: false,
                                    },
                                });
                            }
                        }
                        let existingUser = existingUsers[0];
                        emailInfo = await assertThatEmailChangeIsAllowedAndUpdateEmailInfo(
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
                            throw new SignInUpError(signInUpResponse);
                        }
                        await assertThatSignInIsAllowed(tenantId, signInUpResponse.user, userContext);
                        signInUpResponse.user = await recipe_1.default.getInstance().createPrimaryUserIdOrLinkAccounts({
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
                        // This branch - MFA is disabled / No active session / Sign up
                        if (mfaInstance !== undefined) {
                            // Everything is a normal operation here except we check for valid first factor if MFA is enabled
                            if (
                                !(await utils_1.isValidFirstFactor(
                                    input.tenantId,
                                    multifactorauth_1.FactorIds.THIRDPARTY,
                                    input.userContext
                                ))
                            ) {
                                throw new error_1.default({
                                    type: error_1.default.UNAUTHORISED,
                                    message: "Session is required for secondary factors",
                                    payload: {
                                        clearTokens: false,
                                    },
                                });
                            }
                        }
                        await assertThatSignUpIsAllowed(tenantId, emailInfo, provider, userInfo, userContext);
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
                            throw new SignInUpError(signInUpResponse);
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
                    let overwriteSessionDuringSignInUp = recipe_4.default.getInstanceOrThrowError().config
                        .overwriteSessionDuringSignInUp;
                    if (isSignIn) {
                        // This branch - MFA is disabled / Active session / Sign in
                        if (overwriteSessionDuringSignInUp && mfaInstance !== undefined) {
                            // Again, everything is a normal operation here except when MFA is enabled and
                            // overwriteSessionDuringSignInUp is set to true. In that case we check if thirdparty
                            // is a valid first factor
                            if (
                                !(await utils_1.isValidFirstFactor(
                                    input.tenantId,
                                    multifactorauth_1.FactorIds.THIRDPARTY,
                                    input.userContext
                                ))
                            ) {
                                throw new error_1.default({
                                    type: error_1.default.UNAUTHORISED,
                                    message: "Session is required for secondary factors",
                                    payload: {
                                        clearTokens: false,
                                    },
                                });
                            }
                        }
                        let existingUser = existingUsers[0];
                        emailInfo = await assertThatEmailChangeIsAllowedAndUpdateEmailInfo(
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
                            throw new SignInUpError(signInUpResponse);
                        }
                        if (overwriteSessionDuringSignInUp) {
                            await assertThatSignInIsAllowed(tenantId, signInUpResponse.user, userContext);
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
                        // This branch - MFA is disabled / Active session / Sign up
                        if (overwriteSessionDuringSignInUp && mfaInstance !== undefined) {
                            // Again, everything is a normal operation here except when MFA is enabled and
                            // overwriteSessionDuringSignInUp is set to true. In that case we check if thirdparty
                            // is a valid first factor
                            if (
                                !(await utils_1.isValidFirstFactor(
                                    input.tenantId,
                                    multifactorauth_1.FactorIds.THIRDPARTY,
                                    input.userContext
                                ))
                            ) {
                                throw new error_1.default({
                                    type: error_1.default.UNAUTHORISED,
                                    message: "Session is required for secondary factors",
                                    payload: {
                                        clearTokens: false,
                                    },
                                });
                            }
                        }
                        await assertThatSignUpIsAllowed(tenantId, emailInfo, provider, userInfo, userContext);
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
                            throw new SignInUpError(signInUpResponse);
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
            } catch (err) {
                if (err instanceof SignInUpError) {
                    return err.response;
                } else {
                    throw err;
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
