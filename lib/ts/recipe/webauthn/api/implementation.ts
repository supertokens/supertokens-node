import { APIInterface, APIOptions } from "..";
import { GeneralErrorResponse, User, UserContext } from "../../../types";
import AccountLinking from "../../accountlinking/recipe";
import EmailVerification from "../../emailverification/recipe";
import { AuthUtils } from "../../../authUtils";
import { isFakeEmail } from "../../thirdparty/utils";
import { SessionContainerInterface } from "../../session/types";
import {
    DEFAULT_REGISTER_OPTIONS_ATTESTATION,
    DEFAULT_REGISTER_OPTIONS_TIMEOUT,
    DEFAULT_REGISTER_OPTIONS_REQUIRE_RESIDENT_KEY,
    DEFAULT_REGISTER_OPTIONS_RESIDENT_KEY,
    DEFAULT_REGISTER_OPTIONS_USER_VERIFICATION,
    DEFAULT_SIGNIN_OPTIONS_TIMEOUT,
    DEFAULT_SIGNIN_OPTIONS_USER_VERIFICATION,
    DEFAULT_REGISTER_OPTIONS_SUPPORTED_ALGORITHM_IDS,
} from "../constants";
import RecipeUserId from "../../../recipeUserId";
import { getRecoverAccountLink } from "../utils";
import { logDebugMessage } from "../../../logger";
import { RecipeLevelUser } from "../../accountlinking/types";
import { getUser } from "../../..";
import { CredentialPayload, ResidentKey, UserVerification } from "../types";

