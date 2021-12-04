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
} from "./types";
import Recipe from "./recipe";

// For Express
export default class SessionWrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static createNewSession(res: any, userId: string, accessTokenPayload: any = {}, sessionData: any = {}) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createNewSession({
            res,
            userId,
            accessTokenPayload,
            sessionData,
        });
    }

    static getSession(req: any, res: any, options?: VerifySessionOptions) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getSession({ req, res, options });
    }

    static getSessionInformation(sessionHandle: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getSessionInformation({ sessionHandle });
    }

    static refreshSession(req: any, res: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.refreshSession({ req, res });
    }

    static revokeAllSessionsForUser(userId: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeAllSessionsForUser({ userId });
    }

    static getAllSessionHandlesForUser(userId: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getAllSessionHandlesForUser({ userId });
    }

    static revokeSession(sessionHandle: string) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeSession({ sessionHandle });
    }

    static revokeMultipleSessions(sessionHandles: string[]) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeMultipleSessions({ sessionHandles });
    }

    static updateSessionData(sessionHandle: string, newSessionData: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateSessionData({
            sessionHandle,
            newSessionData,
        });
    }

    static updateAccessTokenPayload(sessionHandle: string, newAccessTokenPayload: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateAccessTokenPayload({
            sessionHandle,
            newAccessTokenPayload,
        });
    }

    static createJWT(payload?: any, validitySeconds?: number) {
        let jwtRecipe = Recipe.getInstanceOrThrowError().openIdRecipe?.jwtRecipe;

        if (jwtRecipe !== undefined) {
            return jwtRecipe.recipeInterfaceImpl.createJWT({ payload, validitySeconds });
        }

        throw new global.Error(
            "createJWT cannot be used without enabling the JWT feature. Please set 'enableJWT: true' when initialising the Session recipe"
        );
    }

    static getJWKS() {
        let jwtRecipe = Recipe.getInstanceOrThrowError().openIdRecipe?.jwtRecipe;

        if (jwtRecipe !== undefined) {
            return jwtRecipe.recipeInterfaceImpl.getJWKS();
        }

        throw new global.Error(
            "getJWKS cannot be used without enabling the JWT feature. Please set 'enableJWT: true' when initialising the Session recipe"
        );
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

export let Error = SessionWrapper.Error;

// JWT Functions
export let createJWT = SessionWrapper.createJWT;

export let getJWKS = SessionWrapper.getJWKS;

export type { VerifySessionOptions, RecipeInterface, SessionContainer, APIInterface, APIOptions, SessionInformation };
