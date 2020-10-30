/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
import STError from "./error";

export async function signUp(recipeInstance: Recipe, email: string, password: string): Promise<User> {
    let response = await recipeInstance
        .getQuerier()
        .sendPostRequest(new NormalisedURLPath(recipeInstance.getRecipeId(), "/recipe/signup"), {
            email,
            password,
        });
    if (response.status == "OK") {
        return {
            ...response.user,
        };
    } else {
        throw new STError(
            {
                message: "Sign up failed because the email, " + email + ", is already taken",
                type: STError.EMAIL_ALREADY_EXISTS_ERROR,
            },
            recipeInstance.getRecipeId()
        );
    }
}

export async function signIn(recipeInstance: Recipe, email: string, password: string): Promise<User> {
    let response = await recipeInstance
        .getQuerier()
        .sendPostRequest(new NormalisedURLPath(recipeInstance.getRecipeId(), "/recipe/signin"), {
            email,
            password,
        });
    if (response.status == "OK") {
        return {
            ...response.user,
        };
    } else {
        throw new STError(
            {
                message: "Sign in failed because of incorrect email & password combination",
                type: STError.WRONG_CREDENTIAL_ERROR,
            },
            recipeInstance.getRecipeId()
        );
    }
}

export async function getUserById(recipeInstance: Recipe, userId: string): Promise<User | undefined> {
    let response = await recipeInstance
        .getQuerier()
        .sendGetRequest(new NormalisedURLPath(recipeInstance.getRecipeId(), "/recipe/user"), {
            userId,
        });
    if (response.status == "OK") {
        return {
            ...response.user,
        };
    } else {
        return undefined;
    }
}

export async function getUserByEmail(recipeInstance: Recipe, email: string): Promise<User | undefined> {
    let response = await recipeInstance
        .getQuerier()
        .sendGetRequest(new NormalisedURLPath(recipeInstance.getRecipeId(), "/recipe/user"), {
            email,
        });
    if (response.status == "OK") {
        return {
            ...response.user,
        };
    } else {
        return undefined;
    }
}
