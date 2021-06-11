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

import Recipe from "./recipe";
import SuperTokensError from "./error";
import * as thirdPartyProviders from "./providers";
import { RecipeInterface, User, APIInterface, APIOptions, TypeProvider } from "./types";

// For Express
export default class Wrapper {
    static init = Recipe.init;

    static Error = SuperTokensError;

    static signInUp(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: {
            id: string;
            isVerified: boolean;
        }
    ): Promise<{ createdNewUser: boolean; user: User }> {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signInUp({ thirdPartyId, thirdPartyUserId, email });
    }

    static getUserById(userId: string): Promise<User | undefined> {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserById({ userId });
    }

    static getUserByThirdPartyInfo(thirdPartyId: string, thirdPartyUserId: string): Promise<User | undefined> {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserByThirdPartyInfo({
            thirdPartyId,
            thirdPartyUserId,
        });
    }

    static getUsersOldestFirst(
        limit?: number,
        nextPaginationToken?: string
    ): Promise<{
        users: User[];
        nextPaginationToken?: string;
    }> {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUsersOldestFirst({
            limit,
            nextPaginationToken,
        });
    }

    static getUsersNewestFirst(
        limit?: number,
        nextPaginationToken?: string
    ): Promise<{
        users: User[];
        nextPaginationToken?: string;
    }> {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUsersNewestFirst({
            limit,
            nextPaginationToken,
        });
    }

    static getUserCount(): Promise<number> {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserCount();
    }

    static createEmailVerificationToken(userId: string): Promise<string> {
        return Recipe.getInstanceOrThrowError().createEmailVerificationToken(userId);
    }

    static verifyEmailUsingToken(token: string): Promise<User> {
        return Recipe.getInstanceOrThrowError().verifyEmailUsingToken(token);
    }

    static isEmailVerified(userId: string): Promise<boolean> {
        return Recipe.getInstanceOrThrowError().isEmailVerified(userId);
    }

    static Google = thirdPartyProviders.Google;

    static Github = thirdPartyProviders.Github;

    static Facebook = thirdPartyProviders.Facebook;

    static Apple = thirdPartyProviders.Apple;
}

export let init = Wrapper.init;

export let Error = Wrapper.Error;

export let signInUp = Wrapper.signInUp;

export let getUserById = Wrapper.getUserById;

export let getUserByThirdPartyInfo = Wrapper.getUserByThirdPartyInfo;

export let createEmailVerificationToken = Wrapper.createEmailVerificationToken;

export let verifyEmailUsingToken = Wrapper.verifyEmailUsingToken;

export let isEmailVerified = Wrapper.isEmailVerified;

export let getUsersOldestFirst = Wrapper.getUsersOldestFirst;

export let getUsersNewestFirst = Wrapper.getUsersNewestFirst;

export let getUserCount = Wrapper.getUserCount;

export let Google = Wrapper.Google;

export let Github = Wrapper.Github;

export let Facebook = Wrapper.Facebook;

export let Apple = Wrapper.Apple;

export type { RecipeInterface, User, APIInterface, APIOptions, TypeProvider };
