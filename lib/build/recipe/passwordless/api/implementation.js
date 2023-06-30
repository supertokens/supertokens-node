"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../../../logger");
const recipe_1 = __importDefault(require("../../accountlinking/recipe"));
const recipe_2 = __importDefault(require("../../emailverification/recipe"));
const session_1 = __importDefault(require("../../session"));
const __1 = require("../../..");
function getAPIImplementation() {
    return {
        consumeCodePOST: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const deviceInfo = yield input.options.recipeImplementation.listCodesByPreAuthSessionId({
                    preAuthSessionId: input.preAuthSessionId,
                    userContext: input.userContext,
                });
                if (!deviceInfo) {
                    return {
                        status: "RESTART_FLOW_ERROR",
                    };
                }
                let existingUsers = yield __1.listUsersByAccountInfo(
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
                    let isSignUpAllowed = yield recipe_1.default.getInstance().isSignUpAllowed({
                        newUser: {
                            recipeId: "passwordless",
                            email: deviceInfo.email,
                            phoneNumber: deviceInfo.phoneNumber,
                        },
                        isVerified: true,
                        userContext: input.userContext,
                    });
                    if (!isSignUpAllowed) {
                        // On the frontend, this should show a UI of asking the user
                        // to login using a different method.
                        return {
                            status: "SIGN_IN_UP_NOT_ALLOWED",
                            reason: "Cannot sign in / up due to security reasons. Please contact support.",
                        };
                    }
                } else if (existingUsers.length > 1) {
                    throw new Error(
                        "You have found a bug. Please report it on https://github.com/supertokens/supertokens-node/issues"
                    );
                }
                let response = yield input.options.recipeImplementation.consumeCode(
                    "deviceId" in input
                        ? {
                              preAuthSessionId: input.preAuthSessionId,
                              deviceId: input.deviceId,
                              userInputCode: input.userInputCode,
                              userContext: input.userContext,
                          }
                        : {
                              preAuthSessionId: input.preAuthSessionId,
                              linkCode: input.linkCode,
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
                if (loginMethod.email !== undefined) {
                    // TODO: this goes in the recipe implementation file. before we attempt account linking.
                    const emailVerificationInstance = recipe_2.default.getInstance();
                    if (emailVerificationInstance) {
                        const tokenResponse = yield emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                            {
                                recipeUserId: loginMethod.recipeUserId,
                                email: loginMethod.email,
                                userContext: input.userContext,
                            }
                        );
                        if (tokenResponse.status === "OK") {
                            yield emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                                token: tokenResponse.token,
                                attemptAccountLinking: false,
                                userContext: input.userContext,
                            });
                        }
                    }
                }
                if (existingUsers.length > 0) {
                    // Here we do this check after sign in is done cause:
                    // - We first want to check if the credentials are correct first or not
                    // - The above recipe function marks the email as verified
                    // - Even though the above call to signInUp is state changing (it changes the email
                    // of the user), it's OK to do this check here cause the isSignInAllowed checks
                    // conditions related to account linking
                    let isSignInAllowed = yield recipe_1.default.getInstance().isSignInAllowed({
                        recipeUserId: loginMethod.recipeUserId,
                        userContext: input.userContext,
                    });
                    if (!isSignInAllowed) {
                        return {
                            status: "SIGN_IN_UP_NOT_ALLOWED",
                            reason: "Cannot sign in / up due to security reasons. Please contact support.",
                        };
                    }
                    // we do account linking only during sign in here cause during sign up,
                    // the recipe function above does account linking for us.
                    let userId = yield recipe_1.default.getInstance().createPrimaryUserIdOrLinkAccounts({
                        recipeUserId: loginMethod.recipeUserId,
                        checkAccountsToLinkTableAsWell: true,
                        userContext: input.userContext,
                    });
                    response.user = yield __1.getUser(userId, input.userContext);
                }
                const session = yield session_1.default.createNewSession(
                    input.options.req,
                    input.options.res,
                    loginMethod.recipeUserId,
                    {},
                    {},
                    input.userContext
                );
                return {
                    status: "OK",
                    createdNewUser: response.createdNewUser,
                    user: response.user,
                    session,
                };
            });
        },
        createCodePOST: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const accountInfo = {};
                if ("email" in input) {
                    accountInfo.email = input.email;
                }
                if ("phoneNumber" in input) {
                    accountInfo.email = input.phoneNumber;
                }
                let existingUsers = yield __1.listUsersByAccountInfo(accountInfo, false, input.userContext);
                existingUsers = existingUsers.filter((u) =>
                    u.loginMethods.some(
                        (m) =>
                            m.recipeId === "passwordless" &&
                            (m.hasSameEmailAs(accountInfo.email) || m.hasSamePhoneNumberAs(accountInfo.phoneNumber))
                    )
                );
                if (existingUsers.length === 0) {
                    let isSignUpAllowed = yield recipe_1.default.getInstance().isSignUpAllowed({
                        newUser: Object.assign({ recipeId: "passwordless" }, accountInfo),
                        isVerified: true,
                        userContext: input.userContext,
                    });
                    if (!isSignUpAllowed) {
                        // On the frontend, this should show a UI of asking the user
                        // to login using a different method.
                        return {
                            status: "SIGN_IN_UP_NOT_ALLOWED",
                            reason: "Cannot sign in / up due to security reasons. Please contact support.",
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
                    let isSignInAllowed = yield recipe_1.default.getInstance().isSignInAllowed({
                        recipeUserId: loginMethod.recipeUserId,
                        userContext: input.userContext,
                    });
                    if (!isSignInAllowed) {
                        return {
                            status: "SIGN_IN_UP_NOT_ALLOWED",
                            reason: "Cannot sign in / up due to security reasons. Please contact support.",
                        };
                    }
                } else {
                    throw new Error(
                        "You have found a bug. Please report it on https://github.com/supertokens/supertokens-node/issues"
                    );
                }
                let response = yield input.options.recipeImplementation.createCode(
                    "email" in input
                        ? {
                              userContext: input.userContext,
                              email: input.email,
                              userInputCode:
                                  input.options.config.getCustomUserInputCode === undefined
                                      ? undefined
                                      : yield input.options.config.getCustomUserInputCode(input.userContext),
                          }
                        : {
                              userContext: input.userContext,
                              phoneNumber: input.phoneNumber,
                              userInputCode:
                                  input.options.config.getCustomUserInputCode === undefined
                                      ? undefined
                                      : yield input.options.config.getCustomUserInputCode(input.userContext),
                          }
                );
                // now we send the email / text message.
                let magicLink = undefined;
                let userInputCode = undefined;
                const flowType = input.options.config.flowType;
                if (flowType === "MAGIC_LINK" || flowType === "USER_INPUT_CODE_AND_MAGIC_LINK") {
                    magicLink =
                        input.options.appInfo.websiteDomain.getAsStringDangerous() +
                        input.options.appInfo.websiteBasePath.getAsStringDangerous() +
                        "/verify" +
                        "?rid=" +
                        input.options.recipeId +
                        "&preAuthSessionId=" +
                        response.preAuthSessionId +
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
                    yield input.options.smsDelivery.ingredientInterfaceImpl.sendSms({
                        type: "PASSWORDLESS_LOGIN",
                        codeLifetime: response.codeLifetime,
                        phoneNumber: input.phoneNumber,
                        preAuthSessionId: response.preAuthSessionId,
                        urlWithLinkCode: magicLink,
                        userInputCode,
                        userContext: input.userContext,
                    });
                } else {
                    logger_1.logDebugMessage(`Sending passwordless login email to ${input.email}`);
                    yield input.options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                        type: "PASSWORDLESS_LOGIN",
                        email: input.email,
                        codeLifetime: response.codeLifetime,
                        preAuthSessionId: response.preAuthSessionId,
                        urlWithLinkCode: magicLink,
                        userInputCode,
                        userContext: input.userContext,
                    });
                }
                return {
                    status: "OK",
                    deviceId: response.deviceId,
                    flowType: input.options.config.flowType,
                    preAuthSessionId: response.preAuthSessionId,
                };
            });
        },
        emailExistsGET: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let users = yield __1.listUsersByAccountInfo(
                    {
                        email: input.email,
                    },
                    input.userContext
                );
                return {
                    exists: users.length > 0,
                    status: "OK",
                };
            });
        },
        phoneNumberExistsGET: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let users = yield __1.listUsersByAccountInfo(
                    {
                        phoneNumber: input.phoneNumber,
                    },
                    input.userContext
                );
                return {
                    exists: users.length > 0,
                    status: "OK",
                };
            });
        },
        resendCodePOST: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let deviceInfo = yield input.options.recipeImplementation.listCodesByDeviceId({
                    userContext: input.userContext,
                    deviceId: input.deviceId,
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
                    let response = yield input.options.recipeImplementation.createNewCodeForDevice({
                        userContext: input.userContext,
                        deviceId: input.deviceId,
                        userInputCode:
                            input.options.config.getCustomUserInputCode === undefined
                                ? undefined
                                : yield input.options.config.getCustomUserInputCode(input.userContext),
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
                                input.options.appInfo.websiteDomain.getAsStringDangerous() +
                                input.options.appInfo.websiteBasePath.getAsStringDangerous() +
                                "/verify" +
                                "?rid=" +
                                input.options.recipeId +
                                "&preAuthSessionId=" +
                                response.preAuthSessionId +
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
                            yield input.options.smsDelivery.ingredientInterfaceImpl.sendSms({
                                type: "PASSWORDLESS_LOGIN",
                                codeLifetime: response.codeLifetime,
                                phoneNumber: deviceInfo.phoneNumber,
                                preAuthSessionId: response.preAuthSessionId,
                                urlWithLinkCode: magicLink,
                                userInputCode,
                                userContext: input.userContext,
                            });
                        } else {
                            logger_1.logDebugMessage(`Sending passwordless login email to ${input.email}`);
                            yield input.options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                                type: "PASSWORDLESS_LOGIN",
                                email: deviceInfo.email,
                                codeLifetime: response.codeLifetime,
                                preAuthSessionId: response.preAuthSessionId,
                                urlWithLinkCode: magicLink,
                                userInputCode,
                                userContext: input.userContext,
                            });
                        }
                    }
                    return {
                        status: response.status,
                    };
                }
            });
        },
    };
}
exports.default = getAPIImplementation;
