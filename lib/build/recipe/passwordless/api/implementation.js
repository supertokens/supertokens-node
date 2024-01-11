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
            const deviceInfo = await input.options.recipeImplementation.listCodesByPreAuthSessionId({
                tenantId: input.tenantId,
                preAuthSessionId: input.preAuthSessionId,
                userContext: input.userContext,
            });
            if (!deviceInfo) {
                return {
                    status: "RESTART_FLOW_ERROR",
                };
            }
            while (true) {
                try {
                    const factorId = `${"userInputCode" in input ? "otp" : "link"}-${
                        deviceInfo.email ? "email" : "phone"
                    }`;
                    let existingUsers = await __1.listUsersByAccountInfo(
                        input.tenantId,
                        {
                            phoneNumber: deviceInfo.phoneNumber,
                            email: deviceInfo.email,
                        },
                        false,
                        input.userContext
                    );
                    existingUsers = existingUsers.filter((u) =>
                        u.loginMethods.some(
                            (m) =>
                                m.recipeId === "passwordless" &&
                                (m.hasSameEmailAs(deviceInfo.email) || m.hasSamePhoneNumberAs(m.phoneNumber))
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
                    let isSignIn = existingUsers.length !== 0;
                    if (mfaInstance === undefined) {
                        if (session === undefined) {
                            if (isSignIn) {
                                // MFA is disabled
                                // No Active session
                                // Sign In
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
                                    return consumeCodeResponse;
                                }
                                await checkIfSignInIsAllowed(
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
                                // MFA is disabled
                                // No Active session
                                // Sign Up
                                await checkIfSignUpIsAllowed(
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
                                    return consumeCodeResponse;
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
                            // active session
                            let overwriteSessionDuringSignInUp = recipe_3.default.getInstanceOrThrowError().config
                                .overwriteSessionDuringSignInUp;
                            if (isSignIn) {
                                // MFA is disabled
                                // Active session
                                // Sign In
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
                                    return consumeCodeResponse;
                                }
                                if (overwriteSessionDuringSignInUp) {
                                    await checkIfSignInIsAllowed(
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
                                // MFA is disabled
                                // Active session
                                // Sign Up
                                await checkIfSignUpIsAllowed(
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
                                    return consumeCodeResponse;
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
                        // MFA is active
                        if (session === undefined) {
                            // first factor
                            if (isSignIn) {
                                // MFA is enabled
                                // No Active session / first factor
                                // Sign In
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
                                    return consumeCodeResponse;
                                }
                                await checkIfSignInIsAllowed(
                                    input.tenantId,
                                    consumeCodeResponse.user,
                                    input.userContext
                                );
                                await checkIfValidFirstFactor(input.tenantId, factorId, input.userContext);
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
                                // MFA is enabled
                                // No Active session / first factor
                                // Sign Up
                                await checkIfSignUpIsAllowed(
                                    input.tenantId,
                                    deviceInfo.email,
                                    deviceInfo.phoneNumber,
                                    input.userContext
                                );
                                await checkIfValidFirstFactor(input.tenantId, factorId, input.userContext);
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
                                    return consumeCodeResponse;
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
                                    return consumeCodeResponse;
                                }
                                if (consumeCodeResponse.user.id !== sessionUser.id) {
                                    return {
                                        status: "SIGN_IN_UP_NOT_ALLOWED",
                                        reason:
                                            "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_013)",
                                    };
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
                                // MFA is enabled
                                // Active session / secondary factor
                                // Sign In / Factor setup
                                await multifactorauth_1.default.assertAllowedToSetupFactorElseThrowInvalidClaimError(
                                    session,
                                    factorId,
                                    input.userContext
                                );
                                await checkIfFactorUserBeingCreatedCanBeLinkedWithSessionUser(
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
                                    return consumeCodeResponse;
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
            let existingUsers = await __1.listUsersByAccountInfo(input.tenantId, accountInfo, false, input.userContext);
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
            // Ideally we want to check if the user is allowed to setup a factor, but unfortunately
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
            let users = await __1.listUsersByAccountInfo(
                input.tenantId,
                {
                    email: input.email,
                    // tenantId: input.tenantId,
                },
                false,
                input.userContext
            );
            return {
                exists: users.length > 0,
                status: "OK",
            };
        },
        phoneNumberExistsGET: async function (input) {
            let users = await __1.listUsersByAccountInfo(
                input.tenantId,
                {
                    phoneNumber: input.phoneNumber,
                    // tenantId: input.tenantId,
                },
                false,
                input.userContext
            );
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
const checkIfSignUpIsAllowed = async (tenantId, email, phoneNumber, userContext) => {
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
const checkIfSignInIsAllowed = async (tenantId, user, userContext) => {
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
const checkIfValidFirstFactor = async (tenantId, factorId, userContext) => {
    let isValid = await utils_1.isValidFirstFactor(tenantId, factorId, userContext);
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
            recipeUserId: new __1.RecipeUserId(sessionUser.id),
            userContext,
        });
        if (createPrimaryRes.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
            // Session user is linked to another primary user, which means the session is revoked as well
            throw new error_1.default({
                type: error_1.default.TRY_REFRESH_TOKEN,
                message: "Session may be revoked",
            });
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
            // Session user is linked to another primary user, which means the session is revoked as well
            throw new error_1.default({
                type: error_1.default.TRY_REFRESH_TOKEN,
                message: "Session may be revoked",
            });
        }
        if (canCreatePrimary.status === "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR") {
            throw new SignInUpError({
                status: "SIGN_IN_UP_NOT_ALLOWED",
                reason: "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_014)",
            });
        }
    }
    // Check if the linking with session user going to fail and avoid user creation here
    const users = await __1.listUsersByAccountInfo(tenantId, accountInfo, true, userContext);
    for (const user of users) {
        if (user.isPrimaryUser && user.id !== sessionUser.id) {
            throw new SignInUpError({
                status: "SIGN_IN_UP_NOT_ALLOWED",
                reason: "Cannot complete MFA because of security reasons. Please contact support. (ERR_CODE_015)",
            });
        }
    }
};
