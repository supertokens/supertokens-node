import { APIInterface } from "../";
import { logDebugMessage } from "../../../logger";
import EmailVerification from "../../emailverification/recipe";
import Session from "../../session";
import AccountLinking from "../../accountlinking";
import { AccountLinkingClaim } from "../../accountlinking/accountLinkingClaim";
import { getUser } from "../../..";

export default function getAPIImplementation(): APIInterface {
    return {
        consumeCodePOST: async function (input) {
            let emailOrPhoneNumberForCode = await input.options.recipeImplementation.getEmailOrPhoneNumberForCode(
                input
            );
            if (emailOrPhoneNumberForCode !== undefined) {
                let isSignUpAllowed = await AccountLinking.isSignUpAllowed(
                    {
                        recipeId: "passwordless",
                        email: emailOrPhoneNumberForCode.email,
                        phoneNumber: emailOrPhoneNumberForCode.phoneNumber,
                    },
                    input.userContext
                );

                if (!isSignUpAllowed) {
                    return {
                        status: "SIGNUP_NOT_ALLOWED",
                        reason: "the sign-up info is already associated with another account where it is not verified",
                    };
                }
            }
            let response = await input.options.recipeImplementation.consumeCode(
                "deviceId" in input
                    ? {
                          preAuthSessionId: input.preAuthSessionId,
                          deviceId: input.deviceId,
                          userInputCode: input.userInputCode,
                          doAccountLinking: true,
                          userContext: input.userContext,
                      }
                    : {
                          preAuthSessionId: input.preAuthSessionId,
                          linkCode: input.linkCode,
                          doAccountLinking: true,
                          userContext: input.userContext,
                      }
            );

            if (response.status !== "OK") {
                return response;
            }

            let user = response.user;

            if (user.email !== undefined) {
                const emailVerificationInstance = EmailVerification.getInstance();
                if (emailVerificationInstance) {
                    const tokenResponse = await emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                        {
                            userId: user.recipeUserId,
                            email: user.email,
                            userContext: input.userContext,
                        }
                    );

                    if (tokenResponse.status === "OK") {
                        await emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                            token: tokenResponse.token,
                            userContext: input.userContext,
                        });
                    }
                }
            }

            const session = await Session.createNewSession(
                input.options.req,
                input.options.res,
                user.id,
                user.recipeUserId,
                {},
                {},
                input.userContext
            );

            return {
                status: "OK",
                createdNewUser: response.createdNewUser,
                createdNewRecipeUser: false, // TODO
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
            let response = await input.options.recipeImplementation.getUserByEmail({
                userContext: input.userContext,
                email: input.email,
            });

            return {
                exists: response !== undefined,
                status: "OK",
            };
        },
        phoneNumberExistsGET: async function (input) {
            let response = await input.options.recipeImplementation.getUserByPhoneNumber({
                userContext: input.userContext,
                phoneNumber: input.phoneNumber,
            });

            return {
                exists: response !== undefined,
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
        linkAccountToExistingAccountPOST: async function (input) {
            let emailOrPhoneNumberForCode = await input.options.recipeImplementation.getEmailOrPhoneNumberForCode(
                input
            );
            if (emailOrPhoneNumberForCode === undefined) {
                throw Error("Invalid input");
            }
            let email = emailOrPhoneNumberForCode.email;
            let phoneNumber = emailOrPhoneNumberForCode.phoneNumber;
            let session = input.session;
            let result = await AccountLinking.accountLinkPostSignInViaSession(
                session,
                {
                    email,
                    phoneNumber,
                    recipeId: "passwordless",
                },
                true,
                input.userContext
            );
            let createdNewRecipeUser = false;
            if (result.createRecipeUser) {
                let response = await input.options.recipeImplementation.consumeCode(
                    "deviceId" in input
                        ? {
                              preAuthSessionId: input.preAuthSessionId,
                              deviceId: input.deviceId,
                              userInputCode: input.userInputCode,
                              doAccountLinking: true,
                              userContext: input.userContext,
                          }
                        : {
                              preAuthSessionId: input.preAuthSessionId,
                              linkCode: input.linkCode,
                              doAccountLinking: true,
                              userContext: input.userContext,
                          }
                );

                if (response.status !== "OK") {
                    throw Error(
                        `this error should never be thrown while creating a new user during accountLinkPostSignInViaSession flow: ${response.status}`
                    );
                }
                createdNewRecipeUser = true;
                if (result.updateVerificationClaim) {
                    await session.setClaimValue(AccountLinkingClaim, response.user.id, input.userContext);
                    return {
                        status: "ACCOUNT_NOT_VERIFIED_ERROR",
                        isNotVerifiedAccountFromInputSession: false,
                        description: "",
                    };
                } else {
                    result = await AccountLinking.accountLinkPostSignInViaSession(
                        session,
                        {
                            email,
                            phoneNumber,
                            recipeId: "passwordless",
                        },
                        true,
                        input.userContext
                    );
                }
            }
            if (result.createRecipeUser) {
                throw Error(
                    `this error should never be thrown after creating a new user during accountLinkPostSignInViaSession flow`
                );
            }
            if (!result.accountsLinked) {
                if (result.reason === "EXISTING_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR") {
                    return {
                        status: "ACCOUNT_NOT_VERIFIED_ERROR",
                        isNotVerifiedAccountFromInputSession: true,
                        description: "",
                    };
                }
                if (result.reason === "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR") {
                    return {
                        status: "ACCOUNT_NOT_VERIFIED_ERROR",
                        isNotVerifiedAccountFromInputSession: false,
                        description: "",
                    };
                }
                if (
                    result.reason === "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR" ||
                    result.reason === "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                ) {
                    return {
                        status: result.reason,
                        description: "",
                        primaryUserId: result.primaryUserId,
                    };
                }
                return {
                    status: result.reason,
                    description: "",
                };
            }
            let wereAccountsAlreadyLinked = false;
            if (result.updateVerificationClaim) {
                await session.removeClaim(AccountLinkingClaim, input.userContext);
            } else {
                wereAccountsAlreadyLinked = true;
            }
            let user = await getUser(session.getUserId());
            if (user === undefined) {
                throw Error(
                    "this error should never be thrown. Can't find primary user with userId: " + session.getUserId()
                );
            }
            let recipeUser = user.loginMethods.find(
                (u) =>
                    u.recipeId === "passwordless" &&
                    ((email !== undefined && u.email === email) ||
                        (phoneNumber !== undefined && u.phoneNumber === phoneNumber))
            );
            if (recipeUser === undefined) {
                throw Error(
                    "this error should never be thrown. Can't find passwordless recipeUser with email: " +
                        email +
                        " & phoneNumber: " +
                        phoneNumber +
                        "  and primary userId: " +
                        session.getUserId()
                );
            }
            return {
                status: "OK",
                user: {
                    id: user.id,
                    recipeUserId: recipeUser.id,
                    timeJoined: recipeUser.timeJoined,
                    email,
                    phoneNumber,
                },
                createdNewRecipeUser,
                wereAccountsAlreadyLinked,
                session,
            };
        },
    };
}
