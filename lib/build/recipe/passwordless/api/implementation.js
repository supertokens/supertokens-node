"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../../../logger");
const recipe_1 = __importDefault(require("../../accountlinking/recipe"));
const session_1 = __importDefault(require("../../session"));
const __1 = require("../../..");
const utils_1 = require("../../multifactorauth/utils");
const error_1 = __importDefault(require("../../session/error"));
const multifactorauth_1 = __importDefault(require("../../multifactorauth"));
const recipe_2 = __importDefault(require("../../multifactorauth/recipe"));
const recipe_3 = __importDefault(require("../../session/recipe"));
function getAPIImplementation() {
    return {
        consumeCodePOST: async function (input) {
            /* Helper functions Begin */
            const assertThatSignUpIsAllowed = async (tenantId, email, phoneNumber, userContext) => {
                let isSignUpAllowed = await recipe_1.default.getInstance().isSignUpAllowed({
                    newUser: {
                        recipeId: "passwordless",
                        email,
                        phoneNumber,
                    },
                    isVerified: true,
                    tenantId: tenantId,
                    userContext,
                });
                if (!isSignUpAllowed) {
                    // On the frontend, this should show a UI of asking the user
                    // to login using a different method.
                    throw new SignInUpError({
                        status: "SIGN_IN_UP_NOT_ALLOWED",
                        reason:
                            "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_002)",
                    });
                }
            };
            const assertThatSignInIsAllowed = async (tenantId, user, userContext) => {
                let isSignInAllowed = await recipe_1.default.getInstance().isSignInAllowed({
                    tenantId,
                    user,
                    userContext,
                });
                if (!isSignInAllowed) {
                    throw new SignInUpError({
                        status: "SIGN_IN_UP_NOT_ALLOWED",
                        reason:
                            "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_003)",
                    });
                }
            };
            const linkAccountsForFactorSetup = async (sessionUser, recipeUserId, userContext) => {
                if (!sessionUser.isPrimaryUser) {
                    const createPrimaryRes = await recipe_1.default
                        .getInstance()
                        .recipeInterfaceImpl.createPrimaryUser({
                            recipeUserId: new __1.RecipeUserId(sessionUser.id),
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
                    } else if (
                        createPrimaryRes.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                    ) {
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
            const assertThatFactorUserBeingCreatedCanBeLinkedWithSessionUser = async (
                tenantId,
                sessionUser,
                accountInfo,
                userContext
            ) => {
                if (!sessionUser.isPrimaryUser) {
                    const canCreatePrimary = await recipe_1.default
                        .getInstance()
                        .recipeInterfaceImpl.canCreatePrimaryUser({
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
                    if (
                        canCreatePrimary.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                    ) {
                        throw new SignInUpError({
                            status: "SIGN_IN_UP_NOT_ALLOWED",
                            reason:
                                "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_014)",
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
                            reason:
                                "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_015)",
                        });
                    }
                }
            };
            /* Helper functions End */
            const deviceInfo = await input.options.recipeImplementation.listCodesByPreAuthSessionId({
                tenantId: input.tenantId,
                preAuthSessionId: input.preAuthSessionId,
                userContext: input.userContext,
            });
            while (true) {
                try {
                    if (!deviceInfo) {
                        throw new SignInUpError({
                            status: "RESTART_FLOW_ERROR",
                        });
                    }
                    const factorId = `${"userInputCode" in input ? "otp" : "link"}-${
                        deviceInfo.email ? "email" : "phone"
                    }`;
                    let existingUsers = await recipe_1.default
                        .getInstance()
                        .recipeInterfaceImpl.listUsersByAccountInfo({
                            tenantId: input.tenantId,
                            accountInfo: {
                                phoneNumber: deviceInfo.phoneNumber,
                                email: deviceInfo.email,
                            },
                            doUnionOfAccountInfo: false,
                            userContext: input.userContext,
                        });
                    existingUsers = existingUsers.filter((u) =>
                        u.loginMethods.some(
                            (m) =>
                                m.recipeId === "passwordless" &&
                                (m.hasSameEmailAs(deviceInfo.email) || m.hasSamePhoneNumberAs(m.phoneNumber))
                        )
                    );
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
                    //        - check for matching verified email/phone number in session user (support code if failed) - not necessary for passwordless as it's already a verified factor
                    //        - check if allowed to setup (returns claim error if failed)
                    //        - check if factor user can be linked to session user (if failed, support code / unauthorized)
                    //        - recipe signUp (with auto account linking)
                    //        - link factor user to session user (if failed, recurse or unauthorized)
                    //        - create session
                    //        - mark factor as complete in session
                    //        - return
                    let { session } = input;
                    const mfaInstance = recipe_2.default.getInstance();
                    let isSignIn = existingUsers.length !== 0;
                    if (mfaInstance === undefined) {
                        if (session === undefined) {
                            if (isSignIn) {
                                // This branch - MFA is disabled / No active session / Sign in
                                let consumeCodeResponse = await input.options.recipeImplementation.consumeCode(
                                    "deviceId" in input
                                        ? {
                                              preAuthSessionId: input.preAuthSessionId,
                                              deviceId: input.deviceId,
                                              userInputCode: input.userInputCode,
                                              tenantId: input.tenantId,
                                              shouldAttemptAccountLinkingIfAllowed: true,
                                              userContext: input.userContext,
                                          }
                                        : {
                                              preAuthSessionId: input.preAuthSessionId,
                                              linkCode: input.linkCode,
                                              tenantId: input.tenantId,
                                              shouldAttemptAccountLinkingIfAllowed: true,
                                              userContext: input.userContext,
                                          }
                                );
                                if (consumeCodeResponse.status !== "OK") {
                                    throw new SignInUpError(consumeCodeResponse);
                                }
                                await assertThatSignInIsAllowed(
                                    input.tenantId,
                                    consumeCodeResponse.user,
                                    input.userContext
                                );
                                consumeCodeResponse.user = await recipe_1.default
                                    .getInstance()
                                    .createPrimaryUserIdOrLinkAccounts({
                                        tenantId: input.tenantId,
                                        user: consumeCodeResponse.user,
                                        userContext: input.userContext,
                                    });
                                session = await session_1.default.createNewSession(
                                    input.options.req,
                                    input.options.res,
                                    input.tenantId,
                                    consumeCodeResponse.recipeUserId,
                                    {},
                                    {},
                                    input.userContext
                                );
                                return {
                                    status: "OK",
                                    session,
                                    createdNewRecipeUser: consumeCodeResponse.createdNewRecipeUser,
                                    user: consumeCodeResponse.user,
                                };
                            } else {
                                // This branch - MFA is disabled / No active session / Sign up
                                await assertThatSignUpIsAllowed(
                                    input.tenantId,
                                    deviceInfo.email,
                                    deviceInfo.phoneNumber,
                                    input.userContext
                                );
                                let consumeCodeResponse = await input.options.recipeImplementation.consumeCode(
                                    "deviceId" in input
                                        ? {
                                              preAuthSessionId: input.preAuthSessionId,
                                              deviceId: input.deviceId,
                                              userInputCode: input.userInputCode,
                                              tenantId: input.tenantId,
                                              shouldAttemptAccountLinkingIfAllowed: true,
                                              userContext: input.userContext,
                                          }
                                        : {
                                              preAuthSessionId: input.preAuthSessionId,
                                              linkCode: input.linkCode,
                                              tenantId: input.tenantId,
                                              shouldAttemptAccountLinkingIfAllowed: true,
                                              userContext: input.userContext,
                                          }
                                );
                                if (consumeCodeResponse.status !== "OK") {
                                    throw new SignInUpError(consumeCodeResponse);
                                }
                                session = await session_1.default.createNewSession(
                                    input.options.req,
                                    input.options.res,
                                    input.tenantId,
                                    consumeCodeResponse.recipeUserId,
                                    {},
                                    {},
                                    input.userContext
                                );
                                return {
                                    status: "OK",
                                    session,
                                    createdNewRecipeUser: consumeCodeResponse.createdNewRecipeUser,
                                    user: consumeCodeResponse.user,
                                };
                            }
                        } else {
                            let overwriteSessionDuringSignInUp = recipe_3.default.getInstanceOrThrowError().config
                                .overwriteSessionDuringSignInUp;
                            if (isSignIn) {
                                // This branch - MFA is disabled / Active session / Sign in
                                let consumeCodeResponse = await input.options.recipeImplementation.consumeCode(
                                    "deviceId" in input
                                        ? {
                                              preAuthSessionId: input.preAuthSessionId,
                                              deviceId: input.deviceId,
                                              userInputCode: input.userInputCode,
                                              tenantId: input.tenantId,
                                              shouldAttemptAccountLinkingIfAllowed: overwriteSessionDuringSignInUp,
                                              userContext: input.userContext,
                                          }
                                        : {
                                              preAuthSessionId: input.preAuthSessionId,
                                              linkCode: input.linkCode,
                                              tenantId: input.tenantId,
                                              shouldAttemptAccountLinkingIfAllowed: overwriteSessionDuringSignInUp,
                                              userContext: input.userContext,
                                          }
                                );
                                if (consumeCodeResponse.status !== "OK") {
                                    throw new SignInUpError(consumeCodeResponse);
                                }
                                if (overwriteSessionDuringSignInUp) {
                                    await assertThatSignInIsAllowed(
                                        input.tenantId,
                                        consumeCodeResponse.user,
                                        input.userContext
                                    );
                                    consumeCodeResponse.user = await recipe_1.default
                                        .getInstance()
                                        .createPrimaryUserIdOrLinkAccounts({
                                            tenantId: input.tenantId,
                                            user: consumeCodeResponse.user,
                                            userContext: input.userContext,
                                        });
                                    session = await session_1.default.createNewSession(
                                        input.options.req,
                                        input.options.res,
                                        input.tenantId,
                                        consumeCodeResponse.recipeUserId,
                                        {},
                                        {},
                                        input.userContext
                                    );
                                }
                                return {
                                    status: "OK",
                                    session,
                                    createdNewRecipeUser: consumeCodeResponse.createdNewRecipeUser,
                                    user: consumeCodeResponse.user,
                                };
                            } else {
                                // This branch - MFA is disabled / Active session / Sign up
                                await assertThatSignUpIsAllowed(
                                    input.tenantId,
                                    deviceInfo.email,
                                    deviceInfo.phoneNumber,
                                    input.userContext
                                );
                                let consumeCodeResponse = await input.options.recipeImplementation.consumeCode(
                                    "deviceId" in input
                                        ? {
                                              preAuthSessionId: input.preAuthSessionId,
                                              deviceId: input.deviceId,
                                              userInputCode: input.userInputCode,
                                              tenantId: input.tenantId,
                                              shouldAttemptAccountLinkingIfAllowed: overwriteSessionDuringSignInUp,
                                              userContext: input.userContext,
                                          }
                                        : {
                                              preAuthSessionId: input.preAuthSessionId,
                                              linkCode: input.linkCode,
                                              tenantId: input.tenantId,
                                              shouldAttemptAccountLinkingIfAllowed: overwriteSessionDuringSignInUp,
                                              userContext: input.userContext,
                                          }
                                );
                                if (consumeCodeResponse.status !== "OK") {
                                    throw new SignInUpError(consumeCodeResponse);
                                }
                                if (overwriteSessionDuringSignInUp) {
                                    session = await session_1.default.createNewSession(
                                        input.options.req,
                                        input.options.res,
                                        input.tenantId,
                                        consumeCodeResponse.recipeUserId,
                                        {},
                                        {},
                                        input.userContext
                                    );
                                }
                                return {
                                    status: "OK",
                                    session,
                                    createdNewRecipeUser: consumeCodeResponse.createdNewRecipeUser,
                                    user: consumeCodeResponse.user,
                                };
                            }
                        }
                    } else {
                        if (session === undefined) {
                            if (isSignIn) {
                                // This branch - MFA is enabled / No active session (first factor) / Sign in
                                if (!(await utils_1.isValidFirstFactor(input.tenantId, factorId, input.userContext))) {
                                    throw new error_1.default({
                                        type: error_1.default.UNAUTHORISED,
                                        message: "Session is required for secondary factors",
                                        payload: {
                                            clearTokens: false,
                                        },
                                    });
                                }
                                let consumeCodeResponse = await input.options.recipeImplementation.consumeCode(
                                    "deviceId" in input
                                        ? {
                                              preAuthSessionId: input.preAuthSessionId,
                                              deviceId: input.deviceId,
                                              userInputCode: input.userInputCode,
                                              tenantId: input.tenantId,
                                              shouldAttemptAccountLinkingIfAllowed: true,
                                              userContext: input.userContext,
                                          }
                                        : {
                                              preAuthSessionId: input.preAuthSessionId,
                                              linkCode: input.linkCode,
                                              tenantId: input.tenantId,
                                              shouldAttemptAccountLinkingIfAllowed: true,
                                              userContext: input.userContext,
                                          }
                                );
                                if (consumeCodeResponse.status !== "OK") {
                                    throw new SignInUpError(consumeCodeResponse);
                                }
                                await assertThatSignInIsAllowed(
                                    input.tenantId,
                                    consumeCodeResponse.user,
                                    input.userContext
                                );
                                consumeCodeResponse.user = await recipe_1.default
                                    .getInstance()
                                    .createPrimaryUserIdOrLinkAccounts({
                                        tenantId: input.tenantId,
                                        user: consumeCodeResponse.user,
                                        userContext: input.userContext,
                                    });
                                session = await session_1.default.createNewSession(
                                    input.options.req,
                                    input.options.res,
                                    input.tenantId,
                                    consumeCodeResponse.recipeUserId,
                                    {},
                                    {},
                                    input.userContext
                                );
                                await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                                    session,
                                    factorId,
                                    userContext: input.userContext,
                                });
                                return {
                                    status: "OK",
                                    session,
                                    createdNewRecipeUser: consumeCodeResponse.createdNewRecipeUser,
                                    user: consumeCodeResponse.user,
                                };
                            } else {
                                // This branch - MFA is enabled / No active session (first factor) / Sign up
                                if (!(await utils_1.isValidFirstFactor(input.tenantId, factorId, input.userContext))) {
                                    throw new error_1.default({
                                        type: error_1.default.UNAUTHORISED,
                                        message: "Session is required for secondary factors",
                                        payload: {
                                            clearTokens: false,
                                        },
                                    });
                                }
                                await assertThatSignUpIsAllowed(
                                    input.tenantId,
                                    deviceInfo.email,
                                    deviceInfo.phoneNumber,
                                    input.userContext
                                );
                                let consumeCodeResponse = await input.options.recipeImplementation.consumeCode(
                                    "deviceId" in input
                                        ? {
                                              preAuthSessionId: input.preAuthSessionId,
                                              deviceId: input.deviceId,
                                              userInputCode: input.userInputCode,
                                              tenantId: input.tenantId,
                                              shouldAttemptAccountLinkingIfAllowed: true,
                                              userContext: input.userContext,
                                          }
                                        : {
                                              preAuthSessionId: input.preAuthSessionId,
                                              linkCode: input.linkCode,
                                              tenantId: input.tenantId,
                                              shouldAttemptAccountLinkingIfAllowed: true,
                                              userContext: input.userContext,
                                          }
                                );
                                if (consumeCodeResponse.status !== "OK") {
                                    throw new SignInUpError(consumeCodeResponse);
                                }
                                session = await session_1.default.createNewSession(
                                    input.options.req,
                                    input.options.res,
                                    input.tenantId,
                                    consumeCodeResponse.recipeUserId,
                                    {},
                                    {},
                                    input.userContext
                                );
                                await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                                    session,
                                    factorId,
                                    userContext: input.userContext,
                                });
                                return {
                                    status: "OK",
                                    session,
                                    createdNewRecipeUser: consumeCodeResponse.createdNewRecipeUser,
                                    user: consumeCodeResponse.user,
                                };
                            }
                        } else {
                            let sessionUser = await __1.getUser(session.getUserId(), input.userContext);
                            if (sessionUser === undefined) {
                                throw new error_1.default({
                                    type: error_1.default.UNAUTHORISED,
                                    message: "Session user not found",
                                });
                            }
                            if (isSignIn) {
                                // This branch - MFA is enabled / Active session (secondary factor) / Sign in
                                let consumeCodeResponse = await input.options.recipeImplementation.consumeCode(
                                    "deviceId" in input
                                        ? {
                                              preAuthSessionId: input.preAuthSessionId,
                                              deviceId: input.deviceId,
                                              userInputCode: input.userInputCode,
                                              tenantId: input.tenantId,
                                              shouldAttemptAccountLinkingIfAllowed: false,
                                              userContext: input.userContext,
                                          }
                                        : {
                                              preAuthSessionId: input.preAuthSessionId,
                                              linkCode: input.linkCode,
                                              tenantId: input.tenantId,
                                              shouldAttemptAccountLinkingIfAllowed: false,
                                              userContext: input.userContext,
                                          }
                                );
                                if (consumeCodeResponse.status !== "OK") {
                                    throw new SignInUpError(consumeCodeResponse);
                                }
                                if (consumeCodeResponse.user.id !== sessionUser.id) {
                                    throw new SignInUpError({
                                        status: "SIGN_IN_UP_NOT_ALLOWED",
                                        reason:
                                            "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_013)",
                                    });
                                }
                                await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                                    session,
                                    factorId,
                                    userContext: input.userContext,
                                });
                                return {
                                    status: "OK",
                                    session,
                                    createdNewRecipeUser: consumeCodeResponse.createdNewRecipeUser,
                                    user: consumeCodeResponse.user,
                                };
                            } else {
                                // This branch - MFA is enabled / Active session (secondary factor) / Sign up (factor setup)
                                await multifactorauth_1.default.assertAllowedToSetupFactorElseThrowInvalidClaimError(
                                    session,
                                    factorId,
                                    input.userContext
                                );
                                await assertThatFactorUserBeingCreatedCanBeLinkedWithSessionUser(
                                    input.tenantId,
                                    sessionUser,
                                    { email: deviceInfo.email, phoneNumber: deviceInfo.phoneNumber },
                                    input.userContext
                                );
                                let consumeCodeResponse = await input.options.recipeImplementation.consumeCode(
                                    "deviceId" in input
                                        ? {
                                              preAuthSessionId: input.preAuthSessionId,
                                              deviceId: input.deviceId,
                                              userInputCode: input.userInputCode,
                                              tenantId: input.tenantId,
                                              shouldAttemptAccountLinkingIfAllowed: false,
                                              userContext: input.userContext,
                                          }
                                        : {
                                              preAuthSessionId: input.preAuthSessionId,
                                              linkCode: input.linkCode,
                                              tenantId: input.tenantId,
                                              shouldAttemptAccountLinkingIfAllowed: false,
                                              userContext: input.userContext,
                                          }
                                );
                                if (consumeCodeResponse.status !== "OK") {
                                    throw new SignInUpError(consumeCodeResponse);
                                }
                                consumeCodeResponse.user = await linkAccountsForFactorSetup(
                                    sessionUser,
                                    consumeCodeResponse.recipeUserId,
                                    input.userContext
                                );
                                await mfaInstance.recipeInterfaceImpl.markFactorAsCompleteInSession({
                                    session,
                                    factorId,
                                    userContext: input.userContext,
                                });
                                return {
                                    status: "OK",
                                    session,
                                    createdNewRecipeUser: consumeCodeResponse.createdNewRecipeUser,
                                    user: consumeCodeResponse.user,
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
        createCodePOST: async function (input) {
            const accountInfo = {};
            if ("email" in input) {
                accountInfo.email = input.email;
            }
            if ("phoneNumber" in input) {
                accountInfo.phoneNumber = input.phoneNumber;
            }
            let existingUsers = await recipe_1.default.getInstance().recipeInterfaceImpl.listUsersByAccountInfo({
                tenantId: input.tenantId,
                accountInfo,
                doUnionOfAccountInfo: false,
                userContext: input.userContext,
            });
            existingUsers = existingUsers.filter((u) =>
                u.loginMethods.some(
                    (m) =>
                        m.recipeId === "passwordless" &&
                        (m.hasSameEmailAs(accountInfo.email) || m.hasSamePhoneNumberAs(accountInfo.phoneNumber))
                )
            );
            let session = await session_1.default.getSession(
                input.options.req,
                input.options.res,
                {
                    sessionRequired: false,
                    overrideGlobalClaimValidators: () => [],
                },
                input.userContext
            );
            const mfaInstance = recipe_2.default.getInstance();
            if (existingUsers.length === 0) {
                if (session === undefined || mfaInstance === undefined) {
                    // We don't need to check if sign up is allowed if MFA is enabled and there is an active session
                    let isSignUpAllowed = await recipe_1.default.getInstance().isSignUpAllowed({
                        newUser: Object.assign({ recipeId: "passwordless" }, accountInfo),
                        isVerified: true,
                        tenantId: input.tenantId,
                        userContext: input.userContext,
                    });
                    if (!isSignUpAllowed) {
                        // On the frontend, this should show a UI of asking the user
                        // to login using a different method.
                        return {
                            status: "SIGN_IN_UP_NOT_ALLOWED",
                            reason:
                                "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_002)",
                        };
                    }
                }
            } else if (existingUsers.length === 1) {
                let loginMethod = existingUsers[0].loginMethods.find(
                    (m) =>
                        m.recipeId === "passwordless" &&
                        (m.hasSameEmailAs(accountInfo.email) || m.hasSamePhoneNumberAs(accountInfo.phoneNumber))
                );
                if (loginMethod === undefined) {
                    throw new Error("Should never come here");
                }
                let isSignInAllowed = await recipe_1.default.getInstance().isSignInAllowed({
                    user: existingUsers[0],
                    tenantId: input.tenantId,
                    userContext: input.userContext,
                });
                if (!isSignInAllowed) {
                    return {
                        status: "SIGN_IN_UP_NOT_ALLOWED",
                        reason:
                            "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_003)",
                    };
                }
            } else {
                throw new Error(
                    "You have found a bug. Please report it on https://github.com/supertokens/supertokens-node/issues"
                );
            }
            // if (mfaInstance !== undefined && session !== undefined && existingUsers.length === 0) {
            // Ideally we want to check if the user is allowed to setup a factor, but
            // we can't distinguish between otp- or link- factors at this point. So we simply allow
            // and then check during consume code
            // }
            let response = await input.options.recipeImplementation.createCode(
                "email" in input
                    ? {
                          userContext: input.userContext,
                          email: input.email,
                          userInputCode:
                              input.options.config.getCustomUserInputCode === undefined
                                  ? undefined
                                  : await input.options.config.getCustomUserInputCode(
                                        input.tenantId,
                                        input.userContext
                                    ),
                          tenantId: input.tenantId,
                      }
                    : {
                          userContext: input.userContext,
                          phoneNumber: input.phoneNumber,
                          userInputCode:
                              input.options.config.getCustomUserInputCode === undefined
                                  ? undefined
                                  : await input.options.config.getCustomUserInputCode(
                                        input.tenantId,
                                        input.userContext
                                    ),
                          tenantId: input.tenantId,
                      }
            );
            // now we send the email / text message.
            let magicLink = undefined;
            let userInputCode = undefined;
            const flowType = input.options.config.flowType;
            if (flowType === "MAGIC_LINK" || flowType === "USER_INPUT_CODE_AND_MAGIC_LINK") {
                magicLink =
                    input.options.appInfo
                        .getOrigin({
                            request: input.options.req,
                            userContext: input.userContext,
                        })
                        .getAsStringDangerous() +
                    input.options.appInfo.websiteBasePath.getAsStringDangerous() +
                    "/verify" +
                    "?rid=" +
                    input.options.recipeId +
                    "&preAuthSessionId=" +
                    response.preAuthSessionId +
                    "&tenantId=" +
                    input.tenantId +
                    "#" +
                    response.linkCode;
            }
            if (flowType === "USER_INPUT_CODE" || flowType === "USER_INPUT_CODE_AND_MAGIC_LINK") {
                userInputCode = response.userInputCode;
            }
            // we don't do something special for serverless env here
            // cause we want to wait for service's reply since it can show
            // a UI error message for if sending an SMS / email failed or not.
            if (
                input.options.config.contactMethod === "PHONE" ||
                (input.options.config.contactMethod === "EMAIL_OR_PHONE" && "phoneNumber" in input)
            ) {
                logger_1.logDebugMessage(`Sending passwordless login SMS to ${input.phoneNumber}`);
                await input.options.smsDelivery.ingredientInterfaceImpl.sendSms({
                    type: "PASSWORDLESS_LOGIN",
                    codeLifetime: response.codeLifetime,
                    phoneNumber: input.phoneNumber,
                    preAuthSessionId: response.preAuthSessionId,
                    urlWithLinkCode: magicLink,
                    userInputCode,
                    tenantId: input.tenantId,
                    userContext: input.userContext,
                });
            } else {
                logger_1.logDebugMessage(`Sending passwordless login email to ${input.email}`);
                await input.options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                    type: "PASSWORDLESS_LOGIN",
                    email: input.email,
                    codeLifetime: response.codeLifetime,
                    preAuthSessionId: response.preAuthSessionId,
                    urlWithLinkCode: magicLink,
                    userInputCode,
                    tenantId: input.tenantId,
                    userContext: input.userContext,
                });
            }
            return {
                status: "OK",
                deviceId: response.deviceId,
                flowType: input.options.config.flowType,
                preAuthSessionId: response.preAuthSessionId,
            };
        },
        emailExistsGET: async function (input) {
            let users = await recipe_1.default.getInstance().recipeInterfaceImpl.listUsersByAccountInfo({
                tenantId: input.tenantId,
                accountInfo: {
                    email: input.email,
                },
                doUnionOfAccountInfo: false,
                userContext: input.userContext,
            });
            return {
                exists: users.length > 0,
                status: "OK",
            };
        },
        phoneNumberExistsGET: async function (input) {
            let users = await recipe_1.default.getInstance().recipeInterfaceImpl.listUsersByAccountInfo({
                tenantId: input.tenantId,
                accountInfo: {
                    phoneNumber: input.phoneNumber,
                },
                doUnionOfAccountInfo: false,
                userContext: input.userContext,
            });
            return {
                exists: users.length > 0,
                status: "OK",
            };
        },
        resendCodePOST: async function (input) {
            let deviceInfo = await input.options.recipeImplementation.listCodesByDeviceId({
                userContext: input.userContext,
                deviceId: input.deviceId,
                tenantId: input.tenantId,
            });
            if (deviceInfo === undefined) {
                return {
                    status: "RESTART_FLOW_ERROR",
                };
            }
            if (
                (input.options.config.contactMethod === "PHONE" && deviceInfo.phoneNumber === undefined) ||
                (input.options.config.contactMethod === "EMAIL" && deviceInfo.email === undefined)
            ) {
                return {
                    status: "RESTART_FLOW_ERROR",
                };
            }
            let numberOfTriesToCreateNewCode = 0;
            while (true) {
                numberOfTriesToCreateNewCode++;
                let response = await input.options.recipeImplementation.createNewCodeForDevice({
                    userContext: input.userContext,
                    deviceId: input.deviceId,
                    userInputCode:
                        input.options.config.getCustomUserInputCode === undefined
                            ? undefined
                            : await input.options.config.getCustomUserInputCode(input.tenantId, input.userContext),
                    tenantId: input.tenantId,
                });
                if (response.status === "USER_INPUT_CODE_ALREADY_USED_ERROR") {
                    if (numberOfTriesToCreateNewCode >= 3) {
                        // we retry 3 times.
                        return {
                            status: "GENERAL_ERROR",
                            message: "Failed to generate a one time code. Please try again",
                        };
                    }
                    continue;
                }
                if (response.status === "OK") {
                    let magicLink = undefined;
                    let userInputCode = undefined;
                    const flowType = input.options.config.flowType;
                    if (flowType === "MAGIC_LINK" || flowType === "USER_INPUT_CODE_AND_MAGIC_LINK") {
                        magicLink =
                            input.options.appInfo
                                .getOrigin({
                                    request: input.options.req,
                                    userContext: input.userContext,
                                })
                                .getAsStringDangerous() +
                            input.options.appInfo.websiteBasePath.getAsStringDangerous() +
                            "/verify" +
                            "?rid=" +
                            input.options.recipeId +
                            "&preAuthSessionId=" +
                            response.preAuthSessionId +
                            "&tenantId=" +
                            input.tenantId +
                            "#" +
                            response.linkCode;
                    }
                    if (flowType === "USER_INPUT_CODE" || flowType === "USER_INPUT_CODE_AND_MAGIC_LINK") {
                        userInputCode = response.userInputCode;
                    }
                    // we don't do something special for serverless env here
                    // cause we want to wait for service's reply since it can show
                    // a UI error message for if sending an SMS / email failed or not.
                    if (
                        input.options.config.contactMethod === "PHONE" ||
                        (input.options.config.contactMethod === "EMAIL_OR_PHONE" &&
                            deviceInfo.phoneNumber !== undefined)
                    ) {
                        logger_1.logDebugMessage(`Sending passwordless login SMS to ${input.phoneNumber}`);
                        await input.options.smsDelivery.ingredientInterfaceImpl.sendSms({
                            type: "PASSWORDLESS_LOGIN",
                            codeLifetime: response.codeLifetime,
                            phoneNumber: deviceInfo.phoneNumber,
                            preAuthSessionId: response.preAuthSessionId,
                            urlWithLinkCode: magicLink,
                            userInputCode,
                            tenantId: input.tenantId,
                            userContext: input.userContext,
                        });
                    } else {
                        logger_1.logDebugMessage(`Sending passwordless login email to ${input.email}`);
                        await input.options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                            type: "PASSWORDLESS_LOGIN",
                            email: deviceInfo.email,
                            codeLifetime: response.codeLifetime,
                            preAuthSessionId: response.preAuthSessionId,
                            urlWithLinkCode: magicLink,
                            userInputCode,
                            tenantId: input.tenantId,
                            userContext: input.userContext,
                        });
                    }
                }
                return {
                    status: response.status,
                };
            }
        },
    };
}
exports.default = getAPIImplementation;
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
