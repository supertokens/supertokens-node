"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
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
            /* Helper functions Begin */
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
                        reason: "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_006)",
                    });
                }
            };
            const assertThatEmailChangeIsAllowedAndUpdateEmailInfo = async (emailInfo, existingUser, provider, userInfo, userContext) => {
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
                    if (lM.hasSameThirdPartyInfoAs({
                        id: provider.id,
                        userId: userInfo.thirdPartyUserId,
                    })) {
                        recipeUserId = lM.recipeUserId;
                    }
                });
                if (!emailInfo.isVerified && recipe_2.default.getInstance() !== undefined) {
                    emailInfo.isVerified = await emailverification_1.default.isEmailVerified(recipeUserId, emailInfo.id, userContext);
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
                        reason: "Cannot sign in / up because new email cannot be applied to existing account. Please contact support. (ERR_CODE_005)",
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
                        reason: "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_004)",
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
                        // Session user is linked to another primary user, which means the session is revoked as well
                        // We cannot recurse here because when the session user if fetched again,
                        // it will be a primary user and we will end up trying factor setup with that user
                        // Also this session would have been revoked and we won't be able to catch it again
                        throw new error_1.default({
                            type: error_1.default.UNAUTHORISED,
                            message: "Session may be revoked",
                        });
                    }
                    else if (createPrimaryRes.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
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
            const assertThatFactorUserBeingCreatedCanBeLinkedWithSessionUser = async (tenantId, sessionUser, accountInfo, userContext) => {
                if (!sessionUser.isPrimaryUser) {
                    const canCreatePrimary = await recipe_1.default.getInstance().recipeInterfaceImpl.canCreatePrimaryUser({
                        recipeUserId: sessionUser.loginMethods[0].recipeUserId,
                        userContext,
                    });
                    if (canCreatePrimary.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                        // Session user is linked to another primary user, which means the session is revoked as well
                        throw new error_1.default({
                            type: error_1.default.UNAUTHORISED,
                            message: "Session may be revoked",
                        });
                    }
                    if (canCreatePrimary.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
                        throw new SignInUpError({
                            status: "SIGN_IN_UP_NOT_ALLOWED",
                            reason: "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_018)",
                        });
                    }
                }
                // Check if the linking with session user going to fail and avoid user creation here
                const users = await recipe_1.default.getInstance().recipeInterfaceImpl.listUsersByAccountInfo({
                    tenantId,
                    accountInfo,
                    doUnionOfAccountInfo: true,
                    userContext,
                });
                for (const user of users) {
                    if (user.isPrimaryUser && user.id !== sessionUser.id) {
                        throw new SignInUpError({
                            status: "SIGN_IN_UP_NOT_ALLOWED",
                            reason: "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_019)",
                        });
                    }
                }
            };
            const assertFactorUserHasMatchingVerifiedEmailInSessionUser = (sessionUser, accountInfo) => {
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
                    for (const lM of sessionUser.loginMethods) {
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
            /* Helper functions End */
            const { provider, tenantId, options, userContext } = input;
            let oAuthTokensToUse = {};
            if ("redirectURIInfo" in input && input.redirectURIInfo !== undefined) {
                oAuthTokensToUse = await provider.exchangeAuthCodeForOAuthTokens({
                    redirectURIInfo: input.redirectURIInfo,
                    userContext,
                });
            }
            else if ("oAuthTokens" in input && input.oAuthTokens !== undefined) {
                oAuthTokensToUse = input.oAuthTokens;
            }
            else {
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
            while (true) {
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
                        throw new Error("You have found a bug. Please report it on https://github.com/supertokens/supertokens-node/issues");
                    }
                    // Factor Login flow is described here -> https://github.com/supertokens/supertokens-core/issues/554#issuecomment-1857915021
                    //  - mfa disabled
                    //    - no session (normal operation)
                    //      - sign in
                    //        - recipe signIn
                    //        - check isSignInAllowed
                    //        - auto account linking
                    //        - create session
                    //        - return
                    //      - sign up
                    //        - check isSignUpAllowed
                    //        - recipe signUp (with auto account linking)
                    //        - create session
                    //        - return
                    //    - with session
                    //      - sign in
                    //        - recipe signIn
                    //        - if overwriteSessionDuringSignInUp === true
                    //          - check isSignInAllowed
                    //          - auto account linking
                    //          - create session
                    //        - return
                    //      - sign up
                    //        - check isSignUpAllowed
                    //        - if overwriteSessionDuringSignInUp === true
                    //          - recipe signUp (with auto account linking)
                    //          - create session
                    //        - else
                    //          - recipe signUp (without auto account linking)
                    //        - return
                    //  - mfa enabled
                    //    - no session (normal operation + check for valid first factor + mark factor as complete)
                    //      - sign in
                    //        - recipe signIn
                    //        - check isSignInAllowed
                    //        - check if valid first factor
                    //        - auto account linking
                    //        - create session
                    //        - mark factor as complete in session
                    //        - return
                    //      - sign up
                    //        - check isSignUpAllowed
                    //        - check if valid first factor
                    //        - recipe signUp (with auto account linking)
                    //        - create session
                    //        - mark factor as complete in session
                    //        - return
                    //    - with session
                    //      - sign in
                    //        - recipe signIn
                    //        - check isSignInAllowed
                    //        - check if factor user is linked to session user (support code if failed)
                    //        - mark factor as complete in session
                    //        - return
                    //      - sign up
                    //        - check for matching verified email in session user (support code if failed)
                    //        - check if allowed to setup (returns claim error if failed)
                    //        - check if factor user can be linked to session user (if failed, support code / unauthorized)
                    //        - recipe signUp (with auto account linking)
                    //        - link factor user to session user (if failed, recurse or unauthorized)
                    //        - create session
                    //        - mark factor as complete in session
                    //        - return
                    let { session } = input;
                    const mfaInstance = recipe_3.default.getInstance();
                    let isSignIn = existingUsers.length !== 0;
                    if (mfaInstance === undefined) {
                        if (session === undefined) {
                            if (isSignIn) {
                                // This branch - MFA is disabled / No active session / Sign in
                                let existingUser = existingUsers[0];
                                emailInfo = await assertThatEmailChangeIsAllowedAndUpdateEmailInfo(emailInfo, existingUser, provider, userInfo, userContext);
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
                                session = await session_1.default.createNewSession(options.req, options.res, tenantId, signInUpResponse.recipeUserId, {}, {}, userContext);
                                return {
                                    status: "OK",
                                    createdNewRecipeUser: signInUpResponse.createdNewRecipeUser,
                                    user: signInUpResponse.user,
                                    session,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                };
                            }
                            else {
                                // This branch - MFA is disabled / No active session / Sign up
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
                                session = await session_1.default.createNewSession(options.req, options.res, tenantId, signInUpResponse.recipeUserId, {}, {}, userContext);
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
                        else {
                            let overwriteSessionDuringSignInUp = recipe_4.default.getInstanceOrThrowError().config
                                .overwriteSessionDuringSignInUp;
                            if (isSignIn) {
                                // This branch - MFA is disabled / Active session / Sign in
                                let existingUser = existingUsers[0];
                                emailInfo = await assertThatEmailChangeIsAllowedAndUpdateEmailInfo(emailInfo, existingUser, provider, userInfo, userContext);
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
                                    signInUpResponse.user = await recipe_1.default.getInstance().createPrimaryUserIdOrLinkAccounts({
                                        tenantId,
                                        user: signInUpResponse.user,
                                        userContext,
                                    });
                                    session = await session_1.default.createNewSession(options.req, options.res, tenantId, signInUpResponse.recipeUserId, {}, {}, userContext);
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
                            else {
                                // This branch - MFA is disabled / Active session / Sign up
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
                                    session = await session_1.default.createNewSession(options.req, options.res, tenantId, signInUpResponse.recipeUserId, {}, {}, userContext);
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
                    }
                    else {
                        if (session === undefined) {
                            if (isSignIn) {
                                // This branch - MFA is enabled / No active session (first factor) / Sign in
                                let existingUser = existingUsers[0];
                                emailInfo = await assertThatEmailChangeIsAllowedAndUpdateEmailInfo(emailInfo, existingUser, provider, userInfo, userContext);
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
                                if (!(await utils_1.isValidFirstFactor(tenantId, "thirdparty", userContext))) {
                                    throw new error_1.default({
                                        type: error_1.default.UNAUTHORISED,
                                        message: "Session is required for secondary factors",
                                        payload: {
                                            clearTokens: false,
                                        },
                                    });
                                }
                                signInUpResponse.user = await recipe_1.default.getInstance().createPrimaryUserIdOrLinkAccounts({
                                    tenantId,
                                    user: signInUpResponse.user,
                                    userContext,
                                });
                                session = await session_1.default.createNewSession(options.req, options.res, tenantId, signInUpResponse.recipeUserId, {}, {}, userContext);
                                await multifactorauth_1.default.markFactorAsCompleteInSession(session, "thirdparty", userContext);
                                return {
                                    status: "OK",
                                    createdNewRecipeUser: signInUpResponse.createdNewRecipeUser,
                                    user: signInUpResponse.user,
                                    session,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                };
                            }
                            else {
                                // This branch - MFA is enabled / No active session (first factor) / Sign up
                                await assertThatSignUpIsAllowed(tenantId, emailInfo, provider, userInfo, userContext);
                                if (!(await utils_1.isValidFirstFactor(tenantId, "thirdparty", userContext))) {
                                    throw new error_1.default({
                                        type: error_1.default.UNAUTHORISED,
                                        message: "Session is required for secondary factors",
                                        payload: {
                                            clearTokens: false,
                                        },
                                    });
                                }
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
                                session = await session_1.default.createNewSession(options.req, options.res, tenantId, signInUpResponse.recipeUserId, {}, {}, userContext);
                                await multifactorauth_1.default.markFactorAsCompleteInSession(session, "thirdparty", userContext);
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
                        else {
                            let sessionUser = await __1.getUser(session.getUserId(), input.userContext);
                            if (sessionUser === undefined) {
                                throw new error_1.default({
                                    type: error_1.default.UNAUTHORISED,
                                    message: "Session user not found",
                                });
                            }
                            if (isSignIn) {
                                // This branch - MFA is enabled / Active session (secondary factor) / Sign in
                                let existingUser = existingUsers[0];
                                emailInfo = await assertThatEmailChangeIsAllowedAndUpdateEmailInfo(emailInfo, existingUser, provider, userInfo, userContext);
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
                                    throw new SignInUpError(signInUpResponse);
                                }
                                if (signInUpResponse.user.id !== sessionUser.id) {
                                    return {
                                        status: "SIGN_IN_UP_NOT_ALLOWED",
                                        reason: "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_016)",
                                    };
                                }
                                await multifactorauth_1.default.markFactorAsCompleteInSession(session, "thirdparty", userContext);
                                return {
                                    status: "OK",
                                    createdNewRecipeUser: signInUpResponse.createdNewRecipeUser,
                                    user: signInUpResponse.user,
                                    session,
                                    oAuthTokens: oAuthTokensToUse,
                                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                                };
                            }
                            else {
                                // This branch - MFA is enabled / Active session (secondary factor) / Sign up (factor setup)
                                if (emailInfo.isVerified === false) {
                                    assertFactorUserHasMatchingVerifiedEmailInSessionUser(sessionUser, {
                                        email: emailInfo.id,
                                    });
                                }
                                await multifactorauth_1.default.assertAllowedToSetupFactorElseThrowInvalidClaimError(session, "thirdparty", userContext);
                                await assertThatFactorUserBeingCreatedCanBeLinkedWithSessionUser(tenantId, sessionUser, { email: emailInfo.id }, userContext);
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
                                    throw new SignInUpError(signInUpResponse);
                                }
                                signInUpResponse.user = await linkAccountsForFactorSetup(sessionUser, signInUpResponse.recipeUserId, userContext);
                                await multifactorauth_1.default.markFactorAsCompleteInSession(session, "thirdparty", userContext);
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
                }
                catch (err) {
                    if (err instanceof SignInUpError) {
                        return err.response;
                    }
                    else if (err instanceof RecurseError) {
                        continue;
                    }
                    else {
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
