// @ts-nocheck
import Recipe from "./recipe";
import SuperTokensError from "./error";
import {
    TypeWebauthnEmailDeliveryInput,
    UserVerification,
    ResidentKey,
    Attestation,
    AuthenticationPayload,
    RegistrationPayload,
} from "./types";
import { SessionContainerInterface } from "../session/types";
import { RecipeInterface, APIOptions, APIInterface } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static registerOptions(
        input: {
            relyingPartyId: string;
            relyingPartyName: string;
            origin: string;
            residentKey: ResidentKey | undefined;
            userVerification: UserVerification | undefined;
            userPresence: boolean | undefined;
            attestation: Attestation | undefined;
            supportedAlgorithmIds: number[] | undefined;
            timeout: number | undefined;
            tenantId: string;
            userContext?: Record<string, any>;
        } & (
            | {
                  recoverAccountToken: string;
              }
            | {
                  displayName: string | undefined;
                  email: string;
              }
        )
    ): Promise<
        | (
              | {
                    status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
                }
              | {
                    status: "INVALID_EMAIL_ERROR";
                    err: string;
                }
              | {
                    status: "INVALID_OPTIONS_ERROR";
                }
          )
        | {
              status: "OK";
              webauthnGeneratedOptionsId: string;
              createdAt: number;
              expiresAt: number;
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
              attestation: Attestation;
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
    >;
    static signInOptions(input: {
        relyingPartyId: string;
        relyingPartyName: string;
        origin: string;
        userVerification: UserVerification | undefined;
        userPresence: boolean | undefined;
        timeout: number | undefined;
        tenantId: string;
        userContext?: Record<string, any>;
    }): Promise<
        | {
              status: "INVALID_OPTIONS_ERROR";
          }
        | {
              status: "OK";
              webauthnGeneratedOptionsId: string;
              createdAt: number;
              expiresAt: number;
              challenge: string;
              timeout: number;
              userVerification: UserVerification;
          }
    >;
    static getGeneratedOptions(input: {
        webauthnGeneratedOptionsId: string;
        tenantId: string;
        userContext?: Record<string, any>;
    }): Promise<
        | {
              status: "OPTIONS_NOT_FOUND_ERROR";
          }
        | {
              status: "OK";
              webauthnGeneratedOptionsId: string;
              relyingPartyId: string;
              relyingPartyName: string;
              userVerification: UserVerification;
              userPresence: boolean;
              origin: string;
              email?: string;
              timeout: number;
              challenge: string;
              createdAt: number;
              expiresAt: number;
          }
    >;
    static signUp(input: {
        webauthnGeneratedOptionsId: string;
        credential: RegistrationPayload;
        session: SessionContainerInterface | undefined;
        shouldTryLinkingWithSessionUser: boolean | undefined;
        tenantId: string;
        userContext?: Record<string, any>;
    }): Promise<
        | (
              | (
                    | {
                          status: "EMAIL_ALREADY_EXISTS_ERROR";
                      }
                    | {
                          status: "OPTIONS_NOT_FOUND_ERROR";
                      }
                    | {
                          status: "INVALID_OPTIONS_ERROR";
                      }
                    | {
                          status: "INVALID_CREDENTIALS_ERROR";
                      }
                    | {
                          status: "INVALID_AUTHENTICATOR_ERROR";
                          reason: string;
                      }
                )
              | {
                    status: "LINKING_TO_SESSION_USER_FAILED";
                    reason:
                        | "EMAIL_VERIFICATION_REQUIRED"
                        | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                        | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                        | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                }
          )
        | {
              status: "OK";
              user: import("../../types").User;
              recipeUserId: import("../..").RecipeUserId;
          }
    >;
    static signIn(input: {
        webauthnGeneratedOptionsId: string;
        credential: AuthenticationPayload;
        session: SessionContainerInterface | undefined;
        shouldTryLinkingWithSessionUser: boolean | undefined;
        tenantId: string;
        userContext?: Record<string, any>;
    }): Promise<
        | (
              | (
                    | {
                          status: "INVALID_CREDENTIALS_ERROR";
                      }
                    | {
                          status: "INVALID_OPTIONS_ERROR";
                      }
                    | {
                          status: "INVALID_AUTHENTICATOR_ERROR";
                      }
                    | {
                          status: "CREDENTIAL_NOT_FOUND_ERROR";
                      }
                    | {
                          status: "UNKNOWN_USER_ID_ERROR";
                      }
                    | {
                          status: "OPTIONS_NOT_FOUND_ERROR";
                      }
                )
              | {
                    status: "LINKING_TO_SESSION_USER_FAILED";
                    reason:
                        | "EMAIL_VERIFICATION_REQUIRED"
                        | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                        | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                        | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                }
          )
        | {
              status: "OK";
              user: import("../../types").User;
              recipeUserId: import("../..").RecipeUserId;
          }
    >;
    static verifyCredentials(input: {
        webauthnGeneratedOptionsId: string;
        credential: AuthenticationPayload;
        tenantId: string;
        userContext?: Record<string, any>;
    }): Promise<{
        status:
            | "OK"
            | "UNKNOWN_USER_ID_ERROR"
            | "INVALID_OPTIONS_ERROR"
            | "OPTIONS_NOT_FOUND_ERROR"
            | "INVALID_CREDENTIALS_ERROR"
            | "INVALID_AUTHENTICATOR_ERROR"
            | "CREDENTIAL_NOT_FOUND_ERROR";
    }>;
    /**
     * We do not make email optional here because we want to
     * allow passing in primaryUserId. If we make email optional,
     * and if the user provides a primaryUserId, then it may result in two problems:
     *  - there is no recipeUserId = input primaryUserId, in this case,
     *    this function will throw an error
     *  - There is a recipe userId = input primaryUserId, but that recipe has no email,
     *    or has wrong email compared to what the user wanted to generate a reset token for.
     *
     * And we want to allow primaryUserId being passed in.
     */
    static generateRecoverAccountToken(input: {
        tenantId: string;
        userId: string;
        email: string;
        userContext?: Record<string, any>;
    }): Promise<
        | {
              status: "UNKNOWN_USER_ID_ERROR";
          }
        | {
              status: "OK";
              token: string;
          }
    >;
    static recoverAccount({
        tenantId,
        webauthnGeneratedOptionsId,
        token,
        credential,
        userContext,
    }: {
        tenantId?: string;
        webauthnGeneratedOptionsId: string;
        token: string;
        credential: RegistrationPayload;
        userContext?: Record<string, any>;
    }): Promise<
        | {
              status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
          }
        | (
              | {
                    status: "INVALID_CREDENTIALS_ERROR";
                }
              | {
                    status: "OPTIONS_NOT_FOUND_ERROR";
                }
              | {
                    status: "INVALID_OPTIONS_ERROR";
                }
              | {
                    status: "INVALID_AUTHENTICATOR_ERROR";
                    reason: string;
                }
          )
        | {
              status: "OK";
          }
    >;
    static consumeRecoverAccountToken(input: {
        tenantId: string;
        token: string;
        userContext?: Record<string, any>;
    }): Promise<
        | {
              status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
          }
        | {
              status: "OK";
              email: string;
              userId: string;
          }
    >;
    static registerCredential(input: {
        recipeUserId: string;
        webauthnGeneratedOptionsId: string;
        credential: RegistrationPayload;
        userContext?: Record<string, any>;
    }): Promise<
        | (
              | {
                    status: "INVALID_CREDENTIALS_ERROR";
                }
              | {
                    status: "OPTIONS_NOT_FOUND_ERROR";
                }
              | {
                    status: "INVALID_OPTIONS_ERROR";
                }
              | {
                    status: "INVALID_AUTHENTICATOR_ERROR";
                    reason: string;
                }
          )
        | {
              status: "OK";
          }
    >;
    static createRecoverAccountLink({
        tenantId,
        userId,
        email,
        userContext,
    }: {
        tenantId: string;
        userId: string;
        email: string;
        userContext?: Record<string, any>;
    }): Promise<
        | {
              status: "UNKNOWN_USER_ID_ERROR";
          }
        | {
              status: string;
              link: string;
          }
    >;
    static sendRecoverAccountEmail({
        tenantId,
        userId,
        email,
        userContext,
    }: {
        tenantId: string;
        userId: string;
        email: string;
        userContext?: Record<string, any>;
    }): Promise<
        | {
              status: string;
              link: string;
          }
        | {
              status: string;
          }
    >;
    static sendEmail(
        input: TypeWebauthnEmailDeliveryInput & {
            userContext?: Record<string, any>;
        }
    ): Promise<void>;
    static getUserFromRecoverAccountToken(input: {
        token: string;
        tenantId: string;
        userContext?: Record<string, any>;
    }): Promise<
        | {
              status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
          }
        | {
              status: "OK";
              user: import("../../types").User;
              recipeUserId?: import("../..").RecipeUserId;
          }
    >;
    static removeGeneratedOptions(input: {
        webauthnGeneratedOptionsId: string;
        tenantId: string;
        userContext?: Record<string, any>;
    }): Promise<
        | {
              status: "OPTIONS_NOT_FOUND_ERROR";
          }
        | {
              status: "OK";
          }
    >;
    static removeCredential(input: {
        webauthnCredentialId: string;
        recipeUserId: string;
        userContext?: Record<string, any>;
    }): Promise<
        | {
              status: "CREDENTIAL_NOT_FOUND_ERROR";
          }
        | {
              status: "OK";
          }
    >;
    static getCredential(input: {
        webauthnCredentialId: string;
        recipeUserId: string;
        userContext?: Record<string, any>;
    }): Promise<
        | {
              status: "CREDENTIAL_NOT_FOUND_ERROR";
          }
        | {
              status: "OK";
              webauthnCredentialId: string;
              relyingPartyId: string;
              recipeUserId: import("../..").RecipeUserId;
              createdAt: number;
          }
    >;
    static listCredentials(input: { recipeUserId: string; userContext?: Record<string, any> }): Promise<{
        status: "OK";
        credentials: {
            webauthnCredentialId: string;
            relyingPartyId: string;
            recipeUserId: string;
            createdAt: number;
        }[];
    }>;
    static updateUserEmail(input: {
        email: string;
        recipeUserId: string;
        tenantId: string;
        userContext?: Record<string, any>;
    }): Promise<
        | (
              | {
                    status: "EMAIL_ALREADY_EXISTS_ERROR";
                }
              | {
                    status: "UNKNOWN_USER_ID_ERROR";
                }
          )
        | {
              status: "OK";
          }
    >;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let registerOptions: typeof Wrapper.registerOptions;
export declare let signInOptions: typeof Wrapper.signInOptions;
export declare let signIn: typeof Wrapper.signIn;
export declare let signUp: typeof Wrapper.signUp;
export declare let verifyCredentials: typeof Wrapper.verifyCredentials;
export declare let generateRecoverAccountToken: typeof Wrapper.generateRecoverAccountToken;
export declare let recoverAccount: typeof Wrapper.recoverAccount;
export declare let consumeRecoverAccountToken: typeof Wrapper.consumeRecoverAccountToken;
export declare let registerCredential: typeof Wrapper.registerCredential;
export declare let createRecoverAccountLink: typeof Wrapper.createRecoverAccountLink;
export declare let sendRecoverAccountEmail: typeof Wrapper.sendRecoverAccountEmail;
export declare let sendEmail: typeof Wrapper.sendEmail;
export declare let getGeneratedOptions: typeof Wrapper.getGeneratedOptions;
export declare let getUserFromRecoverAccountToken: typeof Wrapper.getUserFromRecoverAccountToken;
export declare let removeGeneratedOptions: typeof Wrapper.removeGeneratedOptions;
export declare let removeCredential: typeof Wrapper.removeCredential;
export declare let getCredential: typeof Wrapper.getCredential;
export declare let listCredentials: typeof Wrapper.listCredentials;
export declare let updateUserEmail: typeof Wrapper.updateUserEmail;
export type { RecipeInterface, APIOptions, APIInterface };
