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
    APIInterface,
    APIOptions,
    TypeWebauthnEmailDeliveryInput,
    CredentialPayload,
    UserVerification,
    ResidentKey,
    Attestation,
    AuthenticationPayload,
} from "./types";
import { DEFAULT_TENANT_ID } from "../multitenancy/constants";
import { getRecoverAccountLink } from "./utils";
import { getRequestFromUserContext, getUser } from "../..";
import { getUserContext } from "../../utils";
import { SessionContainerInterface } from "../session/types";
import {
    DEFAULT_REGISTER_OPTIONS_RESIDENT_KEY,
    DEFAULT_REGISTER_OPTIONS_SUPPORTED_ALGORITHM_IDS,
    DEFAULT_REGISTER_OPTIONS_USER_VERIFICATION,
    DEFAULT_SIGNIN_OPTIONS_USER_VERIFICATION,
    DEFAULT_REGISTER_OPTIONS_TIMEOUT,
    DEFAULT_REGISTER_OPTIONS_ATTESTATION,
    DEFAULT_SIGNIN_OPTIONS_TIMEOUT,
    DEFAULT_REGISTER_OPTIONS_USER_PRESENCE,
    DEFAULT_SIGNIN_OPTIONS_USER_PRESENCE,
} from "./constants";
import { BaseRequest } from "../../framework";

