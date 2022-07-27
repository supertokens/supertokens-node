/* Copyright (c) 2022, VRAI Labs and/or its affiliates. All rights reserved.
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
import { RecipeInterface } from "./types";

export default class Wrapper {
    static init = Recipe.init;

    static async createUserIdMapping(
        superTokensUserId: string,
        externalUserId: string,
        externalUserIdInfo?: string,
        userContext?: any
    ) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createUserIdMapping({
            superTokensUserId,
            externalUserId,
            externalUserIdInfo,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async getUserIdMapping(userId: string, userIdType: "SUPERTOKENS" | "EXTERNAL" | "ANY", userContext?: any) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserIdMapping({
            userId,
            userIdType,
            userContext: userContext === undefined ? {} : userContext,
        });
    }

    static async deleteUserIdMapping(
        userId: string,
        userIdType: "SUPERTOKENS" | "EXTERNAL" | "ANY",
        userContext?: any
    ) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.deleteUserIdMapping({
            userId,
            userIdType,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static async updateOrDeleteUserIdMappingInfo(
        userId: string,
        userIdType: "SUPERTOKENS" | "EXTERNAL" | "ANY",
        externalUserIdInfo: string | null,
        userContext?: any
    ) {
        return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateOrDeleteUserIdMappingInfo({
            userId,
            userIdType,
            externalUserIdInfo,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
}

export const init = Wrapper.init;
export const createUserIdMapping = Wrapper.createUserIdMapping;
export const getUserIdMapping = Wrapper.getUserIdMapping;
export const deleteUserIdMapping = Wrapper.deleteUserIdMapping;
export const updateOrDeleteUserIdMappingInfo = Wrapper.updateOrDeleteUserIdMappingInfo;

export type { RecipeInterface };
