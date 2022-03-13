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

import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { TypeInput as EmailDeliveryTypeInput } from "../../ingredients/emaildelivery/types";
import EmailDeliveryRecipe from "../../ingredients/emaildelivery";

export type TypeInput = {
    emailDelivery?: EmailDeliveryTypeInput<TypeEmailVerificationEmailDeliveryInput>;
    getEmailForUserId: (userId: string, userContext: any) => Promise<string>;
    getEmailVerificationURL?: (user: User, userContext: any) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string, userContext: any) => Promise<void>;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    emailDelivery: EmailDeliveryTypeInput<TypeEmailVerificationEmailDeliveryInput>;
    getEmailForUserId: (userId: string, userContext: any) => Promise<string>;
    getEmailVerificationURL: (user: User, userContext: any) => Promise<string>;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type User = {
    id: string;
    email: string;
};

export type RecipeInterface = {
    createEmailVerificationToken(input: {
        userId: string;
        email: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              token: string;
          }
        | { status: "EMAIL_ALREADY_VERIFIED_ERROR" }
    >;

    verifyEmailUsingToken(input: {
        token: string;
        userContext: any;
    }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" }>;

    isEmailVerified(input: { userId: string; email: string; userContext: any }): Promise<boolean>;

    revokeEmailVerificationTokens(input: {
        userId: string;
        email: string;
        userContext: any;
    }): Promise<{ status: "OK" }>;

    unverifyEmail(input: { userId: string; email: string; userContext: any }): Promise<{ status: "OK" }>;
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
    emailDelivery: EmailDeliveryRecipe<TypeEmailVerificationEmailDeliveryInput>;
};

export type APIInterface = {
    verifyEmailPOST:
        | undefined
        | ((input: {
              token: string;
              options: APIOptions;
              userContext: any;
          }) => Promise<{ status: "OK"; user: User } | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" }>);

    isEmailVerifiedGET:
        | undefined
        | ((input: {
              options: APIOptions;
              userContext: any;
          }) => Promise<{
              status: "OK";
              isVerified: boolean;
          }>);

    generateEmailVerifyTokenPOST:
        | undefined
        | ((input: {
              options: APIOptions;
              userContext: any;
          }) => Promise<{ status: "EMAIL_ALREADY_VERIFIED_ERROR" | "OK" }>);
};

export type TypeEmailVerificationEmailDeliveryInput = {
    type: "EMAIL_VERIFICATION";
    user: User;
    emailVerifyLink: string;
    userContext: any;
};
