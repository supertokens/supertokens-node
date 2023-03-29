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
import { JSONObject } from "../../types";
import { getRequiredClaimValidators } from "./utils";
import SessionError from "./error";
import { logDebugMessage } from "../../logger";
import { createNewSessionInRequest, getSessionFromRequest, refreshSessionInRequest } from "./sessionRequestFunctions";
// For Express
export default class SessionWrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static async createNewSession(
        req: any,
        res: any,
        userId: string,
        accessTokenPayload: any = {},
        sessionDataInDatabase: any = {},
        useDynamicAccessTokenSigningKey?: boolean,
        userContext: any = {}
    ) {
        logDebugMessage("createNewSession: Started");
        const recipeInstance = Recipe.getInstanceOrThrowError();
        const config = recipeInstance.config;
        const appInfo = recipeInstance.getAppInfo();

        return await createNewSessionInRequest({
            req,
            res,
            userContext,
            recipeInstance,
            accessTokenPayload,
            userId,
            config,
            appInfo,
            sessionDataInDatabase,
            useDynamicAccessTokenSigningKey,
        });
    }

    static async createNewSessionWithoutModifyingResponse(
        userId: string,
        accessTokenPayload: any = {},
        sessionDataInDatabase: any = {},
        disableAntiCsrf: boolean = false,
        useDynamicAccessTokenSigningKey?: boolean,
        userContext: any = {}
    ) {
        const claimsAddedByOtherRecipes = Recipe.getInstanceOrThrowError().getClaimsAddedByOtherRecipes();

        let finalAccessTokenPayload = accessTokenPayload;

        for (const claim of claimsAddedByOtherRecipes) {
            const update = await claim.build(userId, userContext);
            finalAccessTokenPayload = {
                ...finalAccessTokenPayload,
                ...update,
            };
        }

        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createNewSession({
            userId,
            accessTokenPayload: finalAccessTokenPayload,
            sessionDataInDatabase,
            useDynamicAccessTokenSigningKey,
            disableAntiCsrf,
            userContext,
        });
    }

    static async validateClaimsForSessionHandle(
        sessionHandle: string,
        overrideGlobalClaimValidators?: (
            globalClaimValidators: SessionClaimValidator[],
            sessionInfo: SessionInformation,
            userContext: any
        ) => Promise<SessionClaimValidator[]> | SessionClaimValidator[],
        userContext: any = {}
    ): Promise<
        | {
              status: "SESSION_DOES_NOT_EXIST_ERROR";
          }
        | {
              status: "OK";
              invalidClaims: ClaimValidationError[];
          }
    > {
        const recipeImpl = Recipe.getInstanceOrThrowError().recipeInterfaceImpl;

        const sessionInfo = await recipeImpl.getSessionInformation({
            sessionHandle,
            userContext,
        });
        if (sessionInfo === undefined) {
            return {
                status: "SESSION_DOES_NOT_EXIST_ERROR",
            };
        }

        const claimValidatorsAddedByOtherRecipes = Recipe.getInstanceOrThrowError().getClaimValidatorsAddedByOtherRecipes();
        const globalClaimValidators: SessionClaimValidator[] = await recipeImpl.getGlobalClaimValidators({
            userId: sessionInfo?.userId,
            claimValidatorsAddedByOtherRecipes,
            userContext,
        });

        const claimValidators =
            overrideGlobalClaimValidators !== undefined
                ? await overrideGlobalClaimValidators(globalClaimValidators, sessionInfo, userContext)
                : globalClaimValidators;

        let claimValidationResponse = await recipeImpl.validateClaims({
            userId: sessionInfo.userId,
            accessTokenPayload: sessionInfo.accessTokenPayload,
            claimValidators,
            userContext,
        });

        if (claimValidationResponse.accessTokenPayloadUpdate !== undefined) {
            if (
                !(await recipeImpl.mergeIntoAccessTokenPayload({
                    sessionHandle,
                    accessTokenPayloadUpdate: claimValidationResponse.accessTokenPayloadUpdate,
                    userContext,
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

    static async validateClaimsInJWTPayload(
        userId: string,
        jwtPayload: JSONObject,
        overrideGlobalClaimValidators?: (
            globalClaimValidators: SessionClaimValidator[],
            userId: string,
            userContext: any
        ) => Promise<SessionClaimValidator[]> | SessionClaimValidator[],
        userContext: any = {}
    ): Promise<{
        status: "OK";
        invalidClaims: ClaimValidationError[];
    }> {
        const recipeImpl = Recipe.getInstanceOrThrowError().recipeInterfaceImpl;

        const claimValidatorsAddedByOtherRecipes = Recipe.getInstanceOrThrowError().getClaimValidatorsAddedByOtherRecipes();
        const globalClaimValidators: SessionClaimValidator[] = await recipeImpl.getGlobalClaimValidators({
            userId,
            claimValidatorsAddedByOtherRecipes,
            userContext,
        });

        const claimValidators =
            overrideGlobalClaimValidators !== undefined
                ? await overrideGlobalClaimValidators(globalClaimValidators, userId, userContext)
                : globalClaimValidators;
        return recipeImpl.validateClaimsInJWTPayload({
            userId,
            jwtPayload,
            claimValidators,
            userContext,
        });
    }

    static getSession(req: any, res: any): Promise<SessionContainer>;
    static getSession(
        req: any,
        res: any,
        options?: VerifySessionOptions & { sessionRequired?: true },
        userContext?: any
    ): Promise<SessionContainer>;
    static getSession(
        req: any,
        res: any,
        options?: VerifySessionOptions & { sessionRequired: false },
        userContext?: any
    ): Promise<SessionContainer | undefined>;
    static async getSession(req: any, res: any, options?: VerifySessionOptions, userContext?: any) {
        const recipeInstance = Recipe.getInstanceOrThrowError();
        const config = recipeInstance.config;
        const recipeInterfaceImpl = recipeInstance.recipeInterfaceImpl;

        return getSessionFromRequest({
            req,
            res,
            recipeInterfaceImpl,
            config,
            options,
            userContext,
        });
    }

    static async getSessionWithoutModifyingResponse(
        accessToken: string,
        antiCsrfToken?: string,
        options?: VerifySessionOptions,
        userContext: any = {}
    ): Promise<
        | { status: "OK"; session: SessionContainer }
        | { status: "TOKEN_VALIDATION_ERROR"; error: any }
        | { status: "TRY_REFRESH_TOKEN_ERROR" }
        | { status: "CLAIM_VALIDATION_ERROR"; claimValidationErrors: ClaimValidationError[] }
    > {
        const recipeInterfaceImpl = Recipe.getInstanceOrThrowError().recipeInterfaceImpl;
        const res = await recipeInterfaceImpl.getSession({
            accessToken,
            antiCsrfToken,
            options,
            userContext,
        });

        if (res.status === "OK") {
            const claimValidators = await getRequiredClaimValidators(
                res.session,
                options?.overrideGlobalClaimValidators,
                userContext
            );
            try {
                await res.session.assertClaims(claimValidators, userContext);
            } catch (err) {
                if (err instanceof SessionError && err.type === "INVALID_CLAIMS") {
                    return {
                        status: "CLAIM_VALIDATION_ERROR",
                        claimValidationErrors: err.payload,
                    };
                }
                throw err;
            }
        }
        return res;
    }

    static getSessionInformation(sessionHandle: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getSessionInformation({
            sessionHandle,
            userContext,
        });
    }

    /*
        In all cases: if sIdRefreshToken token exists (so it's a legacy session) we clear it.
        Check http://localhost:3002/docs/contribute/decisions/session/0008 for further details and a table of expected behaviours
    */
    static async refreshSession(req: any, res: any, userContext: any = {}) {
        const recipeInstance = Recipe.getInstanceOrThrowError();
        const config = recipeInstance.config;
        const recipeInterfaceImpl = recipeInstance.recipeInterfaceImpl;

        await refreshSessionInRequest({ res, req, userContext, config, recipeInterfaceImpl });
    }

    static refreshSessionWithoutModifyingResponse(
        refreshToken: string,
        disableAntiCsrf: boolean = false,
        antiCsrfToken?: string,
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.refreshSession({
            refreshToken,
            disableAntiCsrf,
            antiCsrfToken,
            userContext,
        });
    }
    static revokeAllSessionsForUser(userId: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeAllSessionsForUser({ userId, userContext });
    }

    static getAllSessionHandlesForUser(userId: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getAllSessionHandlesForUser({
            userId,
            userContext,
        });
    }

    static revokeSession(sessionHandle: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeSession({ sessionHandle, userContext });
    }

    static revokeMultipleSessions(sessionHandles: string[], userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeMultipleSessions({
            sessionHandles,
            userContext,
        });
    }

    static updateSessionDataInDatabase(sessionHandle: string, newSessionData: any, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateSessionDataInDatabase({
            sessionHandle,
            newSessionData,
            userContext,
        });
    }

    static mergeIntoAccessTokenPayload(
        sessionHandle: string,
        accessTokenPayloadUpdate: JSONObject,
        userContext: any = {}
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.mergeIntoAccessTokenPayload({
            sessionHandle,
            accessTokenPayloadUpdate,
            userContext,
        });
    }

    static createJWT(payload?: any, validitySeconds?: number, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().openIdRecipe.recipeImplementation.createJWT({
            payload,
            validitySeconds,
            userContext,
        });
    }

    static getJWKS(userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().openIdRecipe.recipeImplementation.getJWKS({ userContext });
    }

    static getOpenIdDiscoveryConfiguration(userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().openIdRecipe.recipeImplementation.getOpenIdDiscoveryConfiguration({
            userContext,
        });
    }

    static fetchAndSetClaim(sessionHandle: string, claim: SessionClaim<any>, userContext: any = {}): Promise<boolean> {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.fetchAndSetClaim({
            sessionHandle,
            claim,
            userContext,
        });
    }

    static setClaimValue<T>(
        sessionHandle: string,
        claim: SessionClaim<T>,
        value: T,
        userContext: any = {}
    ): Promise<boolean> {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.setClaimValue({
            sessionHandle,
            claim,
            value,
            userContext,
        });
    }

    static getClaimValue<T>(
        sessionHandle: string,
        claim: SessionClaim<T>,
        userContext: any = {}
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
            userContext,
        });
    }

    static removeClaim(sessionHandle: string, claim: SessionClaim<any>, userContext: any = {}): Promise<boolean> {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.removeClaim({
            sessionHandle,
            claim,
            userContext,
        });
    }
}

export let init = SessionWrapper.init;

export let createNewSession = SessionWrapper.createNewSession;
export let createNewSessionWithoutModifyingResponse = SessionWrapper.createNewSessionWithoutModifyingResponse;

export let getSession = SessionWrapper.getSession;
export let getSessionWithoutModifyingResponse = SessionWrapper.getSessionWithoutModifyingResponse;

export let getSessionInformation = SessionWrapper.getSessionInformation;

export let refreshSession = SessionWrapper.refreshSession;
export let refreshSessionWithoutModifyingResponse = SessionWrapper.refreshSessionWithoutModifyingResponse;

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
export let validateClaimsInJWTPayload = SessionWrapper.validateClaimsInJWTPayload;
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
