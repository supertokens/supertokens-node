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

            // now we send the email / text message.
            let magicLink: string | undefined = undefined;
            let userInputCode: string | undefined = undefined;
            const flowType = input.options.config.flowType;
            if (flowType === "MAGIC_LINK" || flowType === "USER_INPUT_CODE_AND_MAGIC_LINK") {
                magicLink =
                    (await input.options.config.getLinkDomainAndPath(
                        "phoneNumber" in input
                            ? {
                                  phoneNumber: input.phoneNumber!,
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
                                    phoneNumber: (input as any).phoneNumber,
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
                                    email: (input as any).email!,
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
                        await input.options.config.createAndSendCustomTextMessage(
                            {
                                codeLifetime: response.codeLifetime,
                                phoneNumber: (input as any).phoneNumber!,
                                preAuthSessionId: response.preAuthSessionId,
                                urlWithLinkCode: magicLink,
                                userInputCode,
                            },
                            userContext
                        );
                    } else {
                        await input.options.config.createAndSendCustomEmail(
                            {
                                codeLifetime: response.codeLifetime,
                                email: (input as any).email!,
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

                if (response.status === "OK") {
                    let deviceInfo = (
                        await input.options.recipeImplementation.listCodesByDeviceId(
                            {
                                deviceId: response.deviceId,
                            },
                            userContext
                        )
                    ).device;

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

                    let magicLink: string | undefined = undefined;
                    let userInputCode: string | undefined = undefined;
                    const flowType = input.options.config.flowType;
                    if (flowType === "MAGIC_LINK" || flowType === "USER_INPUT_CODE_AND_MAGIC_LINK") {
                        magicLink =
                            (await input.options.config.getLinkDomainAndPath(
                                deviceInfo.email === undefined
                                    ? {
                                          phoneNumber: deviceInfo.phoneNumber!,
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
                                            phoneNumber: deviceInfo.phoneNumber!,
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
                                            email: deviceInfo.email!,
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
                                await input.options.config.createAndSendCustomTextMessage(
                                    {
                                        codeLifetime: response.codeLifetime,
                                        phoneNumber: deviceInfo.phoneNumber!,
                                        preAuthSessionId: response.preAuthSessionId,
                                        urlWithLinkCode: magicLink,
                                        userInputCode,
                                    },
                                    userContext
                                );
                            } else {
                                await input.options.config.createAndSendCustomEmail(
                                    {
                                        codeLifetime: response.codeLifetime,
                                        email: deviceInfo.email!,
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
        },
    };
}
