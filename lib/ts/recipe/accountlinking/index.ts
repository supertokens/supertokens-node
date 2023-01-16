/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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
import type { RecipeInterface } from "./types";

export default class Wrapper {
    static init = Recipe.init;

    static async getRecipeUserIdsForPrimaryUserIds(primaryUserIds: string[], userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getRecipeUserIdsForPrimaryUserIds({
            primaryUserIds,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static async getPrimaryUserIdsforRecipeUserIds(recipeUserIds: string[], userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getPrimaryUserIdsforRecipeUserIds({
            recipeUserIds,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static async addNewRecipeUserIdWithoutPrimaryUserId(
        recipeUserId: string,
        recipeId: string,
        timeJoined: number,
        userContext?: any
    ) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.addNewRecipeUserIdWithoutPrimaryUserId({
            recipeUserId,
            recipeId,
            timeJoined,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static async canCreatePrimaryUserId(recipeUserId: string, userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.canCreatePrimaryUserId({
            recipeUserId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static async createPrimaryUser(recipeUserId: string, userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createPrimaryUser({
            recipeUserId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static async canLinkAccounts(recipeUserId: string, primaryUserId: string, userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.canLinkAccounts({
            recipeUserId,
            primaryUserId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static async linkAccounts(recipeUserId: string, primaryUserId: string, userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.linkAccounts({
            recipeUserId,
            primaryUserId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static async unlinkAccounts(recipeUserId: string, userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.unlinkAccounts({
            recipeUserId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
}

export const init = Wrapper.init;
export const getRecipeUserIdsForPrimaryUserIds = Wrapper.getRecipeUserIdsForPrimaryUserIds;
export const getPrimaryUserIdsforRecipeUserIds = Wrapper.getPrimaryUserIdsforRecipeUserIds;
export const addNewRecipeUserIdWithoutPrimaryUserId = Wrapper.addNewRecipeUserIdWithoutPrimaryUserId;
export const canCreatePrimaryUserId = Wrapper.canCreatePrimaryUserId;
export const createPrimaryUser = Wrapper.createPrimaryUser;
export const canLinkAccounts = Wrapper.canLinkAccounts;
export const linkAccounts = Wrapper.linkAccounts;
export const unlinkAccounts = Wrapper.unlinkAccounts;

export type { RecipeInterface };
