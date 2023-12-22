import { APIInterface } from "../";
import { logDebugMessage } from "../../../logger";
import AccountLinking from "../../accountlinking/recipe";
import MultiFactorAuthRecipe from "../../multifactorauth/recipe";
import Session from "../../session";
import { getUser, listUsersByAccountInfo } from "../../..";
import { RecipeLevelUser } from "../../accountlinking/types";
import { SessionContainerInterface } from "../../session/types";
import { getFactorFlowControlFlags } from "../../multifactorauth/utils";
import SessionError from "../../session/error";

export default function getAPIImplementation(): APIInterface {
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

            let existingUsers = await listUsersByAccountInfo(
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

            let {
                session,
                mfaInstance,
                shouldCheckIfSignInIsAllowed,
                shouldCheckIfSignUpIsAllowed,
                shouldAttemptAccountLinking,
                shouldCreateSession,
            } = await getFactorFlowControlFlags(input.options.req, input.options.res, input.userContext);

            if (existingUsers.length === 0) {
                if (shouldCheckIfSignUpIsAllowed) {
                    let isSignUpAllowed = await AccountLinking.getInstance().isSignUpAllowed({
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
                }
            } else if (existingUsers.length > 1) {
                throw new Error(
                    "You have found a bug. Please report it on https://github.com/supertokens/supertokens-node/issues"
                );
            }

            const isSignUp = existingUsers.length === 0;
            const factorId = `${"userInputCode" in input ? "otp" : "link"}-${deviceInfo.email ? "email" : "phone"}`;

            if (mfaInstance !== undefined) {
                const validateRes = isSignUp
                    ? await mfaInstance.validateForMultifactorAuthBeforeFactorCompletion({
                          tenantId: input.tenantId,
                          factorIdInProgress: factorId,
                          isAlreadySetup: false,
                          signUpInfo:
                              deviceInfo.email !== undefined
                                  ? {
                                        email: deviceInfo.email,
                                        isVerifiedFactor: true,
                                    }
                                  : undefined,
                          session,
                          userContext: input.userContext,
                      })
                    : await mfaInstance.validateForMultifactorAuthBeforeFactorCompletion({
                          tenantId: input.tenantId,
                          factorIdInProgress: factorId,
                          userLoggingIn: existingUsers[0],
                          session,
                          userContext: input.userContext,
                      });

                if (validateRes.status !== "OK") {
                    return validateRes;
                }
            }

            let response = await input.options.recipeImplementation.consumeCode(
                "deviceId" in input
                    ? {
                          preAuthSessionId: input.preAuthSessionId,
                          deviceId: input.deviceId,
                          userInputCode: input.userInputCode,
                          tenantId: input.tenantId,
                          shouldAttemptAccountLinkingIfAllowed: shouldAttemptAccountLinking,
                          userContext: input.userContext,
                      }
                    : {
                          preAuthSessionId: input.preAuthSessionId,
                          linkCode: input.linkCode,
                          tenantId: input.tenantId,
                          shouldAttemptAccountLinkingIfAllowed: shouldAttemptAccountLinking,
                          userContext: input.userContext,
                      }
            );

            if (response.status !== "OK") {
                return response;
            }

            let loginMethod: RecipeLevelUser | undefined = response.user.loginMethods.find(
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

                if (shouldCheckIfSignInIsAllowed) {
                    let isSignInAllowed = await AccountLinking.getInstance().isSignInAllowed({
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
                }

                if (shouldAttemptAccountLinking) {
                    // we do account linking only during sign in here cause during sign up,
                    // the recipe function above does account linking for us.
                    response.user = await AccountLinking.getInstance().createPrimaryUserIdOrLinkAccounts({
                        tenantId: input.tenantId,
                        user: response.user,
                        userContext: input.userContext,
                    });
                }
            }

            let isFirstFactor = session === undefined;
            if (shouldCreateSession) {
                session = await Session.createNewSession(
                    input.options.req,
                    input.options.res,
                    input.tenantId,
                    loginMethod.recipeUserId,
                    {},
                    {},
                    input.userContext
                );
            }

            if (session === undefined) {
                throw new Error("should never come here");
            }

            if (mfaInstance !== undefined) {
                let sessionRes = await mfaInstance.updateSessionAndUserAfterFactorCompletion({
                    session,
                    isFirstFactor,
                    factorId: factorId,
                    userInfoOfUserThatCompletedSignInOrUpToCompleteCurrentFactor: {
                        createdNewUser: response.createdNewRecipeUser,
                        recipeUserId: response.recipeUserId,
                        user: response.user,
                    },
                    userContext: input.userContext,
                });

                if (sessionRes.status !== "OK") {
                    return sessionRes;
                }

                let user = await getUser(response.user.id, input.userContext);

                if (user === undefined) {
                    throw new SessionError({
                        type: SessionError.UNAUTHORISED,
                        message: "Session user not found",
                    });
                }

                response.user = user;
            }

            return {
                status: "OK",
                session,
                createdNewRecipeUser: response.createdNewRecipeUser,
                user: response.user,
            };
        },
        createCodePOST: async function (input) {
            const accountInfo: { phoneNumber?: string; email?: string } = {};
            if ("email" in input) {
                accountInfo.email = input.email;
            }
            if ("phoneNumber" in input) {
                accountInfo.email = input.phoneNumber;
            }
            const mfaInstance = MultiFactorAuthRecipe.getInstance();

            let session: SessionContainerInterface | undefined = await Session.getSession(
                input.options.req,
                input.options.res,
                { sessionRequired: false, overrideGlobalClaimValidators: () => [] }
            );

            let existingUsers = await listUsersByAccountInfo(input.tenantId, accountInfo, false, input.userContext);
            existingUsers = existingUsers.filter((u) =>
                u.loginMethods.some(
                    (m) =>
                        m.recipeId === "passwordless" &&
                        (m.hasSameEmailAs(accountInfo.email) || m.hasSamePhoneNumberAs(accountInfo.phoneNumber))
                )
            );

            if (existingUsers.length === 0) {
                if (session === undefined || mfaInstance === undefined) {
                    let isSignUpAllowed = await AccountLinking.getInstance().isSignUpAllowed({
                        newUser: {
                            recipeId: "passwordless",
                            ...accountInfo,
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
                }
            } else if (existingUsers.length === 1) {
                let loginMethod: RecipeLevelUser | undefined = existingUsers[0].loginMethods.find(
                    (m) =>
                        m.recipeId === "passwordless" &&
                        (m.hasSameEmailAs(accountInfo.email) || m.hasSamePhoneNumberAs(accountInfo.phoneNumber))
                );

                if (loginMethod === undefined) {
                    throw new Error("Should never come here");
                }
                let isSignInAllowed = await AccountLinking.getInstance().isSignInAllowed({
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
            let magicLink: string | undefined = undefined;
            let userInputCode: string | undefined = undefined;
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
                logDebugMessage(`Sending passwordless login SMS to ${(input as any).phoneNumber}`);
                await input.options.smsDelivery.ingredientInterfaceImpl.sendSms({
                    type: "PASSWORDLESS_LOGIN",
                    codeLifetime: response.codeLifetime,
                    phoneNumber: (input as any).phoneNumber!,
                    preAuthSessionId: response.preAuthSessionId,
                    urlWithLinkCode: magicLink,
                    userInputCode,
                    tenantId: input.tenantId,
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
            let users = await listUsersByAccountInfo(
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
            let users = await listUsersByAccountInfo(
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
                    let magicLink: string | undefined = undefined;
                    let userInputCode: string | undefined = undefined;
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
                        logDebugMessage(`Sending passwordless login SMS to ${(input as any).phoneNumber}`);
                        await input.options.smsDelivery.ingredientInterfaceImpl.sendSms({
                            type: "PASSWORDLESS_LOGIN",
                            codeLifetime: response.codeLifetime,
                            phoneNumber: deviceInfo.phoneNumber!,
                            preAuthSessionId: response.preAuthSessionId,
                            urlWithLinkCode: magicLink,
                            userInputCode,
                            tenantId: input.tenantId,
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
