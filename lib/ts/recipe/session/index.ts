/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
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

import SuperTokensError from "./error";
import {
    VerifySessionOptions,
    SessionContainerInterface as SessionContainer,
    SessionInformation,
    APIInterface,
    APIOptions,
    SessionClaimValidator,
    SessionClaim,
    ClaimValidationError,
    RecipeInterface,
} from "./types";
import Recipe from "./recipe";
import { JSONObject, UserContext } from "../../types";
import { getRequiredClaimValidators } from "./utils";
import { createNewSessionInRequest, getSessionFromRequest, refreshSessionInRequest } from "./sessionRequestFunctions";
import RecipeUserId from "../../recipeUserId";
import { getUser } from "../..";
import { DEFAULT_TENANT_ID } from "../multitenancy/constants";
import { protectedProps } from "./constants";
import { getUserContext } from "../../utils";

export default class SessionWrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static async createNewSession(
        req: any,
        res: any,
        tenantId: string,
        recipeUserId: RecipeUserId,
        accessTokenPayload: any = {},
        sessionDataInDatabase: any = {},
        userContext?: Record<string, any>
    ) {
        const recipeInstance = Recipe.getInstanceOrThrowError();
        const config = recipeInstance.config;
        const appInfo = recipeInstance.getAppInfo();

        let user = await getUser(recipeUserId.getAsString(), userContext);
        let userId = recipeUserId.getAsString();
        if (user !== undefined) {
            userId = user.id;
        }

        return await createNewSessionInRequest({
            req,
            res,
            userContext: getUserContext(userContext),
            recipeInstance,
            accessTokenPayload,
            userId,
            recipeUserId,
            config,
            appInfo,
            sessionDataInDatabase,
            tenantId,
        });
    }

    static async createNewSessionWithoutRequestResponse(
        tenantId: string,
        recipeUserId: RecipeUserId,
        accessTokenPayload: any = {},
        sessionDataInDatabase: any = {},
        disableAntiCsrf: boolean = false,
        userContext?: Record<string, any>
    ) {
        const ctx = getUserContext(userContext);
        const recipeInstance = Recipe.getInstanceOrThrowError();
        const claimsAddedByOtherRecipes = recipeInstance.getClaimsAddedByOtherRecipes();
        const appInfo = recipeInstance.getAppInfo();
        const issuer = appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous();

        let finalAccessTokenPayload = {
            ...accessTokenPayload,
            iss: issuer,
        };

        for (const prop of protectedProps) {
            delete finalAccessTokenPayload[prop];
        }

        let user = await getUser(recipeUserId.getAsString(), ctx);
        let userId = recipeUserId.getAsString();
        if (user !== undefined) {
            userId = user.id;
        }

        for (const claim of claimsAddedByOtherRecipes) {
            const update = await claim.build(userId, recipeUserId, tenantId, finalAccessTokenPayload, ctx);
            finalAccessTokenPayload = {
                ...finalAccessTokenPayload,
                ...update,
            };
        }
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createNewSession({
            userId,
            recipeUserId,
            accessTokenPayload: finalAccessTokenPayload,
            sessionDataInDatabase,
            disableAntiCsrf,
            tenantId,
            userContext: ctx,
        });
    }

    static async validateClaimsForSessionHandle(
        sessionHandle: string,
        overrideGlobalClaimValidators?: (
            globalClaimValidators: SessionClaimValidator[],
            sessionInfo: SessionInformation,
            userContext: UserContext
        ) => Promise<SessionClaimValidator[]> | SessionClaimValidator[],
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "SESSION_DOES_NOT_EXIST_ERROR";
          }
        | {
              status: "OK";
              invalidClaims: ClaimValidationError[];
          }
    > {
        const ctx = getUserContext(userContext);
        const recipeImpl = Recipe.getInstanceOrThrowError().recipeInterfaceImpl;

        const sessionInfo = await recipeImpl.getSessionInformation({
            sessionHandle,
            userContext: ctx,
        });
        if (sessionInfo === undefined) {
            return {
                status: "SESSION_DOES_NOT_EXIST_ERROR",
            };
        }

        const claimValidatorsAddedByOtherRecipes = Recipe.getInstanceOrThrowError().getClaimValidatorsAddedByOtherRecipes();
        const globalClaimValidators: SessionClaimValidator[] = await recipeImpl.getGlobalClaimValidators({
            userId: sessionInfo.userId,
            recipeUserId: sessionInfo.recipeUserId,
            tenantId: sessionInfo.tenantId,
            claimValidatorsAddedByOtherRecipes,
            userContext: ctx,
        });

        const claimValidators =
            overrideGlobalClaimValidators !== undefined
                ? await overrideGlobalClaimValidators(globalClaimValidators, sessionInfo, ctx)
                : globalClaimValidators;

        let claimValidationResponse = await recipeImpl.validateClaims({
            userId: sessionInfo.userId,
            recipeUserId: sessionInfo.recipeUserId,
            accessTokenPayload: sessionInfo.customClaimsInAccessTokenPayload,
            claimValidators,
            userContext: ctx,
        });

        if (claimValidationResponse.accessTokenPayloadUpdate !== undefined) {
            if (
                !(await recipeImpl.mergeIntoAccessTokenPayload({
                    sessionHandle,
                    accessTokenPayloadUpdate: claimValidationResponse.accessTokenPayloadUpdate,
                    userContext: ctx,
                }))
            ) {
                return {
                    status: "SESSION_DOES_NOT_EXIST_ERROR",
                };
            }
        }
        return {
            status: "OK",
            invalidClaims: claimValidationResponse.invalidClaims,
        };
    }

    static getSession(req: any, res: any): Promise<SessionContainer>;
    static getSession(
        req: any,
        res: any,
        options?: VerifySessionOptions & { sessionRequired?: true },
        userContext?: Record<string, any>
    ): Promise<SessionContainer>;
    static getSession(
        req: any,
        res: any,
        options?: VerifySessionOptions & { sessionRequired: false },
        userContext?: Record<string, any>
    ): Promise<SessionContainer | undefined>;
    static getSession(
        req: any,
        res: any,
        options?: VerifySessionOptions,
        userContext?: Record<string, any>
    ): Promise<SessionContainer | undefined>;
    static async getSession(req: any, res: any, options?: VerifySessionOptions, userContext?: Record<string, any>) {
        const recipeInstance = Recipe.getInstanceOrThrowError();
        const config = recipeInstance.config;
        const recipeInterfaceImpl = recipeInstance.recipeInterfaceImpl;

        return getSessionFromRequest({
            req,
            res,
            recipeInterfaceImpl,
            config,
            options,
            userContext: getUserContext(userContext), // userContext is normalized inside the function
        });
    }

    /**
     * Tries to validate an access token and build a Session object from it.
     *
     * Notes about anti-csrf checking:
     * - if the `antiCsrf` is set to VIA_HEADER in the Session recipe config you have to handle anti-csrf checking before calling this function and set antiCsrfCheck to false in the options.
     * - you can disable anti-csrf checks by setting antiCsrf to NONE in the Session recipe config. We only recommend this if you are always getting the access-token from the Authorization header.
     * - if the antiCsrf check fails the returned satatus will be TRY_REFRESH_TOKEN_ERROR
     *
     * Results:
     * OK: The session was successfully validated, including claim validation
     * CLAIM_VALIDATION_ERROR: While the access token is valid, one or more claim validators have failed. Our frontend SDKs expect a 403 response the contents matching the value returned from this function.
     * TRY_REFRESH_TOKEN_ERROR: This means, that the access token structure was valid, but it didn't pass validation for some reason and the user should call the refresh API.
     *  You can send a 401 response to trigger this behaviour if you are using our frontend SDKs
     * UNAUTHORISED: This means that the access token likely doesn't belong to a SuperTokens session. If this is unexpected, it's best handled by sending a 401 response.
     *
     * @param accessToken The access token extracted from the authorization header or cookies
     * @param antiCsrfToken The anti-csrf token extracted from the authorization header or cookies. Can be undefined if antiCsrfCheck is false
     * @param options Same options objects as getSession or verifySession takes, except the `sessionRequired` prop, which is always set to true in this function
     * @param userContext User context
     */
    static async getSessionWithoutRequestResponse(
        accessToken: string,
        antiCsrfToken?: string
    ): Promise<SessionContainer>;
    static async getSessionWithoutRequestResponse(
        accessToken: string,
        antiCsrfToken?: string,
        options?: VerifySessionOptions & { sessionRequired?: true },
        userContext?: Record<string, any>
    ): Promise<SessionContainer>;
    static async getSessionWithoutRequestResponse(
        accessToken: string,
        antiCsrfToken?: string,
        options?: VerifySessionOptions & { sessionRequired: false },
        userContext?: Record<string, any>
    ): Promise<SessionContainer | undefined>;
    static async getSessionWithoutRequestResponse(
        accessToken: string,
        antiCsrfToken?: string,
        options?: VerifySessionOptions,
        userContext?: Record<string, any>
    ): Promise<SessionContainer | undefined>;
    static async getSessionWithoutRequestResponse(
        accessToken: string,
        antiCsrfToken?: string,
        options?: VerifySessionOptions,
        userContext?: Record<string, any>
    ): Promise<SessionContainer | undefined> {
        const ctx = getUserContext(userContext);
        const recipeInterfaceImpl = Recipe.getInstanceOrThrowError().recipeInterfaceImpl;
        const session = await recipeInterfaceImpl.getSession({
            accessToken,
            antiCsrfToken,
            options,
            userContext: ctx,
        });

        if (session !== undefined) {
            const claimValidators = await getRequiredClaimValidators(
                session,
                options?.overrideGlobalClaimValidators,
                ctx
            );

            await session.assertClaims(claimValidators, ctx);
        }
        return session;
    }

    static getSessionInformation(sessionHandle: string, userContext?: Record<string, any>) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getSessionInformation({
            sessionHandle,
            userContext: getUserContext(userContext),
        });
    }

    static refreshSession(req: any, res: any, userContext?: Record<string, any>) {
        const recipeInstance = Recipe.getInstanceOrThrowError();
        const config = recipeInstance.config;
        const recipeInterfaceImpl = recipeInstance.recipeInterfaceImpl;

        return refreshSessionInRequest({
            res,
            req,
            userContext: getUserContext(userContext),
            config,
            recipeInterfaceImpl,
        });
    }

    static refreshSessionWithoutRequestResponse(
        refreshToken: string,
        disableAntiCsrf: boolean = false,
        antiCsrfToken?: string,
        userContext?: Record<string, any>
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.refreshSession({
            refreshToken,
            disableAntiCsrf,
            antiCsrfToken,
            userContext: getUserContext(userContext),
        });
    }
    static revokeAllSessionsForUser(
        userId: string,
        revokeSessionsForLinkedAccounts: boolean = true,
        tenantId?: string,
        userContext?: Record<string, any>
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeAllSessionsForUser({
            userId,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
            revokeSessionsForLinkedAccounts,
            userContext: getUserContext(userContext),
        });
    }

    static getAllSessionHandlesForUser(
        userId: string,
        fetchSessionsForAllLinkedAccounts: boolean = true,
        tenantId?: string,
        userContext?: Record<string, any>
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getAllSessionHandlesForUser({
            userId,
            tenantId: tenantId === undefined ? DEFAULT_TENANT_ID : tenantId,
            fetchAcrossAllTenants: tenantId === undefined,
            fetchSessionsForAllLinkedAccounts,
            userContext: getUserContext(userContext),
        });
    }

    static revokeSession(sessionHandle: string, userContext?: Record<string, any>) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeSession({
            sessionHandle,
            userContext: getUserContext(userContext),
        });
    }

    static revokeMultipleSessions(sessionHandles: string[], userContext?: Record<string, any>) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeMultipleSessions({
            sessionHandles,
            userContext: getUserContext(userContext),
        });
    }

    static updateSessionDataInDatabase(sessionHandle: string, newSessionData: any, userContext?: Record<string, any>) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateSessionDataInDatabase({
            sessionHandle,
            newSessionData,
            userContext: getUserContext(userContext),
        });
    }

    static mergeIntoAccessTokenPayload(
        sessionHandle: string,
        accessTokenPayloadUpdate: JSONObject,
        userContext?: Record<string, any>
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.mergeIntoAccessTokenPayload({
            sessionHandle,
            accessTokenPayloadUpdate,
            userContext: getUserContext(userContext),
        });
    }

    static createJWT(
        payload?: any,
        validitySeconds?: number,
        useStaticSigningKey?: boolean,
        userContext?: Record<string, any>
    ) {
        return Recipe.getInstanceOrThrowError().openIdRecipe.recipeImplementation.createJWT({
            payload,
            validitySeconds,
            useStaticSigningKey,
            userContext: getUserContext(userContext),
        });
    }

    static getJWKS(userContext?: Record<string, any>) {
        return Recipe.getInstanceOrThrowError().openIdRecipe.recipeImplementation.getJWKS({
            userContext: getUserContext(userContext),
        });
    }

    static getOpenIdDiscoveryConfiguration(userContext?: Record<string, any>) {
        return Recipe.getInstanceOrThrowError().openIdRecipe.recipeImplementation.getOpenIdDiscoveryConfiguration({
            userContext: getUserContext(userContext),
        });
    }

    static fetchAndSetClaim(
        sessionHandle: string,
        claim: SessionClaim<any>,
        userContext?: Record<string, any>
    ): Promise<boolean> {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.fetchAndSetClaim({
            sessionHandle,
            claim,
            userContext: getUserContext(userContext),
        });
    }

    static setClaimValue<T>(
        sessionHandle: string,
        claim: SessionClaim<T>,
        value: T,
        userContext?: Record<string, any>
    ): Promise<boolean> {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.setClaimValue({
            sessionHandle,
            claim,
            value,
            userContext: getUserContext(userContext),
        });
    }

    static getClaimValue<T>(
        sessionHandle: string,
        claim: SessionClaim<T>,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "SESSION_DOES_NOT_EXIST_ERROR";
          }
        | {
              status: "OK";
              value: T | undefined;
          }
    > {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getClaimValue({
            sessionHandle,
            claim,
            userContext: getUserContext(userContext),
        });
    }

    static removeClaim(
        sessionHandle: string,
        claim: SessionClaim<any>,
        userContext?: Record<string, any>
    ): Promise<boolean> {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.removeClaim({
            sessionHandle,
            claim,
            userContext: getUserContext(userContext),
        });
    }
}

