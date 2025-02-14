// @ts-nocheck
import Recipe from "./recipe";
import SuperTokensError from "./error";
import {
    RecipeInterface,
    APIInterface,
    APIOptions,
    TypeWebauthnEmailDeliveryInput,
    CredentialPayload,
    UserVerification,
    ResidentKey,
    Attestation,
    AuthenticationPayload,
} from "./types";
import { SessionContainerInterface } from "../session/types";
import { BaseRequest } from "../../framework";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static registerOptions({
        residentKey,
        userVerification,
        userPresence,
        attestation,
        supportedAlgorithmIds,
        timeout,
        tenantId,
        userContext,
        ...rest
    }: {
        residentKey?: ResidentKey;
        userVerification?: UserVerification;
        userPresence?: boolean;
        attestation?: Attestation;
        supportedAlgorithmIds?: number[];
        timeout?: number;
        tenantId?: string;
        userContext?: Record<string, any>;
    } & (
        | {
              relyingPartyId: string;
              relyingPartyName: string;
              origin: string;
          }
        | {
              request: BaseRequest;
              relyingPartyId?: string;
              relyingPartyName?: string;
              origin?: string;
          }
    ) &
        (
            | {
                  email: string;
                  displayName?: string;
              }
            | {
                  recoverAccountToken: string;
              }
        )): Promise<
        | {
              status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
          }
        | {
              status: "INVALID_OPTIONS_ERROR";
          }
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
        | {
              status: string;
              err: string;
          }
    >;
    static signInOptions({
        tenantId,
        userVerification,
        userPresence,
        timeout,
        userContext,
        ...rest
    }: {
        timeout?: number;
        userVerification?: UserVerification;
        userPresence?: boolean;
        tenantId?: string;
        userContext?: Record<string, any>;
    } & (
        | {
              relyingPartyId: string;
              relyingPartyName: string;
              origin: string;
          }
        | {
              request: BaseRequest;
              relyingPartyId?: string;
              relyingPartyName?: string;
              origin?: string;
          }
    )): Promise<
        | {
              status: "INVALID_OPTIONS_ERROR";
          }
        | {
              status: "OK";
              webauthnGeneratedOptionsId: string;
              createdAt: string;
              expiresAt: string;
              challenge: string;
              timeout: number;
              userVerification: UserVerification;
          }
    >;
    static getGeneratedOptions({
        webauthnGeneratedOptionsId,
        tenantId,
        userContext,
    }: {
        webauthnGeneratedOptionsId: string;
        tenantId?: string;
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
              email: string;
              timeout: string;
              challenge: string;
              createdAt: number;
              expiresAt: number;
          }
    >;
    static signUp({
        tenantId,
        webauthnGeneratedOptionsId,
        credential,
        session,
        userContext,
    }: {
        tenantId?: string;
        webauthnGeneratedOptionsId: string;
        credential: CredentialPayload;
        userContext?: Record<string, any>;
        session?: SessionContainerInterface;
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
                        | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                        | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                        | "EMAIL_VERIFICATION_REQUIRED"
                        | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                }
          )
        | {
              status: "OK";
              user: import("../../types").User;
              recipeUserId: import("../..").RecipeUserId;
          }
    >;
    static signIn({
        tenantId,
        webauthnGeneratedOptionsId,
        credential,
        session,
        userContext,
    }: {
        tenantId?: string;
        webauthnGeneratedOptionsId: string;
        credential: AuthenticationPayload;
        session?: SessionContainerInterface;
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
                        | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                        | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                        | "EMAIL_VERIFICATION_REQUIRED"
                        | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                }
          )
        | {
              status: "OK";
              user: import("../../types").User;
              recipeUserId: import("../..").RecipeUserId;
          }
    >;
    static verifyCredentials({
        tenantId,
        webauthnGeneratedOptionsId,
        credential,
        userContext,
    }: {
        tenantId?: string;
        webauthnGeneratedOptionsId: string;
        credential: AuthenticationPayload;
        userContext?: Record<string, any>;
    }): Promise<{
        status:
            | "OK"
            | "UNKNOWN_USER_ID_ERROR"
            | "INVALID_CREDENTIALS_ERROR"
            | "INVALID_OPTIONS_ERROR"
            | "OPTIONS_NOT_FOUND_ERROR"
            | "INVALID_AUTHENTICATOR_ERROR"
            | "CREDENTIAL_NOT_FOUND_ERROR";
    }>;
    /**
     * We do not make email optional here cause we want to
     * allow passing in primaryUserId. If we make email optional,
     * and if the user provides a primaryUserId, then it may result in two problems:
     *  - there is no recipeUserId = input primaryUserId, in this case,
     *    this function will throw an error
     *  - There is a recipe userId = input primaryUserId, but that recipe has no email,
     *    or has wrong email compared to what the user wanted to generate a reset token for.
     *
     * And we want to allow primaryUserId being passed in.
     */
    static generateRecoverAccountToken({
        tenantId,
        userId,
        email,
        userContext,
    }: {
        tenantId?: string;
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
        credential: CredentialPayload;
        userContext?: Record<string, any>;
    }): Promise<
        | {
              status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
          }
        | {
              status: string;
              failureReason: string;
          }
        | {
              status: "OK" | "INVALID_CREDENTIALS_ERROR" | "INVALID_OPTIONS_ERROR" | "OPTIONS_NOT_FOUND_ERROR";
              failureReason?: undefined;
          }
    >;
    static consumeRecoverAccountToken({
        tenantId,
        token,
        userContext,
    }: {
        tenantId?: string;
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
    static registerCredential({
        recipeUserId,
        webauthnGeneratedOptionsId,
        credential,
        userContext,
    }: {
        recipeUserId: string;
        webauthnGeneratedOptionsId: string;
        credential: CredentialPayload;
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
        tenantId?: string;
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
        tenantId?: string;
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
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let registerOptions: typeof Wrapper.registerOptions;
export declare let signInOptions: typeof Wrapper.signInOptions;
export declare let signIn: typeof Wrapper.signIn;
export declare let verifyCredentials: typeof Wrapper.verifyCredentials;
export declare let generateRecoverAccountToken: typeof Wrapper.generateRecoverAccountToken;
export declare let recoverAccount: typeof Wrapper.recoverAccount;
export declare let consumeRecoverAccountToken: typeof Wrapper.consumeRecoverAccountToken;
export declare let registerCredential: typeof Wrapper.registerCredential;
export type { RecipeInterface, APIOptions, APIInterface };
export declare let createRecoverAccountLink: typeof Wrapper.createRecoverAccountLink;
export declare let sendRecoverAccountEmail: typeof Wrapper.sendRecoverAccountEmail;
export declare let sendEmail: typeof Wrapper.sendEmail;
export declare let getGeneratedOptions: typeof Wrapper.getGeneratedOptions;
