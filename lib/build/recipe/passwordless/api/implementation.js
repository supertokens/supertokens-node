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
                let numberOfTriesToCreateNewCode = 0;
                while (true) {
                    numberOfTriesToCreateNewCode++;
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
                    return {
                        status: "OK",
                        deviceId: response.deviceId,
                        flowType: input.options.config.flowType,
                        preAuthSessionId: response.preAuthSessionId,
                    };
                }
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
                    return {
                        status: response.status,
                    };
                }
            });
        },
    };
}
exports.default = getAPIImplementation;
