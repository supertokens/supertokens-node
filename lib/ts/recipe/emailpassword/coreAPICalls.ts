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

export async function signUp(recipeInstance: Recipe, email: string, password: string): Promise<User> {
    let response = await recipeInstance
        .getQuerier()
        .sendPostRequest(new NormalisedURLPath(recipeInstance.getRecipeId(), "/recipe/signup"), {
            email,
            password,
        });
    if (response.status === "OK") {
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
    if (response.status === "OK") {
        return {
            ...response.user,
        };
    } else {
        throw new STError(
            {
                message: "Sign in failed because of incorrect email & password combination",
                type: STError.WRONG_CREDENTIALS_ERROR,
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
    if (response.status === "OK") {
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
    if (response.status === "OK") {
        return {
            ...response.user,
        };
    } else {
        return undefined;
    }
}

export async function createResetPasswordToken(recipeInstance: Recipe, userId: string): Promise<string> {
    let response = await recipeInstance
        .getQuerier()
        .sendPostRequest(new NormalisedURLPath(recipeInstance.getRecipeId(), "/recipe/user/password/reset/token"), {
            userId,
        });
    if (response.status === "OK") {
        return response.token;
    } else {
        throw new STError(
            {
                type: STError.UNKNOWN_USER_ID_ERROR,
                message: "Failed to generated password reset token as the user ID is unknown",
            },
            recipeInstance.getRecipeId()
        );
    }
}

export async function createEmailVerificationToken(recipeInstance: Recipe, userId: string): Promise<string> {
    let response = await recipeInstance
        .getQuerier()
        .sendPostRequest(new NormalisedURLPath(recipeInstance.getRecipeId(), "/recipe/user/email/verify/token"), {
            userId,
        });
    if (response.status === "OK") {
        return response.token;
    } else {
        if (response.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
            throw new STError(
                {
                    type: STError.EMAIL_ALREADY_VERIFIED_ERROR,
                    message: "Failed to generated email verification token as the user ID is unknown",
                },
                recipeInstance.getRecipeId()
            );
        }
        throw new STError(
            {
                type: STError.UNKNOWN_USER_ID_ERROR,
                message: "Failed to generated email verification token as the user ID is unknown",
            },
            recipeInstance.getRecipeId()
        );
    }
}

export async function verifyEmailUsingToken(recipeInstance: Recipe, token: string) {
    let response = await recipeInstance
        .getQuerier()
        .sendPostRequest(new NormalisedURLPath(recipeInstance.getRecipeId(), "/recipe/user/email/verify"), {
            method: "token",
            token,
        });
    if (response.status === "OK") {
        return {
            ...response.user,
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

export async function isEmailVerified(recipeInstance: Recipe, userId: string): Promise<boolean> {
    let response = await recipeInstance
        .getQuerier()
        .sendGetRequest(new NormalisedURLPath(recipeInstance.getRecipeId(), "/recipe/user/email/verify"), {
            userId,
        });
    if (response.status === "OK") {
        return response.isVerified;
    } else {
        throw new STError(
            {
                type: STError.UNKNOWN_USER_ID_ERROR,
                message: "User ID not found",
            },
            recipeInstance.getRecipeId()
        );
    }
}

export async function resetPasswordUsingToken(recipeInstance: Recipe, token: string, newPassword: string) {
    let response = await recipeInstance
        .getQuerier()
        .sendPostRequest(new NormalisedURLPath(recipeInstance.getRecipeId(), "/recipe/user/password/reset"), {
            method: "token",
            token,
            newPassword,
        });
    if (response.status !== "OK") {
        throw new STError(
            {
                type: STError.RESET_PASSWORD_INVALID_TOKEN_ERROR,
                message: "Failed to reset password as the the token has expired or is invalid",
            },
            recipeInstance.getRecipeId()
        );
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
        .sendGetRequest(new NormalisedURLPath(recipeInstance.getRecipeId(), "/recipe/users"), {
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
        .sendGetRequest(new NormalisedURLPath(recipeInstance.getRecipeId(), "/recipe/users/count"), {});
    return Number(response.count);
}
