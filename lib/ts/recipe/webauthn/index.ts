/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

import Recipe from "./recipe";
import SuperTokensError from "./error";
import {
    RecipeInterface,
    APIOptions,
    APIInterface,
    TypeWebauthnEmailDeliveryInput,
    CredentialPayload,
    UserVerification,
    ResidentKey,
} from "./types";
import RecipeUserId from "../../recipeUserId";
import { DEFAULT_TENANT_ID } from "../multitenancy/constants";
import { getRecoverAccountLink } from "./utils";
import { getRequestFromUserContext, getUser } from "../..";
import { getUserContext } from "../../utils";
import { SessionContainerInterface } from "../session/types";
import { User } from "../../types";
import {
    DEFAULT_REGISTER_OPTIONS_REQUIRE_RESIDENT_KEY,
    DEFAULT_REGISTER_OPTIONS_RESIDENT_KEY,
    DEFAULT_REGISTER_OPTIONS_SUPPORTED_ALGORITHM_IDS,
    DEFAULT_REGISTER_OPTIONS_USER_VERIFICATION,
    DEFAULT_SIGNIN_OPTIONS_USER_VERIFICATION,
} from "./constants";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static async registerOptions(
        email: string | undefined,
        recoverAccountToken: string | undefined,
        relyingPartyId: string,
        relyingPartyName: string,
        origin: string,
        timeout: number,
        attestation: "none" | "indirect" | "direct" | "enterprise" = "none",
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
                  residentKey: ResidentKey;
                  userVerification: UserVerification;
              };
          }
        | { status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR" }
        | { status: "INVALID_EMAIL_ERROR"; err: string }
    > {
        let payload: { email: string } | { recoverAccountToken: string } | null = email
            ? { email }
            : recoverAccountToken
            ? { recoverAccountToken }
            : null;

        if (!payload) {
            return { status: "INVALID_EMAIL_ERROR", err: "Email is missing" };
        }

        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.registerOptions({
            requireResidentKey: DEFAULT_REGISTER_OPTIONS_REQUIRE_RESIDENT_KEY,
            residentKey: DEFAULT_REGISTER_OPTIONS_RESIDENT_KEY,
            userVerification: DEFAULT_REGISTER_OPTIONS_USER_VERIFICATION,
            supportedAlgorithmIds: DEFAULT_REGISTER_OPTIONS_SUPPORTED_ALGORITHM_IDS,
            ...payload,
            relyingPartyId,
            relyingPartyName,
            origin,
            timeout,
            attestation,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
            userContext: getUserContext(userContext),
        });
    }

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
              userVerification: UserVerification;
          }
        | { status: "WRONG_CREDENTIALS_ERROR" }
    > {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signInOptions({
            userVerification: DEFAULT_SIGNIN_OPTIONS_USER_VERIFICATION,
            relyingPartyId,
            origin,
            timeout,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static signUp(
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
        | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
        | { status: "WRONG_CREDENTIALS_ERROR" }
        | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string }
    >;
    static signUp(
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
        | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
        | { status: "WRONG_CREDENTIALS_ERROR" }
        | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;
    static signUp(
        tenantId: string,
        webauthnGeneratedOptionsId: string,
        credential: CredentialPayload,
        session?: SessionContainerInterface,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
        | { status: "WRONG_CREDENTIALS_ERROR" }
        | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    > {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signUp({
            webauthnGeneratedOptionsId,
            credential,
            session,
            shouldTryLinkingWithSessionUser: !!session,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static signIn(
        tenantId: string,
        webauthnGeneratedOptionsId: string,
        credential: CredentialPayload,
        session?: undefined,
        userContext?: Record<string, any>
    ): Promise<{ status: "OK"; user: User; recipeUserId: RecipeUserId } | { status: "WRONG_CREDENTIALS_ERROR" }>;
    static signIn(
        tenantId: string,
        webauthnGeneratedOptionsId: string,
        credential: CredentialPayload,
        session: SessionContainerInterface,
        userContext?: Record<string, any>
    ): Promise<
        | { status: "OK"; user: User; recipeUserId: RecipeUserId }
        | { status: "WRONG_CREDENTIALS_ERROR" }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;
    static signIn(
        tenantId: string,
        webauthnGeneratedOptionsId: string,
        credential: CredentialPayload,
        session?: SessionContainerInterface,
        userContext?: Record<string, any>
    ): Promise<
        | { status: "OK"; user: User; recipeUserId: RecipeUserId }
        | { status: "WRONG_CREDENTIALS_ERROR" }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    > {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signIn({
            webauthnGeneratedOptionsId,
            credential,
            session,
            shouldTryLinkingWithSessionUser: !!session,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static async verifyCredentials(
        tenantId: string,
        webauthnGeneratedOptionsId: string,
        credential: CredentialPayload,
        userContext?: Record<string, any>
    ): Promise<{ status: "OK" } | { status: "WRONG_CREDENTIALS_ERROR" }> {
        const resp = await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.verifyCredentials({
            webauthnGeneratedOptionsId,
            credential,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
            userContext: getUserContext(userContext),
        });

        // Here we intentionally skip the user and recipeUserId props, because we do not want apps to accidentally use this to sign in
        return {
            status: resp.status,
        };
    }

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
    ): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.generateRecoverAccountToken({
            userId,
            email,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static async recoverAccount(
        tenantId: string,
        webauthnGeneratedOptionsId: string,
        token: string,
        credential: CredentialPayload,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK" | "WRONG_CREDENTIALS_ERROR" | "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
          }
        | { status: "INVALID_AUTHENTICATOR_ERROR"; failureReason: string }
    > {
        const consumeResp = await Wrapper.consumeRecoverAccountToken(tenantId, token, userContext);

        if (consumeResp.status !== "OK") {
            return consumeResp;
        }

        let result = await Wrapper.registerCredential({
            recipeUserId: new RecipeUserId(consumeResp.userId),
            webauthnGeneratedOptionsId,
            credential,
            tenantId,
            userContext,
        });

        if (result.status === "INVALID_AUTHENTICATOR_ERROR") {
            return {
                status: "INVALID_AUTHENTICATOR_ERROR",
                failureReason: result.reason,
            };
        }
        return {
            status: result.status,
        };
    }

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
        | { status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR" }
    > {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.consumeRecoverAccountToken({
            token,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
            userContext: getUserContext(userContext),
        });
    }

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
        | { status: "WRONG_CREDENTIALS_ERROR" }
        | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string }
    > {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.registerCredential({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static async createRecoverAccountLink(
        tenantId: string,
        userId: string,
        email: string,
        userContext?: Record<string, any>
    ): Promise<{ status: "OK"; link: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
        const ctx = getUserContext(userContext);
        let token = await this.generateRecoverAccountToken(tenantId, userId, email, ctx);
        if (token.status === "UNKNOWN_USER_ID_ERROR") {
            return token;
        }

        const recipeInstance = Recipe.getInstanceOrThrowError();
        return {
            status: "OK",
            link: getRecoverAccountLink({
                appInfo: recipeInstance.getAppInfo(),
                token: token.token,
                tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
                request: getRequestFromUserContext(ctx),
                userContext: ctx,
            }),
        };
    }

    static async sendRecoverAccountEmail(
        tenantId: string,
        userId: string,
        email: string,
        userContext?: Record<string, any>
    ): Promise<{ status: "OK" | "UNKNOWN_USER_ID_ERROR" }> {
        const user = await getUser(userId, userContext);
        if (!user) {
            return { status: "UNKNOWN_USER_ID_ERROR" };
        }

        const loginMethod = user.loginMethods.find((m) => m.recipeId === "webauthn" && m.hasSameEmailAs(email));
        if (!loginMethod) {
            return { status: "UNKNOWN_USER_ID_ERROR" };
        }

        let link = await this.createRecoverAccountLink(tenantId, userId, email, userContext);
        if (link.status === "UNKNOWN_USER_ID_ERROR") {
            return link;
        }

        await sendEmail({
            recoverAccountLink: link.link,
            type: "RECOVER_ACCOUNT",
            user: {
                id: user.id,
                recipeUserId: loginMethod.recipeUserId,
                email: loginMethod.email!,
            },
            tenantId,
            userContext,
        });

        return {
            status: "OK",
        };
    }

    static async sendEmail(
        input: TypeWebauthnEmailDeliveryInput & { userContext?: Record<string, any> }
    ): Promise<void> {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return await recipeInstance.emailDelivery.ingredientInterfaceImpl.sendEmail({
            ...input,
            tenantId: input.tenantId === undefined ? DEFAULT_TENANT_ID : input.tenantId,
            userContext: getUserContext(input.userContext),
        });
    }
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let registerOptions = Wrapper.registerOptions;

export let signInOptions = Wrapper.signInOptions;

export let signIn = Wrapper.signIn;

export let verifyCredentials = Wrapper.verifyCredentials;

export let generateRecoverAccountToken = Wrapper.generateRecoverAccountToken;

export let recoverAccount = Wrapper.recoverAccount;

export let consumeRecoverAccountToken = Wrapper.consumeRecoverAccountToken;

export let registerCredential = Wrapper.registerCredential;

export type { RecipeInterface, APIOptions, APIInterface };

export let createRecoverAccountLink = Wrapper.createRecoverAccountLink;

export let sendRecoverAccountEmail = Wrapper.sendRecoverAccountEmail;

export let sendEmail = Wrapper.sendEmail;
