import { APIInterface, RecipeInterface } from "../";
import { logDebugMessage } from "../../../logger";
import { AuthUtils } from "../../../authUtils";
import { FactorIds } from "../../multifactorauth";
import AccountLinking from "../../accountlinking/recipe";
import EmailVerification from "../../emailverification/recipe";
import { getEnabledPwlessFactors } from "../utils";
import { getUser, listUsersByAccountInfo } from "../../..";
import { SessionContainerInterface } from "../../session/types";
import { UserContext } from "../../../types";
import { LoginMethod, User } from "../../../user";
import SessionError from "../../session/error";

export default function getAPIImplementation(): APIInterface {
    return {
        consumeCodePOST: async function (input) {
            const errorCodeMap = {
                SIGN_UP_NOT_ALLOWED:
                    "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_002)",
                SIGN_IN_NOT_ALLOWED:
                    "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_003)",
                LINKING_TO_SESSION_USER_FAILED: {
                    // We should never get an email verification error here, since pwless automatically marks the user
                    // email as verified
                    RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_017)",
                    ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_018)",
                    SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_019)",
                },
            };

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

            const recipeId = "passwordless";
            const accountInfo =
                deviceInfo.phoneNumber !== undefined
                    ? {
                          phoneNumber: deviceInfo.phoneNumber!,
                      }
                    : {
                          email: deviceInfo.email!,
                      };

            let checkCredentialsResponseProm: ReturnType<RecipeInterface["checkCode"]> | undefined;
            let checkCredentials = async () => {
                if (checkCredentialsResponseProm === undefined) {
                    checkCredentialsResponseProm = input.options.recipeImplementation.checkCode(
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
                }

                const checkCredentialsResponse = await checkCredentialsResponseProm;
                return checkCredentialsResponse.status === "OK";
            };

            const authenticatingUser = await AuthUtils.getAuthenticatingUserAndAddToCurrentTenantIfRequired({
                accountInfo,
                recipeId,
                userContext: input.userContext,
                session: input.session,
                tenantId: input.tenantId,
                checkCredentialsOnTenant: checkCredentials,
            });

            const emailVerificationInstance = EmailVerification.getInstance();
            // If we have a session and emailverification was initialized plus this code was sent to an email
            // then we check if we can/should verify this email address for the session user.
            // This helps in usecases like phone-password and emailverification-with-otp where we only want to allow linking
            // and making a user primary if they are verified, but the verification process itself involves account linking.

            // If a valid code was submitted, we can take that as the session (and the session user) having access to the email
            // which means that we can verify their email address
            if (
                accountInfo.email !== undefined &&
                input.session !== undefined &&
                emailVerificationInstance !== undefined
            ) {
                // We first load the session user, so we can check if verification is required
                // We do this first, it is better for caching if we group the post calls together (verifyIng the code and the email address)
                const sessionUser = await getUser(input.session.getUserId(), input.userContext);
                if (sessionUser === undefined) {
                    throw new SessionError({
                        type: SessionError.UNAUTHORISED,
                        message: "Session user not found",
                    });
                }

                const loginMethod = sessionUser.loginMethods.find(
                    (lm) => lm.recipeUserId.getAsString() === input.session!.getRecipeUserId().getAsString()
                );
                if (loginMethod === undefined) {
                    throw new SessionError({
                        type: SessionError.UNAUTHORISED,
                        message: "Session user and session recipeUserId is inconsistent",
                    });
                }

                // If the code was sent as an email and the authenticating user has the same email address as unverified,
                // we verify it using the emailverification recipe
                if (loginMethod.hasSameEmailAs(accountInfo.email) && !loginMethod.verified) {
                    // We first check that the submitted code is actually valid
                    if (await checkCredentials()) {
                        const tokenResponse = await emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                            {
                                tenantId: input.tenantId,
                                recipeUserId: loginMethod.recipeUserId,
                                email: accountInfo.email,
                                userContext: input.userContext,
                            }
                        );

                        if (tokenResponse.status === "OK") {
                            await emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                                tenantId: input.tenantId,
                                token: tokenResponse.token,
                                attemptAccountLinking: false, // we pass false here cause
                                // we anyway do account linking in this API after this function is
                                // called.
                                userContext: input.userContext,
                            });
                        }
                    }
                }
            }

            let factorId;
            if (deviceInfo.email !== undefined) {
                if ("userInputCode" in input) {
                    factorId = FactorIds.OTP_EMAIL;
                } else {
                    factorId = FactorIds.LINK_EMAIL;
                }
            } else {
                if ("userInputCode" in input) {
                    factorId = FactorIds.OTP_PHONE;
                } else {
                    factorId = FactorIds.LINK_PHONE;
                }
            }

            const isSignUp = authenticatingUser === undefined;
            const preAuthChecks = await AuthUtils.preAuthChecks({
                authenticatingAccountInfo: {
                    recipeId: "passwordless",
                    email: deviceInfo.email,
                    phoneNumber: deviceInfo.phoneNumber,
                },
                factorIds: [factorId],
                authenticatingUser: authenticatingUser?.user,
                isSignUp,
                isVerified: authenticatingUser?.loginMethod.verified ?? true,
                signInVerifiesLoginMethod: true,
                skipSessionUserUpdateInCore: false,
                tenantId: input.tenantId,
                userContext: input.userContext,
                session: input.session,
            });

            if (preAuthChecks.status !== "OK") {
                // On the frontend, this should show a UI of asking the user
                // to login using a different method.
                return AuthUtils.getErrorStatusResponseWithReason(
                    preAuthChecks,
                    errorCodeMap,
                    "SIGN_IN_UP_NOT_ALLOWED"
                );
            }

            if (checkCredentialsResponseProm !== undefined) {
                // We need to cast this because otherwise TS thinks that this is never updated for some reason.
                const checkCredentialsResponse = await checkCredentialsResponseProm;
                if (checkCredentialsResponse.status !== "OK") {
                    // In these cases we return early otherwise consumeCode would increase the invalidAttemptCount again
                    return checkCredentialsResponse;
                }
            }

            let response = await input.options.recipeImplementation.consumeCode(
                "deviceId" in input
                    ? {
                          preAuthSessionId: input.preAuthSessionId,
                          deviceId: input.deviceId,
                          userInputCode: input.userInputCode,
                          session: input.session,
                          tenantId: input.tenantId,
                          userContext: input.userContext,
                      }
                    : {
                          preAuthSessionId: input.preAuthSessionId,
                          linkCode: input.linkCode,
                          session: input.session,
                          tenantId: input.tenantId,
                          userContext: input.userContext,
                      }
            );

            if (
                response.status === "RESTART_FLOW_ERROR" ||
                response.status === "INCORRECT_USER_INPUT_CODE_ERROR" ||
                response.status === "EXPIRED_USER_INPUT_CODE_ERROR"
            ) {
                return response;
            }
            if (response.status !== "OK") {
                return AuthUtils.getErrorStatusResponseWithReason(response, errorCodeMap, "SIGN_IN_UP_NOT_ALLOWED");
            }

            // Here we do these checks after sign in is done cause:
            // - We first want to check if the credentials are correct first or not
            // - The above recipe function marks the email as verified
            // - Even though the above call to signInUp is state changing (it changes the email
            // of the user), it's OK to do this check here cause the preAuthChecks already checks
            // conditions related to account linking
            const postAuthChecks = await AuthUtils.postAuthChecks({
                factorId,
                isSignUp,
                authenticatedUser: response.user ?? authenticatingUser!.user,
                recipeUserId: response.recipeUserId ?? authenticatingUser!.loginMethod!.recipeUserId,
                req: input.options.req,
                res: input.options.res,
                tenantId: input.tenantId,
                userContext: input.userContext,
                session: input.session,
            });

            if (postAuthChecks.status !== "OK") {
                return AuthUtils.getErrorStatusResponseWithReason(
                    postAuthChecks,
                    errorCodeMap,
                    "SIGN_IN_UP_NOT_ALLOWED"
                );
            }

            return {
                status: "OK",
                createdNewRecipeUser: response.createdNewRecipeUser,
                user: postAuthChecks.user,
                session: postAuthChecks.session,
            };
        },
        createCodePOST: async function (input) {
            const errorCodeMap = {
                SIGN_UP_NOT_ALLOWED:
                    "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_002)",
                LINKING_TO_SESSION_USER_FAILED: {
                    SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_019)",
                },
            };
            const accountInfo: { phoneNumber?: string; email?: string } = {};
            if ("email" in input) {
                accountInfo.email = input.email;
            }
            if ("phoneNumber" in input) {
                accountInfo.phoneNumber = input.phoneNumber;
            }

            // Here we use do not use the helper from AuthUtil to check if this is going to be a sign in or up, because:
            // 1. At this point we have no way to check credentials
            // 2. We do not want to associate the relevant recipe user with the current tenant (yet)
            const userWithMatchingLoginMethod = await getPasswordlessUserByAccountInfo({ ...input, accountInfo });

            let factorIds;
            if (input.session !== undefined) {
                if (accountInfo.email !== undefined) {
                    factorIds = [FactorIds.OTP_EMAIL];
                } else {
                    factorIds = [FactorIds.OTP_PHONE];
                }
            } else {
                factorIds = getEnabledPwlessFactors(input.options.config);
                if (accountInfo.email !== undefined) {
                    factorIds = factorIds.filter((factor) =>
                        [FactorIds.OTP_EMAIL, FactorIds.LINK_EMAIL].includes(factor)
                    );
                } else {
                    factorIds = factorIds.filter((factor) =>
                        [FactorIds.OTP_PHONE, FactorIds.LINK_PHONE].includes(factor)
                    );
                }
            }

            const preAuthChecks = await AuthUtils.preAuthChecks({
                authenticatingAccountInfo: {
                    ...accountInfo,
                    recipeId: "passwordless",
                },
                isSignUp: userWithMatchingLoginMethod === undefined,
                authenticatingUser: userWithMatchingLoginMethod?.user,
                isVerified: userWithMatchingLoginMethod?.loginMethod.verified ?? true,
                signInVerifiesLoginMethod: true,
                skipSessionUserUpdateInCore: true,
                tenantId: input.tenantId,
                factorIds,
                userContext: input.userContext,
                session: input.session,
            });

            if (preAuthChecks.status !== "OK") {
                // On the frontend, this should show a UI of asking the user
                // to login using a different method.
                return AuthUtils.getErrorStatusResponseWithReason(
                    preAuthChecks,
                    errorCodeMap,
                    "SIGN_IN_UP_NOT_ALLOWED"
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
                          session: input.session,
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
                          session: input.session,
                          tenantId: input.tenantId,
                      }
            );

            if (response.status !== "OK") {
                return AuthUtils.getErrorStatusResponseWithReason(response, {}, "SIGN_IN_UP_NOT_ALLOWED");
            }

            // now we send the email / text message.
            let magicLink: string | undefined = undefined;
            let userInputCode: string | undefined = undefined;

            let flowType = input.options.config.flowType;
            if (preAuthChecks.validFactorIds.every((id) => id.startsWith("link"))) {
                flowType = "MAGIC_LINK";
            } else if (preAuthChecks.validFactorIds.every((id) => id.startsWith("otp"))) {
                flowType = "USER_INPUT_CODE";
            } else {
                flowType = "USER_INPUT_CODE_AND_MAGIC_LINK";
            }
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
                    "?preAuthSessionId=" +
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
                    isFirstFactor: preAuthChecks.isFirstFactor,
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
                    isFirstFactor: preAuthChecks.isFirstFactor,
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
                flowType: flowType,
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
            const userWithMatchingLoginMethod = await getPasswordlessUserByAccountInfo({
                ...input,
                accountInfo: deviceInfo,
            });
            const authTypeInfo = await AuthUtils.checkAuthTypeAndLinkingStatus(
                input.session,
                {
                    recipeId: "passwordless",
                    email: deviceInfo.email,
                    phoneNumber: deviceInfo.phoneNumber,
                },
                userWithMatchingLoginMethod?.user,
                true,
                input.userContext
            );

            if (authTypeInfo.status === "LINKING_TO_SESSION_USER_FAILED") {
                // This can happen in the following edge-cases:
                // 1. Either the session didn't exist during createCode or the app didn't want to link to the session user
                //  and now linking should happen (in consumeCode), but we can't make the session user primary.
                // 2. The session user was a primary after createCode, but then before resend happens, it was unlinked and
                //  another primary user was created with the same account info
                // Both of these should be rare enough that we can ask the FE to start over with createCode that does more
                // checks than we need to right here.
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

                    // This mirrors how we construct factorIds in createCodePOST
                    let factorIds;
                    if (input.session !== undefined) {
                        if (deviceInfo.email !== undefined) {
                            factorIds = [FactorIds.OTP_EMAIL];
                        } else {
                            factorIds = [FactorIds.OTP_PHONE];
                        }
                        // We do not do further filtering here, since we know the exact factor id and the fact that it was created
                        // which means it was allowed and the user is allowed to re-send it.
                        // We will execute all check when the code is consumed anyway.
                    } else {
                        factorIds = getEnabledPwlessFactors(input.options.config);
                        factorIds = await AuthUtils.filterOutInvalidFirstFactorsOrThrowIfAllAreInvalid(
                            factorIds,
                            input.tenantId,
                            false,
                            input.userContext
                        );
                    }

                    // This is correct because in createCodePOST we only allow OTP_EMAIL
                    let flowType = input.options.config.flowType;
                    if (factorIds.every((id) => id.startsWith("link"))) {
                        flowType = "MAGIC_LINK";
                    } else if (factorIds.every((id) => id.startsWith("otp"))) {
                        flowType = "USER_INPUT_CODE";
                    } else {
                        flowType = "USER_INPUT_CODE_AND_MAGIC_LINK";
                    }
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
                            "?preAuthSessionId=" +
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
                            isFirstFactor: authTypeInfo.isFirstFactor,
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
                            isFirstFactor: authTypeInfo.isFirstFactor,
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

async function getPasswordlessUserByAccountInfo(input: {
    tenantId: string;
    session?: SessionContainerInterface;
    userContext: UserContext;
    accountInfo: { phoneNumber?: string | undefined; email?: string | undefined };
}): Promise<{ user: User; loginMethod: LoginMethod } | undefined> {
    const existingUsers = await AccountLinking.getInstance().recipeInterfaceImpl.listUsersByAccountInfo({
        tenantId: input.tenantId,
        accountInfo: input.accountInfo,
        doUnionOfAccountInfo: false,
        userContext: input.userContext,
    });
    logDebugMessage(
        `getPasswordlessUserByAccountInfo got ${existingUsers.length} from core resp ${JSON.stringify(
            input.accountInfo
        )}`
    );
    const usersWithMatchingLoginMethods = existingUsers
        .map((user) => ({
            user,
            loginMethod: user.loginMethods.find(
                (lm) =>
                    lm.recipeId === "passwordless" &&
                    (lm.hasSameEmailAs(input.accountInfo.email) ||
                        lm.hasSamePhoneNumberAs(input.accountInfo.phoneNumber))
            )!,
        }))
        .filter(({ loginMethod }) => loginMethod !== undefined);

    logDebugMessage(
        `getPasswordlessUserByAccountInfo ${usersWithMatchingLoginMethods.length} has matching login methods`
    );
    if (usersWithMatchingLoginMethods.length > 1) {
        throw new Error(
            "This should never happen: multiple users exist matching the accountInfo in passwordless createCode"
        );
    }
    return usersWithMatchingLoginMethods[0];
}
