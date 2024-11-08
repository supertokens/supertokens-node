// @ts-nocheck
import Recipe from "./recipe";
import SuperTokensError from "./error";
import { RecipeInterface, APIOptions, APIInterface, TypeWebauthnEmailDeliveryInput, CredentialPayload } from "./types";
import RecipeUserId from "../../recipeUserId";
import { SessionContainerInterface } from "../session/types";
import { User } from "../../types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static registerOptions(
        email: string | undefined,
        recoverAccountToken: string | undefined,
        relyingPartyId: string,
        relyingPartyName: string,
        origin: string,
        timeout: number,
        attestation: "none" | "indirect" | "direct" | "enterprise" | undefined,
        tenantId: string,
        userContext: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              webauthnGeneratedOptionsId: string;
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
                  residentKey: "required" | "preferred" | "discouraged";
                  userVerification: "required" | "preferred" | "discouraged";
              };
          }
        | {
              status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
          }
        | {
              status: "INVALID_EMAIL_ERROR";
              err: string;
          }
    >;
    static signInOptions(
        relyingPartyId: string,
        origin: string,
        timeout: number,
        tenantId: string,
        userContext: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              webauthnGeneratedOptionsId: string;
              challenge: string;
              timeout: number;
              userVerification: "required" | "preferred" | "discouraged";
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;
    static signIn(
        tenantId: string,
        webauthnGeneratedOptionsId: string,
        credential: CredentialPayload,
        session?: undefined,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;
    static signIn(
        tenantId: string,
        webauthnGeneratedOptionsId: string,
        credential: CredentialPayload,
        session: SessionContainerInterface,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;
    static verifyCredentials(
        tenantId: string,
        webauthnGeneratedOptionsId: string,
        credential: CredentialPayload,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;
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
    static generateRecoverAccountToken(
        tenantId: string,
        userId: string,
        email: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              token: string;
          }
        | {
              status: "UNKNOWN_USER_ID_ERROR";
          }
    >;
    static recoverAccount(
        tenantId: string,
        webauthnGeneratedOptionsId: string,
        token: string,
        credential: CredentialPayload,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK" | "WRONG_CREDENTIALS_ERROR" | "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
          }
        | {
              status: "INVALID_AUTHENTICATOR_ERROR";
              failureReason: string;
          }
    >;
    static consumeRecoverAccountToken(
        tenantId: string,
        token: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              email: string;
              userId: string;
          }
        | {
              status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
          }
    >;
    static registerCredential(input: {
        recipeUserId: RecipeUserId;
        tenantId: string;
        webauthnGeneratedOptionsId: string;
        credential: CredentialPayload;
        userContext?: Record<string, any>;
    }): Promise<
        | {
              status: "OK" | "WRONG_CREDENTIALS_ERROR";
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
        | {
              status: "INVALID_AUTHENTICATOR_ERROR";
              reason: string;
          }
    >;
    static createRecoverAccountLink(
        tenantId: string,
        userId: string,
        email: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              link: string;
          }
        | {
              status: "UNKNOWN_USER_ID_ERROR";
          }
    >;
    static sendRecoverAccountEmail(
        tenantId: string,
        userId: string,
        email: string,
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK" | "UNKNOWN_USER_ID_ERROR";
    }>;
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
