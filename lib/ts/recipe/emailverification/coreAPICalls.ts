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
import STError from "./error";

export async function createEmailVerificationToken(
    recipeInstance: Recipe,
    userId: string,
    email: string
): Promise<string> {
    let response = await recipeInstance
        .getQuerier()
        .sendPostRequest(new NormalisedURLPath(recipeInstance.getRecipeId(), "/recipe/user/email/verify/token"), {
            userId,
            email,
        });
    if (response.status === "OK") {
        return response.token;
    } else {
        throw new STError(
            {
                type: STError.EMAIL_ALREADY_VERIFIED_ERROR,
                message: "Failed to generated email verification token as the user ID is unknown",
            },
            recipeInstance.getRecipeId()
        );
    }
}

export async function verifyEmailUsingToken(recipeInstance: Recipe, token: string): Promise<User> {
    let response = await recipeInstance
        .getQuerier()
        .sendPostRequest(new NormalisedURLPath(recipeInstance.getRecipeId(), "/recipe/user/email/verify"), {
            method: "token",
            token,
        });
    if (response.status === "OK") {
        return {
            id: response.userId,
            email: response.email,
        };
    } else {
        throw new STError(
            {
                type: STError.EMAIL_VERIFICATION_INVALID_TOKEN_ERROR,
                message: "Failed to verify email as the the token has expired or is invalid",
            },
            recipeInstance.getRecipeId()
        );
    }
}

export async function isEmailVerified(recipeInstance: Recipe, userId: string, email: string): Promise<boolean> {
    let response = await recipeInstance
        .getQuerier()
        .sendGetRequest(new NormalisedURLPath(recipeInstance.getRecipeId(), "/recipe/user/email/verify"), {
            userId,
            email,
        });
    return response.isVerified;
}
