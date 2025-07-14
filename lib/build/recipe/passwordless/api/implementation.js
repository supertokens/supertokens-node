"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getAPIImplementation;
const logger_1 = require("../../../logger");
const authUtils_1 = require("../../../authUtils");
const multifactorauth_1 = require("../../multifactorauth");
const recipe_1 = __importDefault(require("../../accountlinking/recipe"));
const recipe_2 = __importDefault(require("../../emailverification/recipe"));
const utils_1 = require("../utils");
const __1 = require("../../..");
const error_1 = __importDefault(require("../../session/error"));
function getAPIImplementation() {
    return {
        consumeCodePOST: async function (input) {
            var _a, _b, _c;
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
                          phoneNumber: deviceInfo.phoneNumber,
                      }
                    : {
                          email: deviceInfo.email,
                      };
            let checkCredentialsResponseProm;
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
            const authenticatingUser = await authUtils_1.AuthUtils.getAuthenticatingUserAndAddToCurrentTenantIfRequired(
                {
                    accountInfo,
                    recipeId,
                    userContext: input.userContext,
                    session: input.session,
                    tenantId: input.tenantId,
                    checkCredentialsOnTenant: checkCredentials,
                }
            );
            const emailVerificationInstance = recipe_2.default.getInstance();
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
                const sessionUser = await (0, __1.getUser)(input.session.getUserId(), input.userContext);
                if (sessionUser === undefined) {
                    throw new error_1.default({
                        type: error_1.default.UNAUTHORISED,
                        message: "Session user not found",
                    });
                }
                const loginMethod = sessionUser.loginMethods.find(
                    (lm) => lm.recipeUserId.getAsString() === input.session.getRecipeUserId().getAsString()
                );
                if (loginMethod === undefined) {
                    throw new error_1.default({
                        type: error_1.default.UNAUTHORISED,
                        message: "Session user and session recipeUserId is inconsistent",
                    });
                }
                // If the code was sent as an email and the authenticating user has the same email address as unverified,
                // we verify it using the emailverification recipe
                if (loginMethod.hasSameEmailAs(accountInfo.email) && !loginMethod.verified) {
                    // We first check that the submitted code is actually valid
                    if (await checkCredentials()) {
                        const tokenResponse =
                            await emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken({
                                tenantId: input.tenantId,
                                recipeUserId: loginMethod.recipeUserId,
                                email: accountInfo.email,
                                userContext: input.userContext,
                            });
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
                    factorId = multifactorauth_1.FactorIds.OTP_EMAIL;
                } else {
                    factorId = multifactorauth_1.FactorIds.LINK_EMAIL;
                }
            } else {
                if ("userInputCode" in input) {
                    factorId = multifactorauth_1.FactorIds.OTP_PHONE;
                } else {
                    factorId = multifactorauth_1.FactorIds.LINK_PHONE;
                }
            }
            const isSignUp = authenticatingUser === undefined;
            const preAuthChecks = await authUtils_1.AuthUtils.preAuthChecks({
                authenticatingAccountInfo: {
                    recipeId: "passwordless",
                    email: deviceInfo.email,
                    phoneNumber: deviceInfo.phoneNumber,
                },
                factorIds: [factorId],
                authenticatingUser:
                    authenticatingUser === null || authenticatingUser === void 0 ? void 0 : authenticatingUser.user,
                isSignUp,
                isVerified:
                    (_a =
                        authenticatingUser === null || authenticatingUser === void 0
                            ? void 0
                            : authenticatingUser.loginMethod.verified) !== null && _a !== void 0
                        ? _a
                        : true,
                signInVerifiesLoginMethod: true,
                skipSessionUserUpdateInCore: false,
                tenantId: input.tenantId,
                userContext: input.userContext,
                session: input.session,
                shouldTryLinkingWithSessionUser: input.shouldTryLinkingWithSessionUser,
            });
            if (preAuthChecks.status !== "OK") {
                // On the frontend, this should show a UI of asking the user
                // to login using a different method.
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
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
                          shouldTryLinkingWithSessionUser: input.shouldTryLinkingWithSessionUser,
                          tenantId: input.tenantId,
                          userContext: input.userContext,
                      }
                    : {
                          preAuthSessionId: input.preAuthSessionId,
                          linkCode: input.linkCode,
                          session: input.session,
                          shouldTryLinkingWithSessionUser: input.shouldTryLinkingWithSessionUser,
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
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    response,
                    errorCodeMap,
                    "SIGN_IN_UP_NOT_ALLOWED"
                );
            }
            // Here we do these checks after sign in is done cause:
            // - We first want to check if the credentials are correct first or not
            // - The above recipe function marks the email as verified
            // - Even though the above call to signInUp is state changing (it changes the email
            // of the user), it's OK to do this check here cause the preAuthChecks already checks
            // conditions related to account linking
            const postAuthChecks = await authUtils_1.AuthUtils.postAuthChecks({
                factorId,
                isSignUp,
                authenticatedUser: (_b = response.user) !== null && _b !== void 0 ? _b : authenticatingUser.user,
                recipeUserId:
                    (_c = response.recipeUserId) !== null && _c !== void 0
                        ? _c
                        : authenticatingUser.loginMethod.recipeUserId,
                req: input.options.req,
                res: input.options.res,
                tenantId: input.tenantId,
                userContext: input.userContext,
                session: input.session,
            });
            if (postAuthChecks.status !== "OK") {
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
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
            var _a;
            const errorCodeMap = {
                SIGN_UP_NOT_ALLOWED:
                    "Cannot sign in / up due to security reasons. Please try a different login method or contact support. (ERR_CODE_002)",
                LINKING_TO_SESSION_USER_FAILED: {
                    SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_019)",
                },
            };
            const accountInfo = {};
            if ("email" in input) {
                accountInfo.email = input.email;
            }
            if ("phoneNumber" in input) {
                accountInfo.phoneNumber = input.phoneNumber;
            }
            // Here we use do not use the helper from AuthUtil to check if this is going to be a sign in or up, because:
            // 1. At this point we have no way to check credentials
            // 2. We do not want to associate the relevant recipe user with the current tenant (yet)
            const userWithMatchingLoginMethod = await getPasswordlessUserByAccountInfo(
                Object.assign(Object.assign({}, input), { accountInfo })
            );
            let factorIds;
            if (input.session !== undefined) {
                if (accountInfo.email !== undefined) {
                    factorIds = [multifactorauth_1.FactorIds.OTP_EMAIL];
                } else {
                    factorIds = [multifactorauth_1.FactorIds.OTP_PHONE];
                }
            } else {
                factorIds = (0, utils_1.getEnabledPwlessFactors)(input.options.config);
                if (accountInfo.email !== undefined) {
                    factorIds = factorIds.filter((factor) =>
                        [multifactorauth_1.FactorIds.OTP_EMAIL, multifactorauth_1.FactorIds.LINK_EMAIL].includes(factor)
                    );
                } else {
                    factorIds = factorIds.filter((factor) =>
                        [multifactorauth_1.FactorIds.OTP_PHONE, multifactorauth_1.FactorIds.LINK_PHONE].includes(factor)
                    );
                }
            }
            const preAuthChecks = await authUtils_1.AuthUtils.preAuthChecks({
                authenticatingAccountInfo: Object.assign(Object.assign({}, accountInfo), { recipeId: "passwordless" }),
                isSignUp: userWithMatchingLoginMethod === undefined,
                authenticatingUser:
                    userWithMatchingLoginMethod === null || userWithMatchingLoginMethod === void 0
                        ? void 0
                        : userWithMatchingLoginMethod.user,
                isVerified:
                    (_a =
                        userWithMatchingLoginMethod === null || userWithMatchingLoginMethod === void 0
                            ? void 0
                            : userWithMatchingLoginMethod.loginMethod.verified) !== null && _a !== void 0
                        ? _a
                        : true,
                signInVerifiesLoginMethod: true,
                skipSessionUserUpdateInCore: true,
                tenantId: input.tenantId,
                factorIds,
                userContext: input.userContext,
                session: input.session,
                shouldTryLinkingWithSessionUser: input.shouldTryLinkingWithSessionUser,
            });
            if (preAuthChecks.status !== "OK") {
                // On the frontend, this should show a UI of asking the user
                // to login using a different method.
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
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
                          shouldTryLinkingWithSessionUser: input.shouldTryLinkingWithSessionUser,
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
                          shouldTryLinkingWithSessionUser: input.shouldTryLinkingWithSessionUser,
                          tenantId: input.tenantId,
                      }
            );
            if (response.status !== "OK") {
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    response,
                    errorCodeMap,
                    "SIGN_IN_UP_NOT_ALLOWED"
                );
            }
            // now we send the email / text message.
            let magicLink = undefined;
            let userInputCode = undefined;
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
                (0, logger_1.logDebugMessage)(`Sending passwordless login SMS to ${input.phoneNumber}`);
                await input.options.smsDelivery.ingredientInterfaceImpl.sendSms({
                    type: "PASSWORDLESS_LOGIN",
                    isFirstFactor: preAuthChecks.isFirstFactor,
                    codeLifetime: response.codeLifetime,
                    phoneNumber: input.phoneNumber,
                    preAuthSessionId: response.preAuthSessionId,
                    urlWithLinkCode: magicLink,
                    userInputCode,
                    tenantId: input.tenantId,
                    userContext: input.userContext,
                });
            } else {
                (0, logger_1.logDebugMessage)(`Sending passwordless login email to ${input.email}`);
                await input.options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                    type: "PASSWORDLESS_LOGIN",
                    isFirstFactor: preAuthChecks.isFirstFactor,
                    email: input.email,
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
            const users = await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.listUsersByAccountInfo({
                tenantId: input.tenantId,
                accountInfo: {
                    email: input.email,
                },
                doUnionOfAccountInfo: false,
                userContext: input.userContext,
            });
            const userExists = users.some((u) =>
                u.loginMethods.some((lm) => lm.recipeId === "passwordless" && lm.hasSameEmailAs(input.email))
            );
            return {
                exists: userExists,
                status: "OK",
            };
        },
        phoneNumberExistsGET: async function (input) {
            let users = await (0, __1.listUsersByAccountInfo)(
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
            const userWithMatchingLoginMethod = await getPasswordlessUserByAccountInfo(
                Object.assign(Object.assign({}, input), { accountInfo: deviceInfo })
            );
            const authTypeInfo = await authUtils_1.AuthUtils.checkAuthTypeAndLinkingStatus(
                input.session,
                input.shouldTryLinkingWithSessionUser,
                {
                    recipeId: "passwordless",
                    email: deviceInfo.email,
                    phoneNumber: deviceInfo.phoneNumber,
                },
                userWithMatchingLoginMethod === null || userWithMatchingLoginMethod === void 0
                    ? void 0
                    : userWithMatchingLoginMethod.user,
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
                    let magicLink = undefined;
                    let userInputCode = undefined;
                    // This mirrors how we construct factorIds in createCodePOST
                    let factorIds;
                    if (!authTypeInfo.isFirstFactor) {
                        if (deviceInfo.email !== undefined) {
                            factorIds = [multifactorauth_1.FactorIds.OTP_EMAIL];
                        } else {
                            factorIds = [multifactorauth_1.FactorIds.OTP_PHONE];
                        }
                        // We do not do further filtering here, since we know the exact factor id and the fact that it was created
                        // which means it was allowed and the user is allowed to re-send it.
                        // We will execute all check when the code is consumed anyway.
                    } else {
                        factorIds = (0, utils_1.getEnabledPwlessFactors)(input.options.config);
                        factorIds = await authUtils_1.AuthUtils.filterOutInvalidFirstFactorsOrThrowIfAllAreInvalid(
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
                        (0, logger_1.logDebugMessage)(`Sending passwordless login SMS to ${input.phoneNumber}`);
                        await input.options.smsDelivery.ingredientInterfaceImpl.sendSms({
                            type: "PASSWORDLESS_LOGIN",
                            isFirstFactor: authTypeInfo.isFirstFactor,
                            codeLifetime: response.codeLifetime,
                            phoneNumber: deviceInfo.phoneNumber,
                            preAuthSessionId: response.preAuthSessionId,
                            urlWithLinkCode: magicLink,
                            userInputCode,
                            tenantId: input.tenantId,
                            userContext: input.userContext,
                        });
                    } else {
                        (0, logger_1.logDebugMessage)(`Sending passwordless login email to ${deviceInfo.email}`);
                        await input.options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                            type: "PASSWORDLESS_LOGIN",
                            isFirstFactor: authTypeInfo.isFirstFactor,
                            email: deviceInfo.email,
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
async function getPasswordlessUserByAccountInfo(input) {
    const existingUsers = await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.listUsersByAccountInfo({
        tenantId: input.tenantId,
        accountInfo: input.accountInfo,
        doUnionOfAccountInfo: false,
        userContext: input.userContext,
    });
    (0, logger_1.logDebugMessage)(
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
            ),
        }))
        .filter(({ loginMethod }) => loginMethod !== undefined);
    (0, logger_1.logDebugMessage)(
        `getPasswordlessUserByAccountInfo ${usersWithMatchingLoginMethods.length} has matching login methods`
    );
    if (usersWithMatchingLoginMethods.length > 1) {
        throw new Error(
            "This should never happen: multiple users exist matching the accountInfo in passwordless createCode"
        );
    }
    return usersWithMatchingLoginMethods[0];
}
