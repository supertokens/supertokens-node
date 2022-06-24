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
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../../../logger");
const session_1 = require("../../session");
function getAPIImplementation() {
    return {
        consumeCodePOST: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
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
                let user = response.user;
                const session = yield session_1.default.createNewSession(
                    input.options.res,
                    user.id,
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
                        (yield input.options.config.getLinkDomainAndPath(
                            "phoneNumber" in input
                                ? {
                                      phoneNumber: input.phoneNumber,
                                  }
                                : {
                                      email: input.email,
                                  },
                            input.userContext
                        )) +
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
                let response = yield input.options.recipeImplementation.getUserByEmail({
                    userContext: input.userContext,
                    email: input.email,
                });
                return {
                    exists: response !== undefined,
                    status: "OK",
                };
            });
        },
        phoneNumberExistsGET: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield input.options.recipeImplementation.getUserByPhoneNumber({
                    userContext: input.userContext,
                    phoneNumber: input.phoneNumber,
                });
                return {
                    exists: response !== undefined,
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
                                (yield input.options.config.getLinkDomainAndPath(
                                    deviceInfo.email === undefined
                                        ? {
                                              phoneNumber: deviceInfo.phoneNumber,
                                          }
                                        : {
                                              email: deviceInfo.email,
                                          },
                                    input.userContext
                                )) +
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
