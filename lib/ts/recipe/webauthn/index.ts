/* Copyright (c) 2025, VRAI Labs and/or its affiliates. All rights reserved.
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
    TypeWebauthnEmailDeliveryInput,
    CredentialPayload,
    UserVerification,
    ResidentKey,
    Attestation,
    AuthenticationPayload,
    RegistrationPayload,
} from "./types";
import { DEFAULT_TENANT_ID } from "../multitenancy/constants";
import { getRecoverAccountLink } from "./utils";
import { getRequestFromUserContext, getUser } from "../..";
import { getUserContext } from "../../utils";
import { SessionContainerInterface } from "../session/types";
import { RecipeInterface, APIOptions, APIInterface } from "./types";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static async registerOptions(
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
            userContext: Record<string, any>;
        } & (
            | {
                  recoverAccountToken: string;
              }
            | {
                  displayName: string | undefined;
                  email: string;
              }
        )
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.registerOptions({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static async signInOptions(input: {
        relyingPartyId: string;
        relyingPartyName: string;
        origin: string;
        userVerification: UserVerification | undefined;
        userPresence: boolean | undefined;
        timeout: number | undefined;
        tenantId: string;
        userContext: Record<string, any>;
    }) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signInOptions({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static getGeneratedOptions(input: {
        webauthnGeneratedOptionsId: string;
        tenantId: string;
        userContext: Record<string, any>;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getGeneratedOptions({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static signUp(input: {
        webauthnGeneratedOptionsId: string;
        credential: RegistrationPayload;
        session: SessionContainerInterface | undefined;
        shouldTryLinkingWithSessionUser: boolean | undefined;
        tenantId: string;
        userContext: Record<string, any>;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signUp({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static signIn(input: {
        webauthnGeneratedOptionsId: string;
        credential: AuthenticationPayload;
        session: SessionContainerInterface | undefined;
        shouldTryLinkingWithSessionUser: boolean | undefined;
        tenantId: string;
        userContext: Record<string, any>;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signIn({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static async verifyCredentials(input: {
        webauthnGeneratedOptionsId: string;
        credential: AuthenticationPayload;
        tenantId: string;
        userContext: Record<string, any>;
    }) {
        const resp = await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.verifyCredentials({
            ...input,
            userContext: getUserContext(input.userContext),
        });

        // Here we intentionally skip the user and recipeUserId props, because we do not want apps to accidentally use this to sign in
        return {
            status: resp.status,
        };
    }

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
        userContext: Record<string, any>;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.generateRecoverAccountToken({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static async recoverAccount({
        tenantId = DEFAULT_TENANT_ID,
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
    }) {
        const consumeResp = await Wrapper.consumeRecoverAccountToken({ tenantId, token, userContext });

        if (consumeResp.status !== "OK") {
            return consumeResp;
        }

        let result = await Wrapper.registerCredential({
            recipeUserId: consumeResp.userId,
            webauthnGeneratedOptionsId,
            credential,
            userContext,
        });

        return result;
    }

    static consumeRecoverAccountToken(input: { tenantId: string; token: string; userContext?: Record<string, any> }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.consumeRecoverAccountToken({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static registerCredential(input: {
        recipeUserId: string;
        webauthnGeneratedOptionsId: string;
        credential: CredentialPayload;
        userContext?: Record<string, any>;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.registerCredential({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static async createRecoverAccountLink({
        tenantId,
        userId,
        email,
        userContext,
    }: {
        tenantId: string;
        userId: string;
        email: string;
        userContext: Record<string, any>;
    }) {
        const token = await this.generateRecoverAccountToken({ tenantId, userId, email, userContext });
        if (token.status === "UNKNOWN_USER_ID_ERROR") {
            return token;
        }

        const ctx = getUserContext(userContext);
        const recipeInstance = Recipe.getInstanceOrThrowError();
        return {
            status: "OK",
            link: getRecoverAccountLink({
                appInfo: recipeInstance.getAppInfo(),
                token: token.token,
                tenantId,
                request: getRequestFromUserContext(ctx),
                userContext: ctx,
            }),
        };
    }

    static async sendRecoverAccountEmail({
        tenantId,
        userId,
        email,
        userContext,
    }: {
        tenantId: string;
        userId: string;
        email: string;
        userContext: Record<string, any>;
    }) {
        const user = await getUser(userId, userContext);
        if (!user) {
            return { status: "UNKNOWN_USER_ID_ERROR" };
        }

        const loginMethod = user.loginMethods.find((m) => m.recipeId === "webauthn" && m.hasSameEmailAs(email));
        if (!loginMethod) {
            return { status: "UNKNOWN_USER_ID_ERROR" };
        }

        let link = await this.createRecoverAccountLink({ tenantId, userId, email, userContext });
        if (link.status !== "OK") return link;

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

    static async sendEmail(input: TypeWebauthnEmailDeliveryInput & { userContext?: Record<string, any> }) {
        let recipeInstance = Recipe.getInstanceOrThrowError();
        return await recipeInstance.emailDelivery.ingredientInterfaceImpl.sendEmail({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static async getUserFromRecoverAccountToken(input: {
        token: string;
        tenantId: string;
        userContext: Record<string, any>;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserFromRecoverAccountToken({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static async removeGeneratedOptions(input: {
        webauthnGeneratedOptionsId: string;
        tenantId: string;
        userContext: Record<string, any>;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.removeGeneratedOptions({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static async removeCredential(input: {
        webauthnCredentialId: string;
        recipeUserId: string;
        userContext: Record<string, any>;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.removeCredential({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static async getCredential(input: {
        webauthnCredentialId: string;
        recipeUserId: string;
        userContext: Record<string, any>;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getCredential({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static async listCredentials(input: { recipeUserId: string; userContext: Record<string, any> }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCredentials({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let registerOptions = Wrapper.registerOptions;

export let signInOptions = Wrapper.signInOptions;

export let signIn = Wrapper.signIn;

export let signUp = Wrapper.signUp;

export let verifyCredentials = Wrapper.verifyCredentials;

export let generateRecoverAccountToken = Wrapper.generateRecoverAccountToken;

export let recoverAccount = Wrapper.recoverAccount;

export let consumeRecoverAccountToken = Wrapper.consumeRecoverAccountToken;

export let registerCredential = Wrapper.registerCredential;

export let createRecoverAccountLink = Wrapper.createRecoverAccountLink;

export let sendRecoverAccountEmail = Wrapper.sendRecoverAccountEmail;

export let sendEmail = Wrapper.sendEmail;

export let getGeneratedOptions = Wrapper.getGeneratedOptions;

export let getUserFromRecoverAccountToken = Wrapper.getUserFromRecoverAccountToken;

export let removeGeneratedOptions = Wrapper.removeGeneratedOptions;

export let removeCredential = Wrapper.removeCredential;

export let getCredential = Wrapper.getCredential;

export let listCredentials = Wrapper.listCredentials;

export type { RecipeInterface, APIOptions, APIInterface };
