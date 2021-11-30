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
const session_1 = require("../../session");
function getAPIImplementation() {
    return {
        consumeCodePOST: function (input, userContext) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield input.options.recipeImplementation.consumeCode(
                    "deviceId" in input
                        ? {
                              deviceId: input.deviceId,
                              userInputCode: input.userInputCode,
                          }
                        : {
                              linkCode: input.linkCode,
                          },
                    userContext
                );
                if (response.status !== "OK") {
                    return response;
                }
                let user = response.user;
                const session = yield session_1.default.createNewSession(input.options.res, user.id, {}, {});
                return Object.assign(Object.assign({}, response), { session });
            });
        },
        createCodePOST: function (input, userContext) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield input.options.recipeImplementation.createCode(
                    "email" in input
                        ? {
                              email: input.email,
                              userInputCode:
                                  input.options.config.getCustomUserInputCode === undefined
                                      ? undefined
                                      : yield input.options.config.getCustomUserInputCode(userContext),
                          }
                        : {
                              phoneNumber: input.phoneNumber,
                              userInputCode:
                                  input.options.config.getCustomUserInputCode === undefined
                                      ? undefined
                                      : yield input.options.config.getCustomUserInputCode(userContext),
                          },
                    userContext
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
                            userContext
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
                try {
                    if (!input.options.isInServerlessEnv) {
                        if (input.options.config.contactMethod === "PHONE") {
                            input.options.config
                                .createAndSendCustomTextMessage(
                                    {
                                        codeLifetime: response.codeLifetime,
                                        phoneNumber: input.phoneNumber,
                                        preAuthSessionId: response.preAuthSessionId,
                                        urlWithLinkCode: magicLink,
                                        userInputCode,
                                    },
                                    userContext
                                )
                                .catch((_) => {});
                        } else {
                            input.options.config
                                .createAndSendCustomEmail(
                                    {
                                        codeLifetime: response.codeLifetime,
                                        email: input.email,
                                        preAuthSessionId: response.preAuthSessionId,
                                        urlWithLinkCode: magicLink,
                                        userInputCode,
                                    },
                                    userContext
                                )
                                .catch((_) => {});
                        }
                    } else {
                        if (input.options.config.contactMethod === "PHONE") {
                            yield input.options.config.createAndSendCustomTextMessage(
                                {
                                    codeLifetime: response.codeLifetime,
                                    phoneNumber: input.phoneNumber,
                                    preAuthSessionId: response.preAuthSessionId,
                                    urlWithLinkCode: magicLink,
                                    userInputCode,
                                },
                                userContext
                            );
                        } else {
                            yield input.options.config.createAndSendCustomEmail(
                                {
                                    codeLifetime: response.codeLifetime,
                                    email: input.email,
                                    preAuthSessionId: response.preAuthSessionId,
                                    urlWithLinkCode: magicLink,
                                    userInputCode,
                                },
                                userContext
                            );
                        }
                    }
                } catch (_) {}
                return {
                    status: "OK",
                    deviceId: response.deviceId,
                    flowType: input.options.config.flowType,
                    preAuthSessionId: response.preAuthSessionId,
                };
            });
        },
        emailExistsGET: function (input, userContext) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield input.options.recipeImplementation.getUserByEmail(
                    {
                        email: input.email,
                    },
                    userContext
                );
                return {
                    exists: response !== undefined,
                    status: "OK",
                };
            });
        },
        phoneNumberExistsGET: function (input, userContext) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield input.options.recipeImplementation.getUserByPhoneNumber(
                    {
                        phoneNumber: input.phoneNumber,
                    },
                    userContext
                );
                return {
                    exists: response !== undefined,
                    status: "OK",
                };
            });
        },
        resendCodePOST: function (input, userContext) {
            return __awaiter(this, void 0, void 0, function* () {
                let numberOfTriesToCreateNewCode = 0;
                while (true) {
                    numberOfTriesToCreateNewCode++;
                    let response = yield input.options.recipeImplementation.resendCode(
                        {
                            deviceId: input.deviceId,
                            userInputCode:
                                input.options.config.getCustomUserInputCode === undefined
                                    ? undefined
                                    : yield input.options.config.getCustomUserInputCode(userContext),
                        },
                        userContext
                    );
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
                        let deviceInfo = (yield input.options.recipeImplementation.listCodesByDeviceId(
                            {
                                deviceId: response.deviceId,
                            },
                            userContext
                        )).device;
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
                                    userContext
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
                        try {
                            if (!input.options.isInServerlessEnv) {
                                if (input.options.config.contactMethod === "PHONE") {
                                    input.options.config
                                        .createAndSendCustomTextMessage(
                                            {
                                                codeLifetime: response.codeLifetime,
                                                phoneNumber: deviceInfo.phoneNumber,
                                                preAuthSessionId: response.preAuthSessionId,
                                                urlWithLinkCode: magicLink,
                                                userInputCode,
                                            },
                                            userContext
                                        )
                                        .catch((_) => {});
                                } else {
                                    input.options.config
                                        .createAndSendCustomEmail(
                                            {
                                                codeLifetime: response.codeLifetime,
                                                email: deviceInfo.email,
                                                preAuthSessionId: response.preAuthSessionId,
                                                urlWithLinkCode: magicLink,
                                                userInputCode,
                                            },
                                            userContext
                                        )
                                        .catch((_) => {});
                                }
                            } else {
                                if (input.options.config.contactMethod === "PHONE") {
                                    yield input.options.config.createAndSendCustomTextMessage(
                                        {
                                            codeLifetime: response.codeLifetime,
                                            phoneNumber: deviceInfo.phoneNumber,
                                            preAuthSessionId: response.preAuthSessionId,
                                            urlWithLinkCode: magicLink,
                                            userInputCode,
                                        },
                                        userContext
                                    );
                                } else {
                                    yield input.options.config.createAndSendCustomEmail(
                                        {
                                            codeLifetime: response.codeLifetime,
                                            email: deviceInfo.email,
                                            preAuthSessionId: response.preAuthSessionId,
                                            urlWithLinkCode: magicLink,
                                            userInputCode,
                                        },
                                        userContext
                                    );
                                }
                            }
                        } catch (_) {}
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
