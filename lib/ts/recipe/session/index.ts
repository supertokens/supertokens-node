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
    RecipeInterface,
    SessionContainerInterface as SessionContainer,
    SessionInformation,
    APIInterface,
    APIOptions,
    SessionClaimValidator,
    SessionClaim,
    ClaimValidationError,
} from "./types";
import OpenIdRecipe from "../openid/recipe";
import Recipe from "./recipe";
import { JSONObject } from "../../types";
import frameworks from "../../framework";
import SuperTokens from "../../supertokens";
import { getRequiredClaimValidators } from "./utils";

// For Express
export default class SessionWrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static async createNewSession(
        res: any,
        userId: string,
        accessTokenPayload: any = {},
        sessionData: any = {},
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

        if (!res.wrapperUsed) {
            res = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapResponse(res);
        }
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createNewSession({
            res,
            userId,
            accessTokenPayload: finalAccessTokenPayload,
            sessionData,
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

        return recipeImpl.validateClaimsForSessionHandle({
            sessionInfo,
            claimValidators,
            userContext,
        });
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
    static async getSession(req: any, res: any, options?: VerifySessionOptions, userContext: any = {}) {
        if (!res.wrapperUsed) {
            res = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapResponse(res);
        }
        if (!req.wrapperUsed) {
            req = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapRequest(req);
        }
        const recipeInterfaceImpl = Recipe.getInstanceOrThrowError().recipeInterfaceImpl;
        const session = await recipeInterfaceImpl.getSession({ req, res, options, userContext });

        if (session !== undefined) {
            const claimValidators = await getRequiredClaimValidators(
                session,
                options?.overrideGlobalClaimValidators,
                userContext
            );
            await recipeInterfaceImpl.assertClaims({
                session,
                claimValidators,
                userContext,
            });
        }
        return session;
    }

    static getSessionInformation(sessionHandle: string, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getSessionInformation({
            sessionHandle,
            userContext,
        });
    }

    static refreshSession(req: any, res: any, userContext: any = {}) {
        if (!res.wrapperUsed) {
            res = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapResponse(res);
        }
        if (!req.wrapperUsed) {
            req = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapRequest(req);
        }
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.refreshSession({ req, res, userContext });
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

    static updateSessionData(sessionHandle: string, newSessionData: any, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateSessionData({
            sessionHandle,
            newSessionData,
            userContext,
        });
    }

    static regenerateAccessToken(accessToken: string, newAccessTokenPayload?: any, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.regenerateAccessToken({
            accessToken,
            newAccessTokenPayload,
            userContext,
        });
    }

    static updateAccessTokenPayload(sessionHandle: string, newAccessTokenPayload: any, userContext: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateAccessTokenPayload({
            sessionHandle,
            newAccessTokenPayload,
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
        let openIdRecipe: OpenIdRecipe | undefined = Recipe.getInstanceOrThrowError().openIdRecipe;

        if (openIdRecipe !== undefined) {
            return openIdRecipe.recipeImplementation.createJWT({ payload, validitySeconds, userContext });
        }

        throw new global.Error(
            "createJWT cannot be used without enabling the JWT feature. Please set 'enableJWT: true' when initialising the Session recipe"
        );
    }

    static getJWKS(userContext: any = {}) {
        let openIdRecipe: OpenIdRecipe | undefined = Recipe.getInstanceOrThrowError().openIdRecipe;

        if (openIdRecipe !== undefined) {
            return openIdRecipe.recipeImplementation.getJWKS({ userContext });
        }

        throw new global.Error(
            "getJWKS cannot be used without enabling the JWT feature. Please set 'enableJWT: true' when initialising the Session recipe"
        );
    }

    static getOpenIdDiscoveryConfiguration(userContext: any = {}) {
        let openIdRecipe: OpenIdRecipe | undefined = Recipe.getInstanceOrThrowError().openIdRecipe;

        if (openIdRecipe !== undefined) {
            return openIdRecipe.recipeImplementation.getOpenIdDiscoveryConfiguration({ userContext });
        }

        throw new global.Error(
            "getOpenIdDiscoveryConfiguration cannot be used without enabling the JWT feature. Please set 'enableJWT: true' when initialising the Session recipe"
        );
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

export let getSession = SessionWrapper.getSession;

export let getSessionInformation = SessionWrapper.getSessionInformation;

export let refreshSession = SessionWrapper.refreshSession;

export let revokeAllSessionsForUser = SessionWrapper.revokeAllSessionsForUser;

export let getAllSessionHandlesForUser = SessionWrapper.getAllSessionHandlesForUser;

export let revokeSession = SessionWrapper.revokeSession;

export let revokeMultipleSessions = SessionWrapper.revokeMultipleSessions;

export let updateSessionData = SessionWrapper.updateSessionData;

export let updateAccessTokenPayload = SessionWrapper.updateAccessTokenPayload;
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
