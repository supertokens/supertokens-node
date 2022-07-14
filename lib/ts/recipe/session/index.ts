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
} from "./types";
import OpenIdRecipe from "../openid/recipe";
import Recipe from "./recipe";
import { JSONObject } from "../../types";
import frameworks from "../../framework";
import SuperTokens from "../../supertokens";

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
            const value = await claim.fetchValue(userId, userContext);
            if (value !== undefined) {
                finalAccessTokenPayload = claim.addToPayload_internal(finalAccessTokenPayload, value, userContext);
            }
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
            await recipeInterfaceImpl.assertClaims({
                session,
                overrideGlobalClaimValidators: options?.overrideGlobalClaimValidators,
                userContext: options?.overrideGlobalClaimValidators,
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

    static fetchAndSetClaim(sessionHandle: string, claim: SessionClaim<any>, userContext: any = {}): Promise<void> {
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
    ): Promise<void> {
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
    ): Promise<T | undefined> {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getClaimValue({
            sessionHandle,
            claim,
            userContext,
        });
    }

    static removeClaim(sessionHandle: string, claim: SessionClaim<any>, userContext: any = {}): Promise<void> {
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
