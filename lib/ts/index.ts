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

import SuperTokens from "./supertokens";
import SuperTokensError from "./error";
import { UserContext, User as UserType } from "./types";
import AccountLinking from "./recipe/accountlinking/recipe";
import { AccountInfo } from "./recipe/accountlinking/types";
import RecipeUserId from "./recipeUserId";
import { User } from "./user";
import { getUserContext } from "./utils";

// For Express
export default class SuperTokensWrapper {
    static init = SuperTokens.init;

    static Error = SuperTokensError;
    static RecipeUserId = RecipeUserId;
    static User = User;

    static getAllCORSHeaders() {
        return SuperTokens.getInstanceOrThrowError().getAllCORSHeaders();
    }

    static getUserCount(includeRecipeIds?: string[], tenantId?: string, userContext?: Record<string, any>) {
        return SuperTokens.getInstanceOrThrowError().getUserCount(
            includeRecipeIds,
            tenantId,
            getUserContext(userContext)
        );
    }

    static getUsersOldestFirst(input: {
        tenantId: string;
        limit?: number;
        paginationToken?: string;
        includeRecipeIds?: string[];
        query?: { [key: string]: string };
        userContext?: Record<string, any>;
    }): Promise<{
        users: UserType[];
        nextPaginationToken?: string;
    }> {
        return AccountLinking.getInstance().recipeInterfaceImpl.getUsers({
            timeJoinedOrder: "ASC",
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static getUsersNewestFirst(input: {
        tenantId: string;
        limit?: number;
        paginationToken?: string;
        includeRecipeIds?: string[];
        query?: { [key: string]: string };
        userContext?: Record<string, any>;
    }): Promise<{
        users: UserType[];
        nextPaginationToken?: string;
    }> {
        return AccountLinking.getInstance().recipeInterfaceImpl.getUsers({
            timeJoinedOrder: "DESC",
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static createUserIdMapping(input: {
        superTokensUserId: string;
        externalUserId: string;
        externalUserIdInfo?: string;
        force?: boolean;
        userContext?: Record<string, any>;
    }) {
        return SuperTokens.getInstanceOrThrowError().createUserIdMapping({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static getUserIdMapping(input: {
        userId: string;
        userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
        userContext?: Record<string, any>;
    }) {
        return SuperTokens.getInstanceOrThrowError().getUserIdMapping({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static deleteUserIdMapping(input: {
        userId: string;
        userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
        force?: boolean;
        userContext?: Record<string, any>;
    }) {
        return SuperTokens.getInstanceOrThrowError().deleteUserIdMapping({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static updateOrDeleteUserIdMappingInfo(input: {
        userId: string;
        userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
        externalUserIdInfo?: string;
        userContext?: Record<string, any>;
    }) {
        return SuperTokens.getInstanceOrThrowError().updateOrDeleteUserIdMappingInfo({
            ...input,
            userContext: getUserContext(input.userContext),
        });
    }

    static async getUser(userId: string, userContext?: Record<string, any>) {
        return await AccountLinking.getInstance().recipeInterfaceImpl.getUser({
            userId,
            userContext: getUserContext(userContext),
        });
    }

    static async listUsersByAccountInfo(
        tenantId: string,
        accountInfo: AccountInfo,
        doUnionOfAccountInfo: boolean = false,
        userContext?: Record<string, any>
    ) {
        return await AccountLinking.getInstance().recipeInterfaceImpl.listUsersByAccountInfo({
            tenantId,
            accountInfo,
            doUnionOfAccountInfo,
            userContext: getUserContext(userContext),
        });
    }
    static async deleteUser(
        userId: string,
        removeAllLinkedAccounts: boolean = true,
        userContext?: Record<string, any>
    ) {
        return await AccountLinking.getInstance().recipeInterfaceImpl.deleteUser({
            userId,
            removeAllLinkedAccounts,
            userContext: getUserContext(userContext),
        });
    }
    static convertToRecipeUserId(recipeUserId: string): RecipeUserId {
        return new RecipeUserId(recipeUserId);
    }

    static getRequestFromUserContext(userContext: UserContext | undefined) {
        return SuperTokens.getInstanceOrThrowError().getRequestFromUserContext(userContext);
    }
}

export let init = SuperTokensWrapper.init;

export let getAllCORSHeaders = SuperTokensWrapper.getAllCORSHeaders;

export let getUserCount = SuperTokensWrapper.getUserCount;

export let getUsersOldestFirst = SuperTokensWrapper.getUsersOldestFirst;

export let getUsersNewestFirst = SuperTokensWrapper.getUsersNewestFirst;

export let deleteUser = SuperTokensWrapper.deleteUser;

export let createUserIdMapping = SuperTokensWrapper.createUserIdMapping;

export let getUserIdMapping = SuperTokensWrapper.getUserIdMapping;

export let deleteUserIdMapping = SuperTokensWrapper.deleteUserIdMapping;

export let updateOrDeleteUserIdMappingInfo = SuperTokensWrapper.updateOrDeleteUserIdMappingInfo;

export let getUser = SuperTokensWrapper.getUser;

export let listUsersByAccountInfo = SuperTokensWrapper.listUsersByAccountInfo;

export let convertToRecipeUserId = SuperTokensWrapper.convertToRecipeUserId;

export let getRequestFromUserContext = SuperTokensWrapper.getRequestFromUserContext;

export let Error = SuperTokensWrapper.Error;

export { default as RecipeUserId } from "./recipeUserId";
export { User } from "./user";
