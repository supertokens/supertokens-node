"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../../../logger");
const recipe_1 = __importDefault(require("../../accountlinking/recipe"));
const authUtils_1 = require("../../../authUtils");
const multifactorauth_1 = require("../../multifactorauth");
const utils_1 = require("../utils");
function getAPIImplementation() {
    return {
        consumeCodePOST: async function (input) {
            const errorCodeMap = {
                SIGN_UP_NOT_ALLOWED:
                    "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_002)",
                SIGN_IN_NOT_ALLOWED:
                    "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_003)",
                LINKING_TO_SESSION_USER_FAILED: "User linking failed. Please contact support. (ERR_CODE_0XX)",
                NON_PRIMARY_SESSION_USER: "User linking failed. Please contact support. (ERR_CODE_0XY)",
            };
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
            let existingUsers = await recipe_1.default.getInstance().recipeInterfaceImpl.listUsersByAccountInfo({
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
            if (existingUsers.length > 1) {
                throw new Error(
                    "You have found a bug. Please report it on https://github.com/supertokens/supertokens-node/issues"
                );
            }
            const isSignUp = existingUsers.length === 0;
            let factorId;
            if (deviceInfo.email !== undefined) {
                if ("userInputCode" in input) {
                    factorId = multifactorauth_1.FactorIds.OTP_EMAIL;
                } else {
                    factorId = multifactorauth_1.FactorIds.LINK_EMAIL;
                }
            } else {
                if ("userInputCode" in input) {
                    factorId = multifactorauth_1.FactorIds.OTP_PHONE;
                } else {
                    factorId = multifactorauth_1.FactorIds.LINK_PHONE;
                }
            }
            const preAuthChecks = await authUtils_1.AuthUtils.preAuthChecks({
                accountInfo: {
                    recipeId: "passwordless",
                    email: deviceInfo.email,
                    phoneNumber: deviceInfo.phoneNumber,
                },
                factorIds: [factorId],
                isSignUp,
                isVerified: true,
                tenantId: input.tenantId,
                userContext: input.userContext,
                session: input.session,
            });
            if (preAuthChecks.status !== "OK") {
                // On the frontend, this should show a UI of asking the user
                // to login using a different method.
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    preAuthChecks,
                    errorCodeMap,
                    "SIGN_IN_UP_NOT_ALLOWED"
                );
            }
            let response = await input.options.recipeImplementation.consumeCode(
                "deviceId" in input
                    ? {
                          preAuthSessionId: input.preAuthSessionId,
                          deviceId: input.deviceId,
                          userInputCode: input.userInputCode,
                          session: input.session,
                          tenantId: input.tenantId,
                          userContext: input.userContext,
                      }
                    : {
                          preAuthSessionId: input.preAuthSessionId,
                          linkCode: input.linkCode,
                          session: input.session,
                          tenantId: input.tenantId,
                          userContext: input.userContext,
                      }
            );
            if (response.status !== "OK") {
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    response,
                    errorCodeMap,
                    "SIGN_IN_UP_NOT_ALLOWED"
                );
            }
            // Here we do these checks after sign in is done cause:
            // - We first want to check if the credentials are correct first or not
            // - The above recipe function marks the email as verified
            // - Even though the above call to signInUp is state changing (it changes the email
            // of the user), it's OK to do this check here cause the isSignInAllowed checks
            // conditions related to account linking
            const postAuthChecks = await authUtils_1.AuthUtils.postAuthChecks({
                factorId,
                isSignUp,
                responseUser: response.user,
                recipeUserId: response.recipeUserId,
                req: input.options.req,
                res: input.options.res,
                tenantId: input.tenantId,
                userContext: input.userContext,
                session: input.session,
            });
            if (postAuthChecks.status !== "OK") {
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    preAuthChecks,
                    errorCodeMap,
                    "SIGN_IN_UP_NOT_ALLOWED"
                );
            }
            return {
                status: "OK",
                createdNewRecipeUser: response.createdNewRecipeUser,
                user: postAuthChecks.user,
                session: postAuthChecks.session,
            };
        },
        createCodePOST: async function (input) {
            var _a;
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
            const isSignUp = existingUsers.length === 0;
            const preAuthChecks = await authUtils_1.AuthUtils.preAuthChecks({
                accountInfo: Object.assign(Object.assign({}, accountInfo), { recipeId: "passwordless" }),
                isSignUp,
                isVerified: true,
                tenantId: input.tenantId,
                factorIds:
                    (_a = input.factorIds) !== null && _a !== void 0
                        ? _a
                        : utils_1.getEnabledPwlessFactors(input.options.config),
                userContext: input.userContext,
                session: input.session,
            });
            if (preAuthChecks.status === "SIGN_UP_NOT_ALLOWED") {
                // On the frontend, this should show a UI of asking the user
                // to login using a different method.
                return {
                    status: "SIGN_IN_UP_NOT_ALLOWED",
                    reason:
                        "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_002)",
                };
            }
            if (existingUsers.length === 1) {
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
                    session: input.session,
                    userContext: input.userContext,
                });
                if (!isSignInAllowed) {
                    return {
                        status: "SIGN_IN_UP_NOT_ALLOWED",
                        reason:
                            "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_003)",
                    };
                }
            }
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
                          session: input.session,
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
                          session: input.session,
                          tenantId: input.tenantId,
                      }
            );
            if (response.status !== "OK") {
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(response, {}, "SIGN_IN_UP_NOT_ALLOWED");
            }
            // now we send the email / text message.
            let magicLink = undefined;
            let userInputCode = undefined;
            let flowType = input.options.config.flowType;
            if (input.factorIds) {
                if (input.factorIds.every((id) => id.startsWith("link"))) {
                    flowType = "MAGIC_LINK";
                } else if (input.factorIds.every((id) => id.startsWith("otp"))) {
                    flowType = "MAGIC_LINK";
                } else {
                    flowType = "USER_INPUT_CODE_AND_MAGIC_LINK";
                }
            }
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
                    type: input.factorIds ? "PWLESS_MFA" : "PASSWORDLESS_LOGIN",
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
                    type: input.factorIds ? "PWLESS_MFA" : "PASSWORDLESS_LOGIN",
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
