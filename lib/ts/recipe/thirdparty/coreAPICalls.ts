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
import NormalisedURLPath from "../../normalisedURLPath";
import { User } from "./types";

export async function signInUp(
    recipeInstance: Recipe,
    thirdPartyId: string,
    thirdPartyUserId: string,
    email: {
        id: string;
        isVerified: boolean;
    }
): Promise<{ createdNewUser: boolean; user: User }> {
    let response = await recipeInstance
        .getQuerier()
        .sendPostRequest(new NormalisedURLPath(recipeInstance, "/recipe/signinup"), {
            thirdPartyId,
            thirdPartyUserId,
            email,
        });
    return {
        createdNewUser: response.createdNewUser,
        user: response.user,
    };
}

export async function getUserById(recipeInstance: Recipe, userId: string): Promise<User | undefined> {
    let response = await recipeInstance
        .getQuerier()
        .sendGetRequest(new NormalisedURLPath(recipeInstance, "/recipe/user"), {
            userId,
        });
    if (response.status === "OK") {
        return {
            ...response.user,
        };
    } else {
        return undefined;
    }
}

export async function getUserByThirdPartyInfo(
    recipeInstance: Recipe,
    thirdPartyId: string,
    thirdPartyUserId: string
): Promise<User | undefined> {
    let response = await recipeInstance
        .getQuerier()
        .sendGetRequest(new NormalisedURLPath(recipeInstance, "/recipe/user"), {
            thirdPartyId,
            thirdPartyUserId,
        });
    if (response.status === "OK") {
        return {
            ...response.user,
        };
    } else {
        return undefined;
    }
}

export async function getUsers(
    recipeInstance: Recipe,
    timeJoinedOrder: "ASC" | "DESC",
    limit?: number,
    paginationToken?: string
): Promise<{
    users: User[];
    nextPaginationToken?: string;
}> {
    let response = await recipeInstance
        .getQuerier()
        .sendGetRequest(new NormalisedURLPath(recipeInstance, "/recipe/users"), {
            timeJoinedOrder,
            limit,
            paginationToken,
        });
    return {
        users: response.users,
        nextPaginationToken: response.nextPaginationToken,
    };
}

export async function getUsersCount(recipeInstance: Recipe): Promise<number> {
    let response = await recipeInstance
        .getQuerier()
        .sendGetRequest(new NormalisedURLPath(recipeInstance, "/recipe/users/count"), {});
    return Number(response.count);
}
