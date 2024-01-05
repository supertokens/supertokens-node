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
const emailverification_1 = __importDefault(require("../../emailverification"));
const recipe_2 = __importDefault(require("../../emailverification/recipe"));
const error_1 = __importDefault(require("../../session/error"));
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
            while (true) {
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
                let {
                    session,
                    mfaInstance,
                    shouldCheckIfSignInIsAllowed,
                    shouldCheckIfSignUpIsAllowed,
                    shouldAttemptAccountLinking,
                    shouldCreateSession,
                } = await utils_1.getFactorFlowControlFlags(input.options.req, input.options.res, input.userContext);
                if (existingUsers.length === 0) {
                    if (shouldCheckIfSignUpIsAllowed) {
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
                            return {
                                status: "SIGN_IN_UP_NOT_ALLOWED",
                                reason:
                                    "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_006)",
                            };
                        }
                    }
                } else {
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
                    if (existingUsers.length > 1) {
                        throw new Error(
                            "You have found a bug. Please report it on https://github.com/supertokens/supertokens-node/issues"
                        );
                    }
                    let recipeUserId = undefined;
                    if (existingUsers.length !== 0) {
                        existingUsers[0].loginMethods.forEach((lM) => {
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
                            user: existingUsers[0],
                            isVerified: emailInfo.isVerified,
                            newEmail: emailInfo.id,
                            userContext,
                        });
                        if (!isEmailChangeAllowed) {
                            return {
                                status: "SIGN_IN_UP_NOT_ALLOWED",
                                reason:
                                    "Cannot sign in / up because new email cannot be applied to existing account. Please contact support. (ERR_CODE_005)",
                            };
                        }
                    }
                }
                const isSignIn = existingUsers.length !== 0;
                let sessionUser;
                if (mfaInstance !== undefined && session !== undefined) {
                    sessionUser = await __1.getUser(session.getUserId(), input.userContext);
                    if (sessionUser === undefined) {
                        throw new error_1.default({
                            type: error_1.default.UNAUTHORISED,
                            message: "Session user not found",
                        });
                    }
                }
                // Reference for MFA Flows:
                // first factor | signIn / signUp
                //     -> check if valid first factor - handled via config and a util function
                //     -> mark factor as complete in session - recipe function
                // second factor
                //     signIn / complete factor
                //         if there is a factor user
                //             -> check factor user linked to session user - util `isFactorUserLinkedToSessionUser`
                //     signUp / setup factor
                //         -> check if factor setup is allowed - recipe function `isAllowedToSetupFactor`
                //         if there is a factor user
                //             -> check if factor user account info is verified - util - `checkFactorUserAccountInfoForVerification` (only if the email is unverified)
                //             -> check if factor user can be linked to session user - util - `checkIfFactorUserCanBeLinkedWithSessionUser`
                //             -> link accounts for factor setup - recipe function (if failed, retry API logic) - util - `linkAccountsForFactorSetup`
                //     -> mark factor as complete in session - recipe function
                if (mfaInstance !== undefined) {
                    if (session === undefined) {
                        // First factor flow
                        await mfaInstance.checkForValidFirstFactor(tenantId, "thirdparty", userContext);
                    } else {
                        // Secondary factor flow
                        if (isSignIn) {
                            // Sign in flow (Factor completion)
                            const res = await mfaInstance.checkIfFactorUserLinkedToSessionUser(
                                sessionUser,
                                existingUsers[0]
                            );
                            if (res.status !== "OK") {
                                return {
                                    status: "SIGN_IN_UP_NOT_ALLOWED",
                                    reason: res.reason,
                                };
                            }
                        } else {
                            // Sign up flow (Factor setup)
                            await mfaInstance.checkAllowedToSetupFactorElseThrowInvalidClaimError(
                                tenantId,
                                session,
                                sessionUser,
                                "thirdparty",
                                userContext
                            );
                            let accountInfo = { email: emailInfo.id };
                            if (!emailInfo.isVerified) {
                                const verifiedRes = mfaInstance.checkFactorUserAccountInfoForVerification(
                                    sessionUser,
                                    accountInfo
                                );
                                if (verifiedRes.status !== "OK") {
                                    return {
                                        status: "SIGN_IN_UP_NOT_ALLOWED",
                                        reason: verifiedRes.reason,
                                    };
                                }
                            }
                            const linkRes = await mfaInstance.checkIfFactorUserCanBeLinkedWithSessionUser(
                                tenantId,
                                sessionUser,
                                accountInfo,
                                userContext
                            );
                            if (linkRes.status === "RECURSE_FOR_RACE") {
                                continue;
                            } else if (linkRes.status === "VALIDATION_ERROR") {
                                return {
                                    status: "SIGN_IN_UP_NOT_ALLOWED",
                                    reason: linkRes.reason,
                                };
                            }
                        }
                    }
                }
                let response = await options.recipeImplementation.signInUp({
                    thirdPartyId: provider.id,
                    thirdPartyUserId: userInfo.thirdPartyUserId,
                    email: emailInfo.id,
                    isVerified: emailInfo.isVerified,
                    oAuthTokens: oAuthTokensToUse,
                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                    tenantId,
                    // we do not want to attempt accountlinking when there is an active session and MFA is turned on
                    shouldAttemptAccountLinkingIfAllowed: shouldAttemptAccountLinking,
                    userContext,
                });
                if (response.status === "SIGN_IN_UP_NOT_ALLOWED") {
                    return response;
                }
                let loginMethod = undefined;
                for (let i = 0; i < response.user.loginMethods.length; i++) {
                    if (
                        response.user.loginMethods[i].hasSameThirdPartyInfoAs({
                            id: provider.id,
                            userId: userInfo.thirdPartyUserId,
                        })
                    ) {
                        loginMethod = response.user.loginMethods[i];
                    }
                }
                if (loginMethod === undefined) {
                    throw new Error("Should never come here");
                }
                if (existingUsers.length > 0) {
                    // Here we do this check after sign in is done cause:
                    // - We first want to check if the credentials are correct first or not
                    // - The above recipe function marks the email as verified if other linked users
                    // with the same email are verified. The function below checks for the email verification
                    // so we want to call it only once this is up to date,
                    // - Even though the above call to signInUp is state changing (it changes the email
                    // of the user), it's OK to do this check here cause the isSignInAllowed checks
                    // conditions related to account linking and not related to email change. Email change
                    // condition checking happens before calling the recipe function anyway.
                    if (shouldCheckIfSignInIsAllowed) {
                        let isSignInAllowed = await recipe_1.default.getInstance().isSignInAllowed({
                            user: response.user,
                            tenantId,
                            userContext,
                        });
                        if (!isSignInAllowed) {
                            return {
                                status: "SIGN_IN_UP_NOT_ALLOWED",
                                reason:
                                    "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_004)",
                            };
                        }
                    }
                    if (shouldAttemptAccountLinking) {
                        // we do account linking only during sign in here cause during sign up,
                        // the recipe function above does account linking for us.
                        // we do not want to attempt accountlinking when there is an active session and MFA is turned on
                        if (session === undefined) {
                            response.user = await recipe_1.default.getInstance().createPrimaryUserIdOrLinkAccounts({
                                tenantId,
                                user: response.user,
                                userContext,
                            });
                        }
                    }
                }
                let isFirstFactor = session === undefined;
                if (shouldCreateSession) {
                    session = await session_1.default.createNewSession(
                        options.req,
                        options.res,
                        tenantId,
                        loginMethod.recipeUserId,
                        {},
                        {},
                        userContext
                    );
                }
                if (session === undefined) {
                    throw new Error("should never come here");
                }
                if (mfaInstance !== undefined) {
                    if (!isFirstFactor) {
                        const linkRes = await mfaInstance.linkAccountsForFactorSetup(
                            sessionUser,
                            response.recipeUserId,
                            userContext
                        );
                        if (linkRes.status !== "OK") {
                            continue; // retry from validation
                        }
                        let user = await __1.getUser(response.user.id, userContext);
                        if (user === undefined) {
                            throw new error_1.default({
                                type: error_1.default.UNAUTHORISED,
                                message: "Session user not found",
                            });
                        }
                        response.user = user;
                    }
                    await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                        session: session,
                        factorId: "thirdparty",
                        userContext,
                    });
                }
                return {
                    status: "OK",
                    createdNewRecipeUser: response.createdNewRecipeUser,
                    user: response.user,
                    session,
                    oAuthTokens: oAuthTokensToUse,
                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                };
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