export let init = SessionWrapper.init;

export let createNewSession = SessionWrapper.createNewSession;
export let createNewSessionWithoutRequestResponse = SessionWrapper.createNewSessionWithoutRequestResponse;

export let getSession = SessionWrapper.getSession;
export let getSessionWithoutRequestResponse = SessionWrapper.getSessionWithoutRequestResponse;

export let getSessionInformation = SessionWrapper.getSessionInformation;

export let refreshSession = SessionWrapper.refreshSession;
export let refreshSessionWithoutRequestResponse = SessionWrapper.refreshSessionWithoutRequestResponse;

export let revokeAllSessionsForUser = SessionWrapper.revokeAllSessionsForUser;

export let getAllSessionHandlesForUser = SessionWrapper.getAllSessionHandlesForUser;

export let revokeSession = SessionWrapper.revokeSession;

export let revokeMultipleSessions = SessionWrapper.revokeMultipleSessions;

export let updateSessionDataInDatabase = SessionWrapper.updateSessionDataInDatabase;

export let mergeIntoAccessTokenPayload = SessionWrapper.mergeIntoAccessTokenPayload;

export let fetchAndSetClaim = SessionWrapper.fetchAndSetClaim;
export let setClaimValue = SessionWrapper.setClaimValue;
export let getClaimValue = SessionWrapper.getClaimValue;
export let removeClaim = SessionWrapper.removeClaim;
export let validateClaimsForSessionHandle = SessionWrapper.validateClaimsForSessionHandle;

export let Error = SessionWrapper.Error;

// JWT Functions
export let createJWT = SessionWrapper.createJWT;

export let getJWKS = SessionWrapper.getJWKS;

// Open id functions

export let getOpenIdDiscoveryConfiguration = SessionWrapper.getOpenIdDiscoveryConfiguration;

export type {
    VerifySessionOptions,
    RecipeInterface,
    SessionContainer,
    APIInterface,
    APIOptions,
    SessionInformation,
    SessionClaimValidator,
};
