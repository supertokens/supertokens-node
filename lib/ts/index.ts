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
import { express } from "./framework";

// For Express
export default class SuperTokensWrapper {
    static init = SuperTokens.init;

    static Error = SuperTokensError;

    static getAllCORSHeaders() {
        return SuperTokens.getInstanceOrThrowError().getAllCORSHeaders();
    }

    static getUserCount(includeRecipeIds?: string[]) {
        return SuperTokens.getInstanceOrThrowError().getUserCount(includeRecipeIds);
    }

    static getUsersOldestFirst(input?: {
        limit?: number;
        paginationToken?: string;
        includeRecipeIds?: string[];
    }): Promise<{
        users: { recipeId: string; user: any }[];
        nextPaginationToken?: string;
    }> {
        return SuperTokens.getInstanceOrThrowError().getUsers({
            timeJoinedOrder: "ASC",
            ...input,
        });
    }

    static getUsersNewestFirst(input?: {
        limit?: number;
        paginationToken?: string;
        includeRecipeIds?: string[];
    }): Promise<{
        users: { recipeId: string; user: any }[];
        nextPaginationToken?: string;
    }> {
        return SuperTokens.getInstanceOrThrowError().getUsers({
            timeJoinedOrder: "DESC",
            ...input,
        });
    }

    /**
     * @deprecated
     */
    static middleware = express.middleware;

    /**
     * @deprecated
     */
    static errorHandler = express.errorHandler;
}

export let init = SuperTokensWrapper.init;

/**
 * @deprecated
 */
export let middleware = SuperTokensWrapper.middleware;

/**
 * @deprecated
 */
export let errorHandler = SuperTokensWrapper.errorHandler;

export let getAllCORSHeaders = SuperTokensWrapper.getAllCORSHeaders;

export let getUserCount = SuperTokensWrapper.getUserCount;

export let getUsersOldestFirst = SuperTokensWrapper.getUsersOldestFirst;

export let getUsersNewestFirst = SuperTokensWrapper.getUsersNewestFirst;

export let Error = SuperTokensWrapper.Error;