export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static async registerOptions({
        residentKey = DEFAULT_REGISTER_OPTIONS_RESIDENT_KEY,
        userVerification = DEFAULT_REGISTER_OPTIONS_USER_VERIFICATION,
        userPresence = DEFAULT_REGISTER_OPTIONS_USER_PRESENCE,
        attestation = DEFAULT_REGISTER_OPTIONS_ATTESTATION,
        supportedAlgorithmIds = DEFAULT_REGISTER_OPTIONS_SUPPORTED_ALGORITHM_IDS,
        timeout = DEFAULT_REGISTER_OPTIONS_TIMEOUT,
        tenantId = DEFAULT_TENANT_ID,
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
        | { relyingPartyId: string; relyingPartyName: string; origin: string }
        | { request: BaseRequest; relyingPartyId?: string; relyingPartyName?: string; origin?: string }
    ) &
        (
            | {
                  email: string;
                  displayName?: string;
              }
            | { recoverAccountToken: string }
        )) {
        let emailOrRecoverAccountToken:
            | { email: string; displayName: string | undefined }
            | { recoverAccountToken: string };
        if ("email" in rest || "recoverAccountToken" in rest) {
            if ("email" in rest) {
                emailOrRecoverAccountToken = {
                    email: rest.email,
                    displayName: rest.displayName,
                };
            } else {
                emailOrRecoverAccountToken = { recoverAccountToken: rest.recoverAccountToken };
            }
        } else {
            return { status: "INVALID_EMAIL_ERROR", err: "Email is missing" };
        }

        let relyingPartyId: string;
        let relyingPartyName: string;
        let origin: string;
        if ("request" in rest) {
            origin =
                rest.origin ||
                (await Recipe.getInstanceOrThrowError().config.getOrigin({
                    request: rest.request,
                    tenantId: tenantId,
                    userContext: getUserContext(userContext),
                }));
            relyingPartyId =
                rest.relyingPartyId ||
                (await Recipe.getInstanceOrThrowError().config.getRelyingPartyId({
                    request: rest.request,
                    tenantId: tenantId,
                    userContext: getUserContext(userContext),
                }));
            relyingPartyName =
                rest.relyingPartyName ||
                (await Recipe.getInstanceOrThrowError().config.getRelyingPartyName({
                    tenantId: tenantId,
                    userContext: getUserContext(userContext),
                }));
        } else {
            if (!rest.origin) {
                throw new Error({ type: "BAD_INPUT_ERROR", message: "Origin missing from the input" });
            }
            if (!rest.relyingPartyId) {
                throw new Error({ type: "BAD_INPUT_ERROR", message: "RelyingPartyId missing from the input" });
            }
            if (!rest.relyingPartyName) {
                throw new Error({ type: "BAD_INPUT_ERROR", message: "RelyingPartyName missing from the input" });
            }

            origin = rest.origin;
            relyingPartyId = rest.relyingPartyId;
            relyingPartyName = rest.relyingPartyName;
        }

        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.registerOptions({
            ...emailOrRecoverAccountToken,
            residentKey,
            userVerification,
            userPresence,
            supportedAlgorithmIds,
            relyingPartyId,
            relyingPartyName,
            origin,
            timeout,
            attestation,
            tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static async signInOptions({
        tenantId = DEFAULT_TENANT_ID,
        userVerification = DEFAULT_SIGNIN_OPTIONS_USER_VERIFICATION,
        userPresence = DEFAULT_SIGNIN_OPTIONS_USER_PRESENCE,
        timeout = DEFAULT_SIGNIN_OPTIONS_TIMEOUT,
        userContext,
        ...rest
    }: {
        timeout?: number;
        userVerification?: UserVerification;
        userPresence?: boolean;
        tenantId?: string;
        userContext?: Record<string, any>;
    } & (
        | { relyingPartyId: string; relyingPartyName: string; origin: string }
        | { request: BaseRequest; relyingPartyId?: string; relyingPartyName?: string; origin?: string }
    )) {
        let origin: string;
        let relyingPartyId: string;
        let relyingPartyName: string;
        if ("request" in rest) {
            relyingPartyId =
                rest.relyingPartyId ||
                (await Recipe.getInstanceOrThrowError().config.getRelyingPartyId({
                    request: rest.request,
                    tenantId: tenantId,
                    userContext: getUserContext(userContext),
                }));
            relyingPartyName =
                rest.relyingPartyName ||
                (await Recipe.getInstanceOrThrowError().config.getRelyingPartyName({
                    tenantId: tenantId,
                    userContext: getUserContext(userContext),
                }));
            origin =
                rest.origin ||
                (await Recipe.getInstanceOrThrowError().config.getOrigin({
                    request: rest.request,
                    tenantId: tenantId,
                    userContext: getUserContext(userContext),
                }));
        } else {
            if (!rest.relyingPartyId) {
                throw new Error({ type: "BAD_INPUT_ERROR", message: "RelyingPartyId missing from the input" });
            }
            if (!rest.relyingPartyName) {
                throw new Error({ type: "BAD_INPUT_ERROR", message: "RelyingPartyName missing from the input" });
            }
            if (!rest.origin) {
                throw new Error({ type: "BAD_INPUT_ERROR", message: "Origin missing from the input" });
            }
            relyingPartyId = rest.relyingPartyId;
            relyingPartyName = rest.relyingPartyName;
            origin = rest.origin;
        }

        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signInOptions({
            relyingPartyId,
            relyingPartyName,
            origin,
            timeout,
            tenantId,
            userVerification,
            userPresence,
            userContext: getUserContext(userContext),
        });
    }

    static getGeneratedOptions({
        webauthnGeneratedOptionsId,
        tenantId = DEFAULT_TENANT_ID,
        userContext,
    }: {
        webauthnGeneratedOptionsId: string;
        tenantId?: string;
        userContext?: Record<string, any>;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getGeneratedOptions({
            webauthnGeneratedOptionsId,
            tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static signUp({
        tenantId = DEFAULT_TENANT_ID,
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
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signUp({
            webauthnGeneratedOptionsId,
            credential,
            session,
            shouldTryLinkingWithSessionUser: !!session,
            tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static signIn({
        tenantId = DEFAULT_TENANT_ID,
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
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signIn({
            webauthnGeneratedOptionsId,
            credential,
            session,
            shouldTryLinkingWithSessionUser: !!session,
            tenantId,
            userContext: getUserContext(userContext),
        });
    }

    static async verifyCredentials({
        tenantId = DEFAULT_TENANT_ID,
        webauthnGeneratedOptionsId,
        credential,
        userContext,
    }: {
        tenantId?: string;
        webauthnGeneratedOptionsId: string;
        credential: AuthenticationPayload;
        userContext?: Record<string, any>;
    }) {
        const resp = await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.verifyCredentials({
            webauthnGeneratedOptionsId,
            credential,
            tenantId,
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
    static generateRecoverAccountToken({
        tenantId = DEFAULT_TENANT_ID,
        userId,
        email,
        userContext,
    }: {
        tenantId?: string;
        userId: string;
        email: string;
        userContext?: Record<string, any>;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.generateRecoverAccountToken({
            userId,
            email,
            tenantId,
            userContext: getUserContext(userContext),
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

    static consumeRecoverAccountToken({
        tenantId = DEFAULT_TENANT_ID,
        token,
        userContext,
    }: {
        tenantId?: string;
        token: string;
        userContext?: Record<string, any>;
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.consumeRecoverAccountToken({
            token,
            tenantId,
            userContext: getUserContext(userContext),
        });
    }

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
    }) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.registerCredential({
            recipeUserId,
            webauthnGeneratedOptionsId,
            credential,
            userContext: getUserContext(userContext),
        });
    }

    static async createRecoverAccountLink({
        tenantId = DEFAULT_TENANT_ID,
        userId,
        email,
        userContext,
    }: {
        tenantId?: string;
        userId: string;
        email: string;
        userContext?: Record<string, any>;
    }) {
        let token = await this.generateRecoverAccountToken({ tenantId, userId, email, userContext });
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
        tenantId = DEFAULT_TENANT_ID,
        userId,
        email,
        userContext,
    }: {
        tenantId?: string;
        userId: string;
        email: string;
        userContext?: Record<string, any>;
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
            tenantId: input.tenantId || DEFAULT_TENANT_ID,
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

export let getGeneratedOptions = Wrapper.getGeneratedOptions;
