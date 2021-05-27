import { Request, Response, NextFunction } from "express";
import { RecipeImplementation, APIImplementation } from "./";
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

export type TypeInput = {
    getEmailForUserId: (userId: string) => Promise<string>;
    getEmailVerificationURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    override?: {
        functions?: (originalImplementation: RecipeImplementation) => RecipeInterface;
        apis?: (originalImplementation: APIImplementation) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    getEmailForUserId: (userId: string) => Promise<string>;
    getEmailVerificationURL: (user: User) => Promise<string>;
    createAndSendCustomEmail: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    override: {
        functions: (originalImplementation: RecipeImplementation) => RecipeInterface;
        apis: (originalImplementation: APIImplementation) => APIInterface;
    };
};

export type User = {
    id: string;
    email: string;
};

export interface RecipeInterface {
    createEmailVerificationToken(
        userId: string,
        email: string
    ): Promise<
        | {
              status: "OK";
              token: string;
          }
        | { status: "EMAIL_ALREADY_VERIFIED_ERROR" }
    >;

    verifyEmailUsingToken(
        token: string
    ): Promise<{ status: "OK"; user: User } | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" }>;

    isEmailVerified(
        userId: string,
        email: string
    ): Promise<{
        status: "OK";
        isVerified: boolean;
    }>;
}

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    req: Request;
    res: Response;
    next: NextFunction;
};

export interface APIInterface {
    verifyEmailPOST:
        | undefined
        | ((
              token: string,
              options: APIOptions
          ) => Promise<{ status: "OK"; user: User } | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" }>);

    isEmailVerifiedGET:
        | undefined
        | ((
              options: APIOptions
          ) => Promise<{
              status: "OK";
              isVerified: boolean;
          }>);

    generateEmailVerifyTokenPOST:
        | undefined
        | ((options: APIOptions) => Promise<{ status: "EMAIL_ALREADY_VERIFIED_ERROR" | "OK" }>);
}
