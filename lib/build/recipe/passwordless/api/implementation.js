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
            if (existingUsers.length === 0) {
                let isSignUpAllowed = await recipe_1.default.getInstance().isSignUpAllowed({
                    newUser: {
                        recipeId: "passwordless",
                        email: deviceInfo.email,
                        phoneNumber: deviceInfo.phoneNumber,
                    },
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
            } else if (existingUsers.length > 1) {
                throw new Error(
                    "You have found a bug. Please report it on https://github.com/supertokens/supertokens-node/issues"
                );
            }
            let response = await input.options.recipeImplementation.consumeCode(
                "deviceId" in input
                    ? {
                          preAuthSessionId: input.preAuthSessionId,
                          deviceId: input.deviceId,
                          userInputCode: input.userInputCode,
                          tenantId: input.tenantId,
                          userContext: input.userContext,
                      }
                    : {
                          preAuthSessionId: input.preAuthSessionId,
                          linkCode: input.linkCode,
                          tenantId: input.tenantId,
                          userContext: input.userContext,
                      }
            );
            if (response.status !== "OK") {
                return response;
            }
            let loginMethod = response.user.loginMethods.find(
                (m) =>
                    m.recipeId === "passwordless" &&
                    (m.hasSameEmailAs(deviceInfo.email) || m.hasSamePhoneNumberAs(m.phoneNumber))
            );
            if (loginMethod === undefined) {
                throw new Error("Should never come here");
            }
            if (existingUsers.length > 0) {
                // Here we do this check after sign in is done cause:
                // - We first want to check if the credentials are correct first or not
                // - The above recipe function marks the email as verified
                // - Even though the above call to signInUp is state changing (it changes the email
                // of the user), it's OK to do this check here cause the isSignInAllowed checks
                // conditions related to account linking
                let isSignInAllowed = await recipe_1.default.getInstance().isSignInAllowed({
                    user: response.user,
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
                // we do account linking only during sign in here cause during sign up,
                // the recipe function above does account linking for us.
                response.user = await recipe_1.default.getInstance().createPrimaryUserIdOrLinkAccounts({
                    tenantId: input.tenantId,
                    user: response.user,
                    userContext: input.userContext,
                });
            }
            const session = await session_1.default.createNewSession(
                input.options.req,
                input.options.res,
                input.tenantId,
                loginMethod.recipeUserId,
                {},
                {},
                input.userContext
            );
            return {
                status: "OK",
                createdNewRecipeUser: response.createdNewRecipeUser,
                user: response.user,
                session,
            };
        },
        createCodePOST: async function (input) {
            const accountInfo = {};
            if ("email" in input) {
                accountInfo.email = input.email;
            }
            if ("phoneNumber" in input) {
                accountInfo.email = input.phoneNumber;
            }
            let existingUsers = await __1.listUsersByAccountInfo(input.tenantId, accountInfo, false, input.userContext);
            existingUsers = existingUsers.filter((u) =>
                u.loginMethods.some(
                    (m) =>
                        m.recipeId === "passwordless" &&
                        (m.hasSameEmailAs(accountInfo.email) || m.hasSamePhoneNumberAs(accountInfo.phoneNumber))
                )
            );
            if (existingUsers.length === 0) {
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