export default function getAPIImplementation(): APIInterface {
    return {
        registerOptionsPOST: async function ({
            tenantId,
            options,
            userContext,
            ...props
        }: {
            tenantId: string;
            options: APIOptions;
            userContext: UserContext;
            displayName?: string;
        } & ({ email: string } | { recoverAccountToken: string })): Promise<
            | {
                  status: "OK";
                  webauthnGeneratedOptionsId: string;
                  createdAt: string;
                  expiresAt: string;
                  rp: {
                      id: string;
                      name: string;
                  };
                  user: {
                      id: string;
                      name: string;
                      displayName: string;
                  };
                  challenge: string;
                  timeout: number;
                  excludeCredentials: {
                      id: string;
                      type: "public-key";
                      transports: ("ble" | "hybrid" | "internal" | "nfc" | "usb")[];
                  }[];
                  attestation: "none" | "indirect" | "direct" | "enterprise";
                  pubKeyCredParams: {
                      alg: number;
                      type: "public-key";
                  }[];
                  authenticatorSelection: {
                      requireResidentKey: boolean;
                      residentKey: ResidentKey;
                      userVerification: UserVerification;
                  };
              }
            | { status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR" }
            | { status: "INVALID_EMAIL_ERROR"; err: string }
            | { status: "INVALID_GENERATED_OPTIONS_ERROR" }
        > {
            const relyingPartyId = await options.config.getRelyingPartyId({
                tenantId,
                request: options.req,
                userContext,
            });
            const relyingPartyName = await options.config.getRelyingPartyName({
                tenantId,
                userContext,
            });

            const origin = await options.config.getOrigin({
                tenantId,
                request: options.req,
                userContext,
            });

            const timeout = DEFAULT_REGISTER_OPTIONS_TIMEOUT;
            const attestation = DEFAULT_REGISTER_OPTIONS_ATTESTATION;
            const requireResidentKey = DEFAULT_REGISTER_OPTIONS_REQUIRE_RESIDENT_KEY;
            const residentKey = DEFAULT_REGISTER_OPTIONS_RESIDENT_KEY;
            const userVerification = DEFAULT_REGISTER_OPTIONS_USER_VERIFICATION;
            const supportedAlgorithmIds = DEFAULT_REGISTER_OPTIONS_SUPPORTED_ALGORITHM_IDS;

            let response = await options.recipeImplementation.registerOptions({
                ...props,
                attestation,
                requireResidentKey,
                residentKey,
                userVerification,
                origin,
                relyingPartyId,
                relyingPartyName,
                timeout,
                tenantId,
                userContext,
                supportedAlgorithmIds,
            });

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

        signInOptionsPOST: async function ({
            email,
            tenantId,
            options,
            userContext,
        }: {
            email?: string;
            tenantId: string;
            options: APIOptions;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
                  webauthnGeneratedOptionsId: string;
                  createdAt: string;
                  expiresAt: string;
                  challenge: string;
                  timeout: number;
                  userVerification: UserVerification;
              }
            | GeneralErrorResponse
            | { status: "INVALID_GENERATED_OPTIONS_ERROR" }
        > {
            const relyingPartyId = await options.config.getRelyingPartyId({
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

            const timeout = DEFAULT_SIGNIN_OPTIONS_TIMEOUT;
            const userVerification = DEFAULT_SIGNIN_OPTIONS_USER_VERIFICATION;

            let response = await options.recipeImplementation.signInOptions({
                email,
                userVerification,
                origin,
                relyingPartyId,
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
        }: {
            webauthnGeneratedOptionsId: string;
            credential: CredentialPayload;
            tenantId: string;
            session: SessionContainerInterface | undefined;
            shouldTryLinkingWithSessionUser: boolean | undefined;
            options: APIOptions;
            userContext: UserContext;
            // should also have the email or recoverAccountToken in order to do the preauth checks
        }): Promise<
            | {
                  status: "OK";
                  session: SessionContainerInterface;
                  user: User;
              }
            | GeneralErrorResponse
            | {
                  status: "SIGN_UP_NOT_ALLOWED";
                  reason: string;
              }
            | { status: "INVALID_CREDENTIALS_ERROR" }
            | { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" }
            | { status: "INVALID_GENERATED_OPTIONS_ERROR" }
            | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string }
            | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
        > {
            // TODO update error codes (ERR_CODE_XXX) after final implementation
            const errorCodeMap = {
                SIGN_UP_NOT_ALLOWED:
                    "Cannot sign up due to security reasons. Please try logging in, use a different login method or contact support. (ERR_CODE_007)",
                INVALID_AUTHENTICATOR_ERROR: {
                    // TODO: add more cases
                },
                INVALID_CREDENTIALS_ERROR:
                    "The sign up credentials are incorrect. Please use a different authenticator.",
                LINKING_TO_SESSION_USER_FAILED: {
                    EMAIL_VERIFICATION_REQUIRED:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_013)",
                    RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_014)",
                    ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_015)",
                    SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_016)",
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

            // todo familiarize with this method
            const preAuthCheckRes = await AuthUtils.preAuthChecks({
                authenticatingAccountInfo: {
                    recipeId: "webauthn",
                    email,
                },
                factorIds: ["webauthn"],
                isSignUp: true,
                isVerified: isFakeEmail(email),
                signInVerifiesLoginMethod: false,
                skipSessionUserUpdateInCore: false,
                authenticatingUser: undefined, // since this a sign up, this is undefined
                tenantId,
                userContext,
                session,
                shouldTryLinkingWithSessionUser,
            });

            if (preAuthCheckRes.status === "SIGN_UP_NOT_ALLOWED") {
                const conflictingUsers = await AccountLinking.getInstance().recipeInterfaceImpl.listUsersByAccountInfo({
                    tenantId,
                    accountInfo: {
                        email,
                    },
                    doUnionOfAccountInfo: false,
                    userContext,
                });

                // this isn't mandatory to
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
                return AuthUtils.getErrorStatusResponseWithReason(preAuthCheckRes, errorCodeMap, "SIGN_UP_NOT_ALLOWED");
            }

            if (isFakeEmail(email) && preAuthCheckRes.isFirstFactor) {
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

            if (signUpResponse.status === "EMAIL_ALREADY_EXISTS_ERROR") {
                return signUpResponse;
            }
            if (signUpResponse.status !== "OK") {
                return AuthUtils.getErrorStatusResponseWithReason(signUpResponse, errorCodeMap, "SIGN_UP_NOT_ALLOWED");
            }

            // todo familiarize with this method
            // todo check if we need to remove webauthn credential ids from the type - it is not used atm.
            const postAuthChecks = await AuthUtils.postAuthChecks({
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
                AuthUtils.getErrorStatusResponseWithReason(postAuthChecks, errorCodeMap, "SIGN_UP_NOT_ALLOWED");
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
        }: {
            webauthnGeneratedOptionsId: string;
            credential: CredentialPayload;
            tenantId: string;
            session?: SessionContainerInterface;
            shouldTryLinkingWithSessionUser: boolean | undefined;
            options: APIOptions;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
                  session: SessionContainerInterface;
                  user: User;
              }
            | { status: "INVALID_CREDENTIALS_ERROR" }
            | {
                  status: "SIGN_IN_NOT_ALLOWED";
                  reason: string;
              }
            | GeneralErrorResponse
        > {
            const errorCodeMap = {
                SIGN_IN_NOT_ALLOWED:
                    "Cannot sign in due to security reasons. Please try recovering your account, use a different login method or contact support. (ERR_CODE_008)",
                LINKING_TO_SESSION_USER_FAILED: {
                    EMAIL_VERIFICATION_REQUIRED:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_009)",
                    RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_010)",
                    ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_011)",
                    SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_012)",
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
                return verifyResult;
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
            let email = generatedOptions.email;

            const checkCredentialsOnTenant = async () => {
                return true;
            };

            // todo familiarize with this method
            // todo make sure the section below (from getAuthenticatingUserAndAddToCurrentTenantIfRequired to isVerified) is correct
            // const matchingLoginMethodsFromSessionUser = sessionUser.loginMethods.filter(
            //     (lm) =>
            //         lm.recipeId === recipeId &&
            //         (lm.hasSameEmailAs(accountInfo.email) ||
            //             lm.hasSamePhoneNumberAs(accountInfo.phoneNumber) ||
            //             lm.hasSameThirdPartyInfoAs(accountInfo.thirdParty))
            // );
            const authenticatingUser = await AuthUtils.getAuthenticatingUserAndAddToCurrentTenantIfRequired({
                accountInfo: { email },
                userContext,
                recipeId,
                session,
                tenantId,
                checkCredentialsOnTenant,
            });

            const isVerified = authenticatingUser !== undefined && authenticatingUser.loginMethod!.verified;
            // We check this before preAuthChecks, because that function assumes that if isSignUp is false,
            // then authenticatingUser is defined. While it wouldn't technically cause any problems with
            // the implementation of that function, this way we can guarantee that either isSignInAllowed or
            // isSignUpAllowed will be called as expected.
            if (authenticatingUser === undefined) {
                return {
                    status: "INVALID_CREDENTIALS_ERROR",
                };
            }
            const preAuthChecks = await AuthUtils.preAuthChecks({
                authenticatingAccountInfo: {
                    recipeId,
                    email,
                },
                factorIds: [recipeId],
                isSignUp: false,
                authenticatingUser: authenticatingUser?.user,
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
                return AuthUtils.getErrorStatusResponseWithReason(preAuthChecks, errorCodeMap, "SIGN_IN_NOT_ALLOWED");
            }

            if (isFakeEmail(email) && preAuthChecks.isFirstFactor) {
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
            if (signInResponse.status !== "OK") {
                return AuthUtils.getErrorStatusResponseWithReason(signInResponse, errorCodeMap, "SIGN_IN_NOT_ALLOWED");
            }

            const postAuthChecks = await AuthUtils.postAuthChecks({
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
                return AuthUtils.getErrorStatusResponseWithReason(postAuthChecks, errorCodeMap, "SIGN_IN_NOT_ALLOWED");
            }

            return {
                status: "OK",
                session: postAuthChecks.session,
                user: postAuthChecks.user,
            };
        },

        emailExistsGET: async function ({
            email,
            tenantId,
            userContext,
        }: {
            email: string;
            tenantId: string;
            options: APIOptions;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
                  exists: boolean;
              }
            | GeneralErrorResponse
        > {
            // even if the above returns true, we still need to check if there
            // exists an webauthn user with the same email cause the function
            // above does not check for that.
            let users = await AccountLinking.getInstance().recipeInterfaceImpl.listUsersByAccountInfo({
                tenantId,
                accountInfo: {
                    email,
                },
                doUnionOfAccountInfo: false,
                userContext,
            });
            let webauthnUserExists =
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

        generateRecoverAccountTokenPOST: async function ({
            email,
            tenantId,
            options,
            userContext,
        }: {
            email: string;
            tenantId: string;
            options: APIOptions;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
              }
            | { status: "RECOVER_ACCOUNT_NOT_ALLOWED"; reason: string }
            | GeneralErrorResponse
        > {
            // NOTE: Check for email being a non-string value. This check will likely
            // never evaluate to `true` as there is an upper-level check for the type
            // in validation but kept here to be safe.
            if (typeof email !== "string")
                throw new Error(
                    "Should never come here since we already check that the email value is a string in validateFormFieldsOrThrowError"
                );

            // this function will be reused in different parts of the flow below..
            async function generateAndSendRecoverAccountToken(
                primaryUserId: string,
                recipeUserId: RecipeUserId | undefined
            ): Promise<
                | {
                      status: "OK";
                  }
                | { status: "RECOVER_ACCOUNT_NOT_ALLOWED"; reason: string }
                | GeneralErrorResponse
            > {
                // the user ID here can be primary or recipe level.
                let response = await options.recipeImplementation.generateRecoverAccountToken({
                    tenantId,
                    userId: recipeUserId === undefined ? primaryUserId : recipeUserId.getAsString(),
                    email,
                    userContext,
                });

                if (response.status === "UNKNOWN_USER_ID_ERROR") {
                    logDebugMessage(
                        `Recover account email not sent, unknown user id: ${
                            recipeUserId === undefined ? primaryUserId : recipeUserId.getAsString()
                        }`
                    );
                    return {
                        status: "OK",
                    };
                }

                let recoverAccountLink = getRecoverAccountLink({
                    appInfo: options.appInfo,
                    token: response.token,
                    tenantId,
                    request: options.req,
                    userContext,
                });

                logDebugMessage(`Sending recover account email to ${email}`);
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

            /**
             * check if primaryUserId is linked with this email
             */
            let users = await AccountLinking.getInstance().recipeInterfaceImpl.listUsersByAccountInfo({
                tenantId,
                accountInfo: {
                    email,
                },
                doUnionOfAccountInfo: false,
                userContext,
            });

            // we find the recipe user ID of the webauthn account from the user's list
            // for later use.
            let webauthnAccount: RecipeLevelUser | undefined = undefined;
            for (let i = 0; i < users.length; i++) {
                let webauthnAccountTmp = users[i].loginMethods.find(
                    (l) => l.recipeId === "webauthn" && l.hasSameEmailAs(email)
                );
                if (webauthnAccountTmp !== undefined) {
                    webauthnAccount = webauthnAccountTmp;
                    break;
                }
            }

            // we find the primary user ID from the user's list for later use.
            let primaryUserAssociatedWithEmail = users.find((u) => u.isPrimaryUser);

            // first we check if there even exists a primary user that has the input email
            // if not, then we do the regular flow for recover account
            if (primaryUserAssociatedWithEmail === undefined) {
                if (webauthnAccount === undefined) {
                    logDebugMessage(`Recover account email not sent, unknown user email: ${email}`);
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
            let emailVerified =
                primaryUserAssociatedWithEmail.loginMethods.find((lm) => {
                    return lm.hasSameEmailAs(email) && lm.verified;
                }) !== undefined;

            // finally, we check if the primary user has any other email / phone number
            // associated with this account - and if it does, then it means that
            // there is a risk of account takeover, so we do not allow the token to be generated
            let hasOtherEmailOrPhone =
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
                    reason:
                        "Recover account link was not created because of account take over risk. Please contact support. (ERR_CODE_001)",
                };
            }

            let shouldDoAccountLinkingResponse = await AccountLinking.getInstance().config.shouldDoAutomaticAccountLinking(
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
                    logDebugMessage(
                        `Recover account email not sent, since webauthn user didn't exist, and account linking not enabled`
                    );
                    return {
                        status: "OK",
                    };
                }

                let isSignUpAllowed = await AccountLinking.getInstance().isSignUpAllowed({
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
                    logDebugMessage(
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
            let areTheTwoAccountsLinked =
                primaryUserAssociatedWithEmail.loginMethods.find((lm) => {
                    return lm.recipeUserId.getAsString() === webauthnAccount!.recipeUserId.getAsString();
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
        }: {
            token: string;
            webauthnGeneratedOptionsId: string;
            credential: CredentialPayload;
            tenantId: string;
            options: APIOptions;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
                  user: User;
                  email: string;
              }
            | GeneralErrorResponse
            | { status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR" }
            | { status: "INVALID_CREDENTIALS_ERROR" } // the credential is not valid for various reasons - will discover this during implementation
            | { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" } // i.e. options not found
            | { status: "INVALID_GENERATED_OPTIONS_ERROR" } // i.e. timeout expired
            | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string }
        > {
            async function markEmailAsVerified(recipeUserId: RecipeUserId, email: string) {
                const emailVerificationInstance = EmailVerification.getInstance();
                if (emailVerificationInstance) {
                    const tokenResponse = await emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                        {
                            tenantId,
                            recipeUserId,
                            email,
                            userContext,
                        }
                    );

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

            async function doRegisterCredentialAndVerifyEmailAndTryLinkIfNotPrimary(
                recipeUserId: RecipeUserId
            ): Promise<
                | {
                      status: "OK";
                      user: User;
                      email: string;
                  }
                | { status: "INVALID_CREDENTIALS_ERROR" }
                | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string }
                | GeneralErrorResponse
            > {
                let updateResponse = await options.recipeImplementation.registerCredential({
                    recipeUserId,
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
                } else if (updateResponse.status === "INVALID_CREDENTIALS_ERROR") {
                    return {
                        status: "INVALID_CREDENTIALS_ERROR",
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
                    const updatedUserAfterEmailVerification = await getUser(recipeUserId.getAsString(), userContext);
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
                    const linkRes = await AccountLinking.getInstance().tryLinkingByAccountInfoOrCreatePrimaryUser({
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

            let tokenConsumptionResponse = await options.recipeImplementation.consumeRecoverAccountToken({
                token,
                tenantId,
                userContext,
            });

            if (tokenConsumptionResponse.status === "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR") {
                return tokenConsumptionResponse;
            }

            let userIdForWhomTokenWasGenerated = tokenConsumptionResponse.userId;
            let emailForWhomTokenWasGenerated = tokenConsumptionResponse.email;

            let existingUser = await getUser(tokenConsumptionResponse.userId, userContext);

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
                let webauthnUserIsLinkedToExistingUser =
                    existingUser.loginMethods.find((lm) => {
                        // we check based on user ID and not email because the only time
                        // the primary user ID is used for token generation is if the webauthn
                        // user did not exist - in which case the value of emailPasswordUserExists will
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
                        new RecipeUserId(userIdForWhomTokenWasGenerated)
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

                    let createUserResponse = await options.recipeImplementation.createNewRecipeUser({
                        tenantId,
                        webauthnGeneratedOptionsId,
                        credential,
                        userContext,
                    });

                    if (
                        createUserResponse.status === "INVALID_CREDENTIALS_ERROR" ||
                        createUserResponse.status === "GENERATED_OPTIONS_NOT_FOUND_ERROR" ||
                        createUserResponse.status === "INVALID_GENERATED_OPTIONS_ERROR" ||
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
                        const updatedUser = await getUser(createUserResponse.user.id, userContext);
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
                        const linkRes = await AccountLinking.getInstance().tryLinkingByAccountInfoOrCreatePrimaryUser({
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
                    new RecipeUserId(userIdForWhomTokenWasGenerated)
                );
            }
        },

        registerCredentialPOST: async function ({
            webauthnGeneratedOptionsId,
            credential,
            tenantId,
            options,
            userContext,
            session,
        }: {
            webauthnGeneratedOptionsId: string;
            credential: CredentialPayload;
            tenantId: string;
            options: APIOptions;
            userContext: UserContext;
            session: SessionContainerInterface;
        }): Promise<
            | {
                  status: "OK";
              }
            | GeneralErrorResponse
            | {
                  status: "REGISTER_CREDENTIAL_NOT_ALLOWED";
                  reason: string;
              }
            | { status: "INVALID_CREDENTIALS_ERROR" }
            | { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" }
            | { status: "INVALID_GENERATED_OPTIONS_ERROR" }
            | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string }
        > {
            // TODO update error codes (ERR_CODE_XXX) after final implementation
            const errorCodeMap = {
                REGISTER_CREDENTIAL_NOT_ALLOWED:
                    "Cannot register credential due to security reasons. Please try logging in, use a different login method or contact support. (ERR_CODE_007)",
                INVALID_AUTHENTICATOR_ERROR: {
                    // TODO: add more cases
                },
                INVALID_CREDENTIALS_ERROR: "The credentials are incorrect. Please use a different authenticator.",
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

            // we are using the email from the register options
            const registerCredentialResponse = await options.recipeImplementation.registerCredential({
                webauthnGeneratedOptionsId,
                credential,
                userContext,
                recipeUserId: session.getRecipeUserId(),
            });

            if (registerCredentialResponse.status !== "OK") {
                return AuthUtils.getErrorStatusResponseWithReason(
                    registerCredentialResponse,
                    errorCodeMap,
                    "REGISTER_CREDENTIAL_NOT_ALLOWED"
                );
            }

            return {
                status: "OK",
            };
        },
    };
}
