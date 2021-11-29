import { APIInterface } from "../";
import Session from "../../session";

export default function getAPIImplementation(): APIInterface {
    return {
        consumeCodePOST: async function (input, userContext) {
            let response = await input.options.recipeImplementation.consumeCode(
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

            const session = await Session.createNewSession(input.options.res, user.id, {}, {});
            return {
                ...response,
                session,
            };
        },
        createCodePOST: async function (input, userContext) {
            let numberOfTriesToCreateNewCode = 0;
            while (true) {
                numberOfTriesToCreateNewCode++;
                let response = await input.options.recipeImplementation.createCode(
                    "email" in input
                        ? {
                              email: input.email,
                              userInputCode:
                                  input.options.config.getCustomUserInputCode === undefined
                                      ? undefined
                                      : await input.options.config.getCustomUserInputCode(userContext),
                          }
                        : {
                              phoneNumber: input.phoneNumber,
                              userInputCode:
                                  input.options.config.getCustomUserInputCode === undefined
                                      ? undefined
                                      : await input.options.config.getCustomUserInputCode(userContext),
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
        },
        emailExistsGET: async function (input, userContext) {
            let response = await input.options.recipeImplementation.getUserByEmail(
                {
                    email: input.email,
                },
                userContext
            );

            return {
                exists: response !== undefined,
                status: "OK",
            };
        },
        phoneNumberExistsGET: async function (input, userContext) {
            let response = await input.options.recipeImplementation.getUserByPhoneNumber(
                {
                    phoneNumber: input.phoneNumber,
                },
                userContext
            );

            return {
                exists: response !== undefined,
                status: "OK",
            };
        },
        resendCodePOST: async function (input, userContext) {
            let numberOfTriesToCreateNewCode = 0;
            while (true) {
                numberOfTriesToCreateNewCode++;
                let response = await input.options.recipeImplementation.resendCode(
                    {
                        deviceId: input.deviceId,
                        userInputCode:
                            input.options.config.getCustomUserInputCode === undefined
                                ? undefined
                                : await input.options.config.getCustomUserInputCode(userContext),
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
        },
    };
}
