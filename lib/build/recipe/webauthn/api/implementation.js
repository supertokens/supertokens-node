"use strict";
var __rest =
    (this && this.__rest) ||
    function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
            }
        return t;
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getAPIImplementation;
const recipe_1 = __importDefault(require("../../accountlinking/recipe"));
const recipe_2 = __importDefault(require("../../emailverification/recipe"));
const authUtils_1 = require("../../../authUtils");
const utils_1 = require("../../thirdparty/utils");
const constants_1 = require("../constants");
const recipeUserId_1 = __importDefault(require("../../../recipeUserId"));
const utils_2 = require("../utils");
const logger_1 = require("../../../logger");
const __1 = require("../../..");
const multifactorauth_1 = __importDefault(require("../../multifactorauth"));
const recipe_3 = __importDefault(require("../../multifactorauth/recipe"));
function getAPIImplementation() {
    return {
        registerOptionsPOST: async function (_a) {
            var { tenantId, options, userContext } = _a,
                props = __rest(_a, ["tenantId", "options", "userContext"]);
            const relyingPartyId = await options.config.getRelyingPartyId({
                tenantId,
                request: options.req,
                userContext,
            });
            const relyingPartyName = await options.config.getRelyingPartyName({
                tenantId,
                request: options.req,
                userContext,
            });
            const origin = await options.config.getOrigin({
                tenantId,
                request: options.req,
                userContext,
            });
            const timeout = constants_1.DEFAULT_REGISTER_OPTIONS_TIMEOUT;
            const attestation = constants_1.DEFAULT_REGISTER_OPTIONS_ATTESTATION;
            const residentKey = constants_1.DEFAULT_REGISTER_OPTIONS_RESIDENT_KEY;
            const userVerification = constants_1.DEFAULT_REGISTER_OPTIONS_USER_VERIFICATION;
            const userPresence = constants_1.DEFAULT_REGISTER_OPTIONS_USER_PRESENCE;
            const supportedAlgorithmIds = constants_1.DEFAULT_REGISTER_OPTIONS_SUPPORTED_ALGORITHM_IDS;
            const response = await options.recipeImplementation.registerOptions(
                Object.assign(Object.assign({}, props), {
                    displayName: "displayName" in props ? props.displayName : undefined,
                    attestation,
                    residentKey,
                    userVerification,
                    userPresence,
                    origin,
                    relyingPartyId,
                    relyingPartyName,
                    timeout,
                    tenantId,
                    userContext,
                    supportedAlgorithmIds,
                })
            );
            if (response.status !== "OK") {
                return response;
            }
            return {
                status: "OK",
                webauthnGeneratedOptionsId: response.webauthnGeneratedOptionsId,
                createdAt: response.createdAt,
                expiresAt: response.expiresAt,
                challenge: response.challenge,
                timeout: response.timeout,
                attestation: response.attestation,
                pubKeyCredParams: response.pubKeyCredParams,
                excludeCredentials: response.excludeCredentials,
                rp: response.rp,
                user: response.user,
                authenticatorSelection: response.authenticatorSelection,
            };
        },
        signInOptionsPOST: async function ({ tenantId, options, userContext }) {
            const relyingPartyId = await options.config.getRelyingPartyId({
                tenantId,
                request: options.req,
                userContext,
            });
            const relyingPartyName = await options.config.getRelyingPartyName({
                tenantId,
                request: options.req,
                userContext,
            });
            // use this to get the full url instead of only the domain url
            const origin = await options.config.getOrigin({
                tenantId,
                request: options.req,
                userContext,
            });
            const timeout = constants_1.DEFAULT_SIGNIN_OPTIONS_TIMEOUT;
            const userVerification = constants_1.DEFAULT_SIGNIN_OPTIONS_USER_VERIFICATION;
            const userPresence = constants_1.DEFAULT_SIGNIN_OPTIONS_USER_PRESENCE;
            const response = await options.recipeImplementation.signInOptions({
                userVerification,
                userPresence,
                origin,
                relyingPartyId,
                relyingPartyName,
                timeout,
                tenantId,
                userContext,
            });
            if (response.status !== "OK") {
                return response;
            }
            return {
                status: "OK",
                webauthnGeneratedOptionsId: response.webauthnGeneratedOptionsId,
                rpId: relyingPartyId,
                createdAt: response.createdAt,
                expiresAt: response.expiresAt,
                challenge: response.challenge,
                timeout: response.timeout,
                userVerification: response.userVerification,
            };
        },
        signUpPOST: async function ({
            webauthnGeneratedOptionsId,
            credential,
            tenantId,
            session,
            shouldTryLinkingWithSessionUser,
            options,
            userContext,
        }) {
            const errorCodeMap = {
                SIGN_UP_NOT_ALLOWED:
                    "Cannot sign up due to security reasons. Please try logging in, use a different login method or contact support. (ERR_CODE_025)",
                LINKING_TO_SESSION_USER_FAILED: {
                    EMAIL_VERIFICATION_REQUIRED:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_026)",
                    RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_027)",
                    ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_028)",
                    SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_029)",
                },
            };
            const generatedOptions = await options.recipeImplementation.getGeneratedOptions({
                webauthnGeneratedOptionsId,
                tenantId,
                userContext,
            });
            if (generatedOptions.status !== "OK") {
                return generatedOptions;
            }
            const email = generatedOptions.email;
            // NOTE: Following checks will likely never throw an error as the
            // check for type is done in a parent function but they are kept
            // here to be on the safe side.
            if (!email) {
                throw new Error(
                    "Should never come here since we already check that the email value is a string in validateEmailAddress"
                );
            }
            const preAuthCheckRes = await authUtils_1.AuthUtils.preAuthChecks({
                authenticatingAccountInfo: {
                    recipeId: "webauthn",
                    email,
                },
                factorIds: [multifactorauth_1.default.FactorIds.WEBAUTHN],
                isSignUp: true,
                isVerified: (0, utils_1.isFakeEmail)(email),
                signInVerifiesLoginMethod: false,
                skipSessionUserUpdateInCore: false,
                authenticatingUser: undefined, // since this a sign up, this is undefined
                tenantId,
                userContext,
                session,
                shouldTryLinkingWithSessionUser,
            });
            if (preAuthCheckRes.status === "SIGN_UP_NOT_ALLOWED") {
                const conflictingUsers = await recipe_1.default
                    .getInstanceOrThrowError()
                    .recipeInterfaceImpl.listUsersByAccountInfo({
                        tenantId,
                        accountInfo: {
                            email,
                        },
                        doUnionOfAccountInfo: false,
                        userContext,
                    });
                if (
                    conflictingUsers.some((u) =>
                        u.loginMethods.some((lm) => lm.recipeId === "webauthn" && lm.hasSameEmailAs(email))
                    )
                ) {
                    return {
                        status: "EMAIL_ALREADY_EXISTS_ERROR",
                    };
                }
            }
            if (preAuthCheckRes.status !== "OK") {
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    preAuthCheckRes,
                    errorCodeMap,
                    "SIGN_UP_NOT_ALLOWED"
                );
            }
            if ((0, utils_1.isFakeEmail)(email) && preAuthCheckRes.isFirstFactor) {
                // Fake emails cannot be used as a first factor
                return {
                    status: "EMAIL_ALREADY_EXISTS_ERROR",
                };
            }
            // we are using the email from the register options
            const signUpResponse = await options.recipeImplementation.signUp({
                webauthnGeneratedOptionsId,
                credential,
                tenantId,
                session,
                shouldTryLinkingWithSessionUser,
                userContext,
            });
            if (
                signUpResponse.status === "EMAIL_ALREADY_EXISTS_ERROR" ||
                signUpResponse.status === "INVALID_CREDENTIALS_ERROR" ||
                signUpResponse.status === "INVALID_OPTIONS_ERROR" ||
                signUpResponse.status === "OPTIONS_NOT_FOUND_ERROR"
            ) {
                // we should only return the status, because the core also adds a reason for most of these errors
                return { status: signUpResponse.status };
            } else if (signUpResponse.status === "INVALID_AUTHENTICATOR_ERROR") {
                return {
                    status: "INVALID_AUTHENTICATOR_ERROR",
                    reason: signUpResponse.reason,
                };
            } else if (signUpResponse.status !== "OK") {
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    signUpResponse,
                    errorCodeMap,
                    "SIGN_UP_NOT_ALLOWED"
                );
            }
            const postAuthChecks = await authUtils_1.AuthUtils.postAuthChecks({
                authenticatedUser: signUpResponse.user,
                recipeUserId: signUpResponse.recipeUserId,
                isSignUp: true,
                factorId: "webauthn",
                session,
                req: options.req,
                res: options.res,
                tenantId,
                userContext,
            });
            if (postAuthChecks.status !== "OK") {
                // It should never actually come here, but we do it cause of consistency.
                // If it does come here (in case there is a bug), it would make this func throw
                // anyway, cause there is no SIGN_IN_NOT_ALLOWED in the errorCodeMap.
                authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    postAuthChecks,
                    errorCodeMap,
                    "SIGN_UP_NOT_ALLOWED"
                );
                throw new Error("This should never happen");
            }
            return {
                status: "OK",
                session: postAuthChecks.session,
                user: postAuthChecks.user,
            };
        },
        signInPOST: async function ({
            webauthnGeneratedOptionsId,
            credential,
            tenantId,
            session,
            shouldTryLinkingWithSessionUser,
            options,
            userContext,
        }) {
            var _a;
            const errorCodeMap = {
                SIGN_IN_NOT_ALLOWED:
                    "Cannot sign in due to security reasons. Please try recovering your account, use a different login method or contact support. (ERR_CODE_030)",
                LINKING_TO_SESSION_USER_FAILED: {
                    EMAIL_VERIFICATION_REQUIRED:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_031)",
                    RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_032)",
                    ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_033)",
                    SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_034)",
                },
            };
            const recipeId = "webauthn";
            const verifyResult = await options.recipeImplementation.verifyCredentials({
                credential,
                webauthnGeneratedOptionsId,
                tenantId,
                userContext,
            });
            if (verifyResult.status !== "OK") {
                return { status: "INVALID_CREDENTIALS_ERROR" };
            }
            const generatedOptions = await options.recipeImplementation.getGeneratedOptions({
                webauthnGeneratedOptionsId,
                tenantId,
                userContext,
            });
            if (generatedOptions.status !== "OK") {
                return {
                    status: "INVALID_CREDENTIALS_ERROR",
                };
            }
            const checkCredentialsOnTenant = async () => {
                return true;
            };
            const accountInfo = { webauthn: { credentialId: credential.id } };
            const authenticatingUser = await authUtils_1.AuthUtils.getAuthenticatingUserAndAddToCurrentTenantIfRequired(
                {
                    accountInfo,
                    userContext,
                    recipeId,
                    session,
                    tenantId,
                    checkCredentialsOnTenant,
                }
            );
            const isVerified = authenticatingUser !== undefined && authenticatingUser.loginMethod.verified;
            // We check this before preAuthChecks, because that function assumes that if isSignUp is false,
            // then authenticatingUser is defined. While it wouldn't technically cause any problems with
            // the implementation of that function, this way we can guarantee that either isSignInAllowed or
            // isSignUpAllowed will be called as expected.
            if (authenticatingUser === undefined) {
                return {
                    status: "INVALID_CREDENTIALS_ERROR",
                };
            }
            // we find the email of the user that has the same credentialId as the one we are verifying
            const email =
                (_a = authenticatingUser.user.loginMethods.find((lm) => {
                    var _a;
                    return (
                        lm.recipeId === "webauthn" &&
                        ((_a = lm.webauthn) === null || _a === void 0
                            ? void 0
                            : _a.credentialIds.includes(credential.id))
                    );
                })) === null || _a === void 0
                    ? void 0
                    : _a.email;
            if (email === undefined) {
                throw new Error("This should never happen: webauthn user has no email");
            }
            const preAuthChecks = await authUtils_1.AuthUtils.preAuthChecks({
                authenticatingAccountInfo: {
                    recipeId,
                    email,
                },
                factorIds: [multifactorauth_1.default.FactorIds.WEBAUTHN],
                isSignUp: false,
                authenticatingUser:
                    authenticatingUser === null || authenticatingUser === void 0 ? void 0 : authenticatingUser.user,
                isVerified,
                signInVerifiesLoginMethod: false,
                skipSessionUserUpdateInCore: false,
                tenantId,
                userContext,
                session,
                shouldTryLinkingWithSessionUser,
            });
            if (preAuthChecks.status === "SIGN_IN_NOT_ALLOWED") {
                throw new Error("This should never happen: pre-auth checks should not fail for sign in");
            }
            if (preAuthChecks.status !== "OK") {
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    preAuthChecks,
                    errorCodeMap,
                    "SIGN_IN_NOT_ALLOWED"
                );
            }
            if ((0, utils_1.isFakeEmail)(email) && preAuthChecks.isFirstFactor) {
                // Fake emails cannot be used as a first factor
                return {
                    status: "INVALID_CREDENTIALS_ERROR",
                };
            }
            const signInResponse = await options.recipeImplementation.signIn({
                webauthnGeneratedOptionsId,
                credential,
                session,
                shouldTryLinkingWithSessionUser,
                tenantId,
                userContext,
            });
            if (signInResponse.status === "INVALID_CREDENTIALS_ERROR") {
                return signInResponse;
            }
            if (
                signInResponse.status === "INVALID_OPTIONS_ERROR" ||
                signInResponse.status === "INVALID_AUTHENTICATOR_ERROR" ||
                signInResponse.status === "CREDENTIAL_NOT_FOUND_ERROR" ||
                signInResponse.status === "UNKNOWN_USER_ID_ERROR" ||
                signInResponse.status === "OPTIONS_NOT_FOUND_ERROR"
            ) {
                return {
                    status: "INVALID_CREDENTIALS_ERROR",
                };
            } else if (signInResponse.status !== "OK") {
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    signInResponse,
                    errorCodeMap,
                    "SIGN_IN_NOT_ALLOWED"
                );
            }
            const postAuthChecks = await authUtils_1.AuthUtils.postAuthChecks({
                authenticatedUser: signInResponse.user,
                recipeUserId: signInResponse.recipeUserId,
                isSignUp: false,
                factorId: recipeId,
                session,
                req: options.req,
                res: options.res,
                tenantId,
                userContext,
            });
            if (postAuthChecks.status !== "OK") {
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    postAuthChecks,
                    errorCodeMap,
                    "SIGN_IN_NOT_ALLOWED"
                );
            }
            return {
                status: "OK",
                session: postAuthChecks.session,
                user: postAuthChecks.user,
            };
        },
        emailExistsGET: async function ({ email, tenantId, userContext }) {
            // even if the above returns true, we still need to check if there
            // exists an webauthn user with the same email cause the function
            // above does not check for that.
            const users = await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.listUsersByAccountInfo({
                tenantId,
                accountInfo: {
                    email,
                },
                doUnionOfAccountInfo: false,
                userContext,
            });
            const webauthnUserExists =
                users.find((u) => {
                    return (
                        u.loginMethods.find((lm) => lm.recipeId === "webauthn" && lm.hasSameEmailAs(email)) !==
                        undefined
                    );
                }) !== undefined;
            return {
                status: "OK",
                exists: webauthnUserExists,
            };
        },
        generateRecoverAccountTokenPOST: async function ({ email, tenantId, options, userContext }) {
            // NOTE: Check for email being a non-string value. This check will likely
            // never evaluate to `true` as there is an upper-level check for the type
            // in validation but kept here to be safe.
            if (typeof email !== "string") {
                throw new Error(
                    "Should never come here since we already check that the email value is a string in validateFormFieldsOrThrowError"
                );
            }
            // this function will be reused in different parts of the flow below..
            async function generateAndSendRecoverAccountToken(primaryUserId, recipeUserId) {
                // the user ID here can be primary or recipe level.
                let response = await options.recipeImplementation.generateRecoverAccountToken({
                    tenantId,
                    userId: recipeUserId === undefined ? primaryUserId : recipeUserId.getAsString(),
                    email,
                    userContext,
                });
                if (response.status === "UNKNOWN_USER_ID_ERROR") {
                    (0, logger_1.logDebugMessage)(
                        `Recover account email not sent, unknown user id: ${
                            recipeUserId === undefined ? primaryUserId : recipeUserId.getAsString()
                        }`
                    );
                    return {
                        status: "OK",
                    };
                }
                const recoverAccountLink = (0, utils_2.getRecoverAccountLink)({
                    appInfo: options.appInfo,
                    token: response.token,
                    tenantId,
                    request: options.req,
                    userContext,
                });
                (0, logger_1.logDebugMessage)(`Sending recover account email to ${email}`);
                await options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                    tenantId,
                    type: "RECOVER_ACCOUNT",
                    user: {
                        id: primaryUserId,
                        recipeUserId,
                        email,
                    },
                    recoverAccountLink,
                    userContext,
                });
                return {
                    status: "OK",
                };
            }
            //check if primaryUserId is linked with this email
            const users = await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.listUsersByAccountInfo({
                tenantId,
                accountInfo: {
                    email,
                },
                doUnionOfAccountInfo: false,
                userContext,
            });
            // we find the recipe user ID of the webauthn account from the user's list
            // for later use.
            let webauthnAccount = undefined;
            for (let i = 0; i < users.length; i++) {
                const webauthnAccountTmp = users[i].loginMethods.find(
                    (l) => l.recipeId === "webauthn" && l.hasSameEmailAs(email)
                );
                if (webauthnAccountTmp !== undefined) {
                    webauthnAccount = webauthnAccountTmp;
                    break;
                }
            }
            // we find the primary user ID from the user's list for later use.
            const primaryUserAssociatedWithEmail = users.find((u) => u.isPrimaryUser);
            // first we check if there even exists a primary user that has the input email
            // if not, then we do the regular flow for recover account
            if (primaryUserAssociatedWithEmail === undefined) {
                if (webauthnAccount === undefined) {
                    (0, logger_1.logDebugMessage)(`Recover account email not sent, unknown user email: ${email}`);
                    return {
                        status: "OK",
                    };
                }
                return await generateAndSendRecoverAccountToken(
                    webauthnAccount.recipeUserId.getAsString(),
                    webauthnAccount.recipeUserId
                );
            }
            // Next we check if there is any login method in which the input email is verified.
            // If that is the case, then it's proven that the user owns the email and we can
            // trust linking of the webauthn account.
            const emailVerified =
                primaryUserAssociatedWithEmail.loginMethods.find((lm) => {
                    return lm.hasSameEmailAs(email) && lm.verified;
                }) !== undefined;
            // finally, we check if the primary user has any other email / phone number
            // associated with this account - and if it does, then it means that
            // there is a risk of account takeover, so we do not allow the token to be generated
            const hasOtherEmailOrPhone =
                primaryUserAssociatedWithEmail.loginMethods.find((lm) => {
                    // we do the extra undefined check below cause
                    // hasSameEmailAs returns false if the lm.email is undefined, and
                    // we want to check that the email is different as opposed to email
                    // not existing in lm.
                    return (lm.email !== undefined && !lm.hasSameEmailAs(email)) || lm.phoneNumber !== undefined;
                }) !== undefined;
            if (!emailVerified && hasOtherEmailOrPhone) {
                return {
                    status: "RECOVER_ACCOUNT_NOT_ALLOWED",
                    reason: "Recover account link was not created because of account take over risk. Please contact support. (ERR_CODE_001)",
                };
            }
            const shouldDoAccountLinkingResponse = await recipe_1.default
                .getInstanceOrThrowError()
                .config.shouldDoAutomaticAccountLinking(
                    webauthnAccount !== undefined
                        ? webauthnAccount
                        : {
                              recipeId: "webauthn",
                              email,
                          },
                    primaryUserAssociatedWithEmail,
                    undefined,
                    tenantId,
                    userContext
                );
            // Now we need to check that if there exists any webauthn user at all
            // for the input email. If not, then it implies that when the token is consumed,
            // then we will create a new user - so we should only generate the token if
            // the criteria for the new user is met.
            if (webauthnAccount === undefined) {
                // this means that there is no webauthn user that exists for the input email.
                // So we check for the sign up condition and only go ahead if that condition is
                // met.
                // But first we must check if account linking is enabled at all - cause if it's
                // not, then the new webauthn user that will be created in recover account
                // code consume cannot be linked to the primary user - therefore, we should
                // not generate a recover account reset token
                if (!shouldDoAccountLinkingResponse.shouldAutomaticallyLink) {
                    (0, logger_1.logDebugMessage)(
                        `Recover account email not sent, since webauthn user didn't exist, and account linking not enabled`
                    );
                    return {
                        status: "OK",
                    };
                }
                const isSignUpAllowed = await recipe_1.default.getInstanceOrThrowError().isSignUpAllowed({
                    newUser: {
                        recipeId: "webauthn",
                        email,
                    },
                    isVerified: true, // cause when the token is consumed, we will mark the email as verified
                    session: undefined,
                    tenantId,
                    userContext,
                });
                if (isSignUpAllowed) {
                    // notice that we pass in the primary user ID here. This means that
                    // we will be creating a new webauthn account when the token
                    // is consumed and linking it to this primary user.
                    return await generateAndSendRecoverAccountToken(primaryUserAssociatedWithEmail.id, undefined);
                } else {
                    (0, logger_1.logDebugMessage)(
                        `Recover account email not sent, isSignUpAllowed returned false for email: ${email}`
                    );
                    return {
                        status: "OK",
                    };
                }
            }
            // At this point, we know that some webauthn user exists with this email
            // and also some primary user ID exist. We now need to find out if they are linked
            // together or not. If they are linked together, then we can just generate the token
            // else we check for more security conditions (since we will be linking them post token generation)
            const areTheTwoAccountsLinked =
                primaryUserAssociatedWithEmail.loginMethods.find((lm) => {
                    return lm.recipeUserId.getAsString() === webauthnAccount.recipeUserId.getAsString();
                }) !== undefined;
            if (areTheTwoAccountsLinked) {
                return await generateAndSendRecoverAccountToken(
                    primaryUserAssociatedWithEmail.id,
                    webauthnAccount.recipeUserId
                );
            }
            // Here we know that the two accounts are NOT linked. We now need to check for an
            // extra security measure here to make sure that the input email in the primary user
            // is verified, and if not, we need to make sure that there is no other email / phone number
            // associated with the primary user account. If there is, then we do not proceed.
            /*
            This security measure helps prevent the following attack:
            An attacker has email A and they create an account using TP and it doesn't matter if A is verified or not. Now they create another account using the webauthn with email A and verifies it. Both these accounts are linked. Now the attacker changes the email for webauthn recipe to B which makes the webauthn account unverified, but it's still linked.

            If the real owner of B tries to signup using webauthn, it will say that the account already exists so they may try to recover the account which should be denied because then they will end up getting access to attacker's account and verify the webauthn account.

            The problem with this situation is if the webauthn account is verified, it will allow further sign-ups with email B which will also be linked to this primary account (that the attacker had created with email A).

            It is important to realize that the attacker had created another account with A because if they hadn't done that, then they wouldn't have access to this account after the real user recovers the account which is why it is important to check there is another non-webauthn account linked to the primary such that the email is not the same as B.

            Exception to the above is that, if there is a third recipe account linked to the above two accounts and has B as verified, then we should allow recover account token generation because user has already proven that the owns the email B
            */
            // But first, this only matters it the user cares about checking for email verification status..
            if (!shouldDoAccountLinkingResponse.shouldAutomaticallyLink) {
                // here we will go ahead with the token generation cause
                // even when the token is consumed, we will not be linking the accounts
                // so no need to check for anything
                return await generateAndSendRecoverAccountToken(
                    webauthnAccount.recipeUserId.getAsString(),
                    webauthnAccount.recipeUserId
                );
            }
            if (!shouldDoAccountLinkingResponse.shouldRequireVerification) {
                // the checks below are related to email verification, and if the user
                // does not care about that, then we should just continue with token generation
                return await generateAndSendRecoverAccountToken(
                    primaryUserAssociatedWithEmail.id,
                    webauthnAccount.recipeUserId
                );
            }
            return await generateAndSendRecoverAccountToken(
                primaryUserAssociatedWithEmail.id,
                webauthnAccount.recipeUserId
            );
        },
        recoverAccountPOST: async function ({
            webauthnGeneratedOptionsId,
            credential,
            token,
            tenantId,
            options,
            userContext,
        }) {
            async function markEmailAsVerified(recipeUserId, email) {
                const emailVerificationInstance = recipe_2.default.getInstance();
                if (emailVerificationInstance) {
                    const tokenResponse =
                        await emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken({
                            tenantId,
                            recipeUserId,
                            email,
                            userContext,
                        });
                    if (tokenResponse.status === "OK") {
                        await emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                            tenantId,
                            token: tokenResponse.token,
                            attemptAccountLinking: false, // we pass false here cause
                            // we anyway do account linking in this API after this function is
                            // called.
                            userContext,
                        });
                    }
                }
            }
            async function doRegisterCredentialAndVerifyEmailAndTryLinkIfNotPrimary(recipeUserId) {
                const updateResponse = await options.recipeImplementation.registerCredential({
                    recipeUserId: recipeUserId.getAsString(),
                    webauthnGeneratedOptionsId,
                    credential,
                    userContext,
                });
                if (updateResponse.status === "INVALID_AUTHENTICATOR_ERROR") {
                    // This should happen only cause of a race condition where the user
                    // might be deleted before token creation and consumption.
                    return {
                        status: "INVALID_AUTHENTICATOR_ERROR",
                        reason: updateResponse.reason,
                    };
                } else if (
                    updateResponse.status === "INVALID_OPTIONS_ERROR" ||
                    updateResponse.status === "OPTIONS_NOT_FOUND_ERROR" ||
                    updateResponse.status === "INVALID_CREDENTIALS_ERROR"
                ) {
                    return {
                        status: updateResponse.status,
                    };
                } else {
                    // status: "OK"
                    // If the update was successful, we try to mark the email as verified.
                    // We do this because we assume that the recover account token was delivered by email (and to the appropriate email address)
                    // so consuming it means that the user actually has access to the emails we send.
                    // We only do this if the recover account was successful, otherwise the following scenario is possible:
                    // 1. User M: signs up using the email of user V with their own credential. They can't validate the email, because it is not their own.
                    // 2. User A: tries signing up but sees the email already exists message
                    // 3. User A: recovers the account, but somehow this fails
                    // If we verified (and linked) the existing user with the original credential, User M would get access to the current user and any linked users.
                    await markEmailAsVerified(recipeUserId, emailForWhomTokenWasGenerated);
                    // We refresh the user information here, because the verification status may be updated, which is used during linking.
                    const updatedUserAfterEmailVerification = await (0, __1.getUser)(
                        recipeUserId.getAsString(),
                        userContext
                    );
                    if (updatedUserAfterEmailVerification === undefined) {
                        throw new Error("Should never happen - user deleted after during recover account");
                    }
                    if (updatedUserAfterEmailVerification.isPrimaryUser) {
                        // If the user is already primary, we do not need to do any linking
                        return {
                            status: "OK",
                            email: emailForWhomTokenWasGenerated,
                            user: updatedUserAfterEmailVerification,
                        };
                    }
                    // If the user was not primary:
                    // Now we try and link the accounts.
                    // The function below will try and also create a primary user of the new account, this can happen if:
                    // 1. the user was unverified and linking requires verification
                    // We do not take try linking by session here, since this is supposed to be called without a session
                    // Still, the session object is passed around because it is a required input for shouldDoAutomaticAccountLinking
                    const linkRes = await recipe_1.default
                        .getInstanceOrThrowError()
                        .tryLinkingByAccountInfoOrCreatePrimaryUser({
                            tenantId,
                            inputUser: updatedUserAfterEmailVerification,
                            session: undefined,
                            userContext,
                        });
                    const userAfterWeTriedLinking =
                        linkRes.status === "OK" ? linkRes.user : updatedUserAfterEmailVerification;
                    return {
                        status: "OK",
                        email: emailForWhomTokenWasGenerated,
                        user: userAfterWeTriedLinking,
                    };
                }
            }
            const tokenConsumptionResponse = await options.recipeImplementation.consumeRecoverAccountToken({
                token,
                tenantId,
                userContext,
            });
            if (tokenConsumptionResponse.status === "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR") {
                return tokenConsumptionResponse;
            }
            const userIdForWhomTokenWasGenerated = tokenConsumptionResponse.userId;
            const emailForWhomTokenWasGenerated = tokenConsumptionResponse.email;
            const existingUser = await (0, __1.getUser)(tokenConsumptionResponse.userId, userContext);
            if (existingUser === undefined) {
                // This should happen only cause of a race condition where the user
                // might be deleted before token creation and consumption.
                // Also note that this being undefined doesn't mean that the webauthn
                // user does not exist, but it means that there is no recipe or primary user
                // for whom the token was generated.
                return {
                    status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR",
                };
            }
            // We start by checking if the existingUser is a primary user or not. If it is,
            // then we will try and create a new webauthn user and link it to the primary user (if required)
            if (existingUser.isPrimaryUser) {
                // If this user contains an webauthn account for whom the token was generated,
                // then we update that user's credential.
                const webauthnUserIsLinkedToExistingUser =
                    existingUser.loginMethods.find((lm) => {
                        // we check based on user ID and not email because the only time
                        // the primary user ID is used for token generation is if the webauthn
                        // user did not exist - in which case the value of webauthnUserIsLinkedToExistingUser will
                        // resolve to false anyway, and that's what we want.
                        // there is an edge case where if the webauthn recipe user was created
                        // after the recover account token generation, and it was linked to the
                        // primary user id (userIdForWhomTokenWasGenerated), in this case,
                        // we still don't allow credntials update, cause the user should try again
                        // and the token should be regenerated for the right recipe user.
                        return (
                            lm.recipeUserId.getAsString() === userIdForWhomTokenWasGenerated &&
                            lm.recipeId === "webauthn"
                        );
                    }) !== undefined;
                if (webauthnUserIsLinkedToExistingUser) {
                    return doRegisterCredentialAndVerifyEmailAndTryLinkIfNotPrimary(
                        new recipeUserId_1.default(userIdForWhomTokenWasGenerated)
                    );
                } else {
                    // this means that the existingUser does not have an webauthn user associated
                    // with it. It could now mean that no webauthn user exists, or it could mean that
                    // the the webauthn user exists, but it's not linked to the current account.
                    // If no webauthn user doesn't exists, we will create one, and link it to the existing account.
                    // If webauthn user exists, then it means there is some race condition cause
                    // then the token should have been generated for that user instead of the primary user,
                    // and it shouldn't have come into this branch. So we can simply send a recover account
                    // invalid error and the user can try again.
                    // NOTE: We do not ask the dev if we should do account linking or not here
                    // cause we already have asked them this when generating an recover account reset token.
                    // In the edge case that the dev changes account linking allowance from true to false
                    // when it comes here, only a new recipe user id will be created and not linked
                    // cause createPrimaryUserIdOrLinkAccounts will disallow linking. This doesn't
                    // really cause any security issue.
                    const createUserResponse = await options.recipeImplementation.createNewRecipeUser({
                        tenantId,
                        webauthnGeneratedOptionsId,
                        credential,
                        userContext,
                    });
                    if (
                        createUserResponse.status === "INVALID_CREDENTIALS_ERROR" ||
                        createUserResponse.status === "OPTIONS_NOT_FOUND_ERROR" ||
                        createUserResponse.status === "INVALID_OPTIONS_ERROR" ||
                        createUserResponse.status === "INVALID_AUTHENTICATOR_ERROR"
                    ) {
                        return createUserResponse;
                    } else if (createUserResponse.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                        // this means that the user already existed and we can just return an invalid
                        // token (see the above comment)
                        return {
                            status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR",
                        };
                    } else {
                        // we mark the email as verified because recover account also requires
                        // access to the email to work.. This has a good side effect that
                        // any other login method with the same email in existingAccount will also get marked
                        // as verified.
                        await markEmailAsVerified(
                            createUserResponse.user.loginMethods[0].recipeUserId,
                            tokenConsumptionResponse.email
                        );
                        const updatedUser = await (0, __1.getUser)(createUserResponse.user.id, userContext);
                        if (updatedUser === undefined) {
                            throw new Error("Should never happen - user deleted after during recover account");
                        }
                        createUserResponse.user = updatedUser;
                        // Now we try and link the accounts. The function below will try and also
                        // create a primary user of the new account, and if it does that, it's OK..
                        // But in most cases, it will end up linking to existing account since the
                        // email is shared.
                        // We do not take try linking by session here, since this is supposed to be called without a session
                        // Still, the session object is passed around because it is a required input for shouldDoAutomaticAccountLinking
                        const linkRes = await recipe_1.default
                            .getInstanceOrThrowError()
                            .tryLinkingByAccountInfoOrCreatePrimaryUser({
                                tenantId,
                                inputUser: createUserResponse.user,
                                session: undefined,
                                userContext,
                            });
                        const userAfterLinking = linkRes.status === "OK" ? linkRes.user : createUserResponse.user;
                        if (linkRes.status === "OK" && linkRes.user.id !== existingUser.id) {
                            // this means that the account we just linked to
                            // was not the one we had expected to link it to. This can happen
                            // due to some race condition or the other.. Either way, this
                            // is not an issue and we can just return OK
                        }
                        return {
                            status: "OK",
                            email: tokenConsumptionResponse.email,
                            user: userAfterLinking,
                        };
                    }
                }
            } else {
                // This means that the existing user is not a primary account, which implies that
                // it must be a non linked webauthn account. In this case, we simply update the credential.
                // Linking to an existing account will be done after the user goes through the email
                // verification flow once they log in (if applicable).
                return doRegisterCredentialAndVerifyEmailAndTryLinkIfNotPrimary(
                    new recipeUserId_1.default(userIdForWhomTokenWasGenerated)
                );
            }
        },
        listCredentialsGET: async function ({ options, userContext, session }) {
            var _a;
            const existingUser = await (0, __1.getUser)(session.getUserId(), userContext);
            if (!existingUser) {
                return {
                    status: "GENERAL_ERROR",
                    message: "User not found",
                };
            }
            const recipeUserIds =
                (_a = existingUser.loginMethods.filter((lm) => lm.recipeId === "webauthn")) === null || _a === void 0
                    ? void 0
                    : _a.map((lm) => lm.recipeUserId);
            const credentials = [];
            for (const recipeUserId of recipeUserIds) {
                const listCredentialsResponse = await options.recipeImplementation.listCredentials({
                    recipeUserId: recipeUserId.getAsString(),
                    userContext,
                });
                credentials.push(...listCredentialsResponse.credentials);
            }
            return {
                status: "OK",
                credentials: credentials.map((credential) => ({
                    recipeUserId: credential.recipeUserId,
                    webauthnCredentialId: credential.webauthnCredentialId,
                    relyingPartyId: credential.relyingPartyId,
                    createdAt: credential.createdAt,
                })),
            };
        },
        registerCredentialPOST: async function ({
            recipeUserId,
            webauthnGeneratedOptionsId,
            credential,
            tenantId,
            options,
            userContext,
            session,
        }) {
            const errorCodeMap = {
                REGISTER_CREDENTIAL_NOT_ALLOWED:
                    "Cannot register credential due to security reasons. Please try logging in, use a different login method or contact support. (ERR_CODE_007)",
                INVALID_AUTHENTICATOR_ERROR:
                    "The device used for authentication is not supported. Please use a different device. (ERR_CODE_026)",
                INVALID_CREDENTIALS_ERROR:
                    "The credentials are incorrect. Please make sure you are using the correct credentials. (ERR_CODE_025)",
            };
            const mfaInstance = recipe_3.default.getInstance();
            if (mfaInstance) {
                await multifactorauth_1.default.assertAllowedToSetupFactorElseThrowInvalidClaimError(
                    session,
                    multifactorauth_1.default.FactorIds.WEBAUTHN,
                    userContext
                );
            }
            const user = await (0, __1.getUser)(session.getUserId(), userContext);
            if (!user) {
                return {
                    status: "GENERAL_ERROR",
                    message: "User not found",
                };
            }
            const loginMethod = user.loginMethods.find(
                (lm) => lm.recipeId === "webauthn" && lm.recipeUserId.getAsString() === recipeUserId
            );
            if (!loginMethod) {
                return {
                    status: "GENERAL_ERROR",
                    message: "User not found",
                };
            }
            const generatedOptions = await options.recipeImplementation.getGeneratedOptions({
                webauthnGeneratedOptionsId,
                tenantId,
                userContext,
            });
            if (generatedOptions.status !== "OK") {
                return generatedOptions;
            }
            const email = generatedOptions.email;
            if (email !== loginMethod.email) {
                return {
                    status: "GENERAL_ERROR",
                    message: "Email mismatch",
                };
            }
            // NOTE: Following checks will likely never throw an error as the
            // check for type is done in a parent function but they are kept
            // here to be on the safe side.
            if (!email) {
                throw new Error(
                    "Should never come here since we already check that the email value is a string in validateEmailAddress"
                );
            }
            // we are using the email from the register options
            const registerCredentialResponse = await options.recipeImplementation.registerCredential({
                webauthnGeneratedOptionsId,
                credential,
                userContext,
                recipeUserId: session.getRecipeUserId().getAsString(),
            });
            if (registerCredentialResponse.status !== "OK") {
                return authUtils_1.AuthUtils.getErrorStatusResponseWithReason(
                    registerCredentialResponse,
                    errorCodeMap,
                    "REGISTER_CREDENTIAL_NOT_ALLOWED"
                );
            }
            return {
                status: "OK",
            };
        },
        removeCredentialPOST: async function ({ webauthnCredentialId, options, userContext, session }) {
            var _a;
            const mfaInstance = recipe_3.default.getInstance();
            if (mfaInstance) {
                await session.assertClaims([
                    multifactorauth_1.default.MultiFactorAuthClaim.validators.hasCompletedMFARequirementsForAuth(),
                ]);
            }
            const user = await (0, __1.getUser)(session.getUserId(), userContext);
            if (!user) {
                return {
                    status: "GENERAL_ERROR",
                    message: "User not found",
                };
            }
            const recipeUserId =
                (_a = user.loginMethods.find((lm) => {
                    var _a;
                    return (
                        lm.recipeId === "webauthn" &&
                        ((_a = lm.webauthn) === null || _a === void 0
                            ? void 0
                            : _a.credentialIds.includes(webauthnCredentialId))
                    );
                })) === null || _a === void 0
                    ? void 0
                    : _a.recipeUserId;
            if (!recipeUserId) {
                return {
                    status: "GENERAL_ERROR",
                    message: "User not found",
                };
            }
            const removeCredentialResponse = await options.recipeImplementation.removeCredential({
                webauthnCredentialId,
                recipeUserId: recipeUserId.getAsString(),
                userContext,
            });
            if (removeCredentialResponse.status !== "OK") {
                return removeCredentialResponse;
            }
            return { status: "OK" };
        },
    };
}
