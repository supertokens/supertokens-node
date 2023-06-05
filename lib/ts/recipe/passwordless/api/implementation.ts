import { APIInterface } from "../";
import { logDebugMessage } from "../../../logger";
import EmailVerification from "../../emailverification/recipe";
import Session from "../../session";
import RecipeUserId from "../../../recipeUserId";
import { listUsersByAccountInfo } from "../../..";

export default function getAPIImplementation(): APIInterface {
    return {
        consumeCodePOST: async function (input) {
            let response = await input.options.recipeImplementation.consumeCode(
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

            if (user.email !== undefined) {
                // TODO: this goes in the recipe implementation file. before we attempt
                // account linking.
                const emailVerificationInstance = EmailVerification.getInstance();
                if (emailVerificationInstance) {
                    const tokenResponse = await emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                        {
                            recipeUserId: new RecipeUserId(user.id), // TODO: change to recipeUserId
                            email: user.email,
                            userContext: input.userContext,
                        }
                    );

                    if (tokenResponse.status === "OK") {
                        await emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                            token: tokenResponse.token,
                            attemptAccountLinking: false,
                            userContext: input.userContext,
                        });
                    }
                }
            }

            const session = await Session.createNewSession(
                input.options.req,
                input.options.res,
                new RecipeUserId(user.id), // TODO: change to recipeUserId
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
        },
        createCodePOST: async function (input) {
            let response = await input.options.recipeImplementation.createCode(
                "email" in input
                    ? {
                          userContext: input.userContext,
                          email: input.email,
                          userInputCode:
                              input.options.config.getCustomUserInputCode === undefined
                                  ? undefined
                                  : await input.options.config.getCustomUserInputCode(input.userContext),
                      }
                    : {
                          userContext: input.userContext,
                          phoneNumber: input.phoneNumber,
                          userInputCode:
                              input.options.config.getCustomUserInputCode === undefined
                                  ? undefined
                                  : await input.options.config.getCustomUserInputCode(input.userContext),
                      }
            );

            // now we send the email / text message.
            let magicLink: string | undefined = undefined;
            let userInputCode: string | undefined = undefined;
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
                logDebugMessage(`Sending passwordless login SMS to ${(input as any).phoneNumber}`);
                await input.options.smsDelivery.ingredientInterfaceImpl.sendSms({
                    type: "PASSWORDLESS_LOGIN",
                    codeLifetime: response.codeLifetime,
                    phoneNumber: (input as any).phoneNumber!,
                    preAuthSessionId: response.preAuthSessionId,
                    urlWithLinkCode: magicLink,
                    userInputCode,
                    userContext: input.userContext,
                });
            } else {
                logDebugMessage(`Sending passwordless login email to ${(input as any).email}`);
                await input.options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                    type: "PASSWORDLESS_LOGIN",
                    email: (input as any).email!,
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
        },
        emailExistsGET: async function (input) {
            let users = await listUsersByAccountInfo(
                {
                    email: input.email,
                },
                input.userContext
            );

            return {
                exists: users.length > 0,
                status: "OK",
            };
        },
        phoneNumberExistsGET: async function (input) {
            let users = await listUsersByAccountInfo(
                {
                    phoneNumber: input.phoneNumber,
                },
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
                            : await input.options.config.getCustomUserInputCode(input.userContext),
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
                    let magicLink: string | undefined = undefined;
                    let userInputCode: string | undefined = undefined;
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
                        logDebugMessage(`Sending passwordless login SMS to ${(input as any).phoneNumber}`);
                        await input.options.smsDelivery.ingredientInterfaceImpl.sendSms({
                            type: "PASSWORDLESS_LOGIN",
                            codeLifetime: response.codeLifetime,
                            phoneNumber: deviceInfo.phoneNumber!,
                            preAuthSessionId: response.preAuthSessionId,
                            urlWithLinkCode: magicLink,
                            userInputCode,
                            userContext: input.userContext,
                        });
                    } else {
                        logDebugMessage(`Sending passwordless login email to ${(input as any).email}`);
                        await input.options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                            type: "PASSWORDLESS_LOGIN",
                            email: deviceInfo.email!,
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
        },
        linkAccountWithUserFromSessionPOST: async function (_input) {
            return {
                status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                description: "",
            };
        },
    };
}
