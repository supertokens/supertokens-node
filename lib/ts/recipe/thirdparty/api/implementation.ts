import { APIInterface } from "../";
import Session from "../../session";
import AccountLinking from "../../accountlinking/recipe";

import { RecipeLevelUser } from "../../accountlinking/types";
import { User, getUser, listUsersByAccountInfo } from "../../..";
import RecipeUserId from "../../../recipeUserId";
import EmailVerification from "../../emailverification";
import EmailVerificationRecipe from "../../emailverification/recipe";
import SessionError from "../../session/error";
import { getFactorFlowControlFlags } from "../../multifactorauth/utils";

export default function getAPIInterface(): APIInterface {
    return {
        authorisationUrlGET: async function ({ provider, redirectURIOnProviderDashboard, userContext }) {
            const authUrl = await provider.getAuthorisationRedirectURL({
                redirectURIOnProviderDashboard,
                userContext,
            });
            return {
                status: "OK",
                ...authUrl,
            };
        },

        signInUpPOST: async function (input) {
            const { provider, tenantId, options, userContext } = input;
            let oAuthTokensToUse: any = {};

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
                    id: await provider.config.generateFakeEmail!({
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
            let existingUsers = await listUsersByAccountInfo(
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
            } = await getFactorFlowControlFlags(input.options.req, input.options.res, input.userContext);

            if (existingUsers.length === 0) {
                if (shouldCheckIfSignUpIsAllowed) {
                    let isSignUpAllowed = await AccountLinking.getInstance().isSignUpAllowed({
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

                let recipeUserId: RecipeUserId | undefined = undefined;
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

                    if (!emailInfo.isVerified && EmailVerificationRecipe.getInstance() !== undefined) {
                        emailInfo.isVerified = await EmailVerification.isEmailVerified(
                            recipeUserId!,
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

                    let isEmailChangeAllowed = await AccountLinking.getInstance().isEmailChangeAllowed({
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

            const isSignUp = existingUsers.length === 0;
            let isAlreadySetup = false;

            if (mfaInstance !== undefined) {
                if (!isSignUp) {
                    let sessionUser: User | undefined;
                    if (session !== undefined) {
                        if (existingUsers.length > 0 && existingUsers[0].id === session.getUserId()) {
                            sessionUser = existingUsers[0];
                        } else {
                            const user = await getUser(session.getUserId(), input.userContext);
                            if (user === undefined) {
                                throw new SessionError({
                                    type: SessionError.UNAUTHORISED,
                                    message: "Session user not found",
                                });
                            }
                            sessionUser = user;
                        }
                    }

                    isAlreadySetup =
                        sessionUser !== undefined &&
                        sessionUser.thirdParty.length > 0 &&
                        sessionUser.thirdParty.some(
                            (tp) => tp.id === provider.id && tp.userId === userInfo.thirdPartyUserId
                        );
                }

                const validateMfaRes = isSignUp
                    ? await mfaInstance.validateForMultifactorAuthBeforeFactorCompletion({
                          tenantId: input.tenantId,
                          factorIdInProgress: "thirdparty",
                          session,
                          isAlreadySetup,
                          signUpInfo: {
                              email: emailInfo.id,
                              isVerifiedFactor: emailInfo.isVerified,
                          },
                          userContext: input.userContext,
                      })
                    : await mfaInstance.validateForMultifactorAuthBeforeFactorCompletion({
                          tenantId: input.tenantId,
                          factorIdInProgress: "thirdparty",
                          session,
                          userSigningInForFactor: existingUsers[0],
                          userContext: input.userContext,
                      });

                if (validateMfaRes.status === "MFA_FLOW_ERROR") {
                    return {
                        status: "SIGN_IN_UP_NOT_ALLOWED",
                        reason: validateMfaRes.reason,
                    };
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

            let loginMethod: RecipeLevelUser | undefined = undefined;
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
                    let isSignInAllowed = await AccountLinking.getInstance().isSignInAllowed({
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
                        response.user = await AccountLinking.getInstance().createPrimaryUserIdOrLinkAccounts({
                            tenantId,
                            user: response.user,
                            userContext,
                        });
                    }
                }
            }

            let isFirstFactor = session === undefined;
            if (shouldCreateSession) {
                session = await Session.createNewSession(
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
                const sessionRes = await mfaInstance.updateSessionAndUserAfterFactorCompletion({
                    session,
                    isFirstFactor,
                    factorId: "thirdparty",
                    userInfoOfUserThatCompletedSignInOrUpToCompleteCurrentFactor: {
                        user: response.user,
                        createdNewUser: response.createdNewRecipeUser,
                        recipeUserId: loginMethod.recipeUserId,
                    },
                    userContext: input.userContext,
                });

                if (sessionRes.status === "MFA_FLOW_ERROR") {
                    return {
                        status: "SIGN_IN_UP_FAILED",
                        reason: sessionRes.reason,
                    };
                }

                let user = await getUser(response.user.id, input.userContext);

                if (user === undefined) {
                    throw new SessionError({
                        type: SessionError.UNAUTHORISED,
                        message: "Session user not found",
                    });
                }

                response.user = user;
            }

            return {
                status: "OK",
                createdNewRecipeUser: response.createdNewRecipeUser,
                user: response.user,
                session,
                oAuthTokens: oAuthTokensToUse,
                rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
            };
        },

        appleRedirectHandlerPOST: async function ({ formPostInfoFromProvider, options }): Promise<void> {
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
