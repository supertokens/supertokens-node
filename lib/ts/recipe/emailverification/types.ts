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

import type { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import {
    TypeInput as EmailDeliveryTypeInput,
    TypeInputWithService as EmailDeliveryTypeInputWithService,
} from "../../ingredients/emaildelivery/types";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import { GeneralErrorResponse, NormalisedAppinfo } from "../../types";
import { SessionContainerInterface } from "../session/types";
import RecipeUserId from "../../recipeUserId";

export type TypeInput = {
    mode: "REQUIRED" | "OPTIONAL";
    emailDelivery?: EmailDeliveryTypeInput<TypeEmailVerificationEmailDeliveryInput>;
    getEmailForRecipeUserId?: (
        recipeUserId: RecipeUserId,
        userContext: any
    ) => Promise<
        | {
              status: "OK";
              email: string;
          }
        | { status: "EMAIL_DOES_NOT_EXIST_ERROR" | "UNKNOWN_USER_ID_ERROR" }
    >;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    mode: "REQUIRED" | "OPTIONAL";
    getEmailDeliveryConfig: (
        isInServerlessEnv: boolean
    ) => EmailDeliveryTypeInputWithService<TypeEmailVerificationEmailDeliveryInput>;
    getEmailForRecipeUserId?: (
        recipeUserId: RecipeUserId,
        userContext: any
    ) => Promise<
        | {
              status: "OK";
              email: string;
          }
        | { status: "EMAIL_DOES_NOT_EXIST_ERROR" | "UNKNOWN_USER_ID_ERROR" }
    >;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type User = {
    recipeUserId: RecipeUserId;
    email: string;
};

export type RecipeInterface = {
    createEmailVerificationToken(input: {
        recipeUserId: RecipeUserId; // must be a recipeUserId
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

    isEmailVerified(input: { recipeUserId: RecipeUserId; email: string; userContext: any }): Promise<boolean>;

    revokeEmailVerificationTokens(input: {
        recipeUserId: RecipeUserId;
        email: string;
        userContext: any;
    }): Promise<{ status: "OK" }>;

    unverifyEmail(input: { recipeUserId: RecipeUserId; email: string; userContext: any }): Promise<{ status: "OK" }>;
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    appInfo: NormalisedAppinfo;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
    emailDelivery: EmailDeliveryIngredient<TypeEmailVerificationEmailDeliveryInput>;
};

export type APIInterface = {
    verifyEmailPOST:
        | undefined
        | ((input: {
              token: string;
              options: APIOptions;
              userContext: any;
              session?: SessionContainerInterface;
          }) => Promise<
              | { status: "OK"; user: User; newSession?: SessionContainerInterface }
              | { status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR" }
              | GeneralErrorResponse
          >);

    isEmailVerifiedGET:
        | undefined
        | ((input: {
              options: APIOptions;
              userContext: any;
              session: SessionContainerInterface;
          }) => Promise<
              | {
                    status: "OK";
                    isVerified: boolean;
                    newSession?: SessionContainerInterface;
                }
              | GeneralErrorResponse
          >);

    generateEmailVerifyTokenPOST:
        | undefined
        | ((input: {
              options: APIOptions;
              userContext: any;
              session: SessionContainerInterface;
          }) => Promise<
              | { status: "OK" }
              | { status: "EMAIL_ALREADY_VERIFIED_ERROR"; newSession?: SessionContainerInterface }
              | GeneralErrorResponse
          >);
};

export type TypeEmailVerificationEmailDeliveryInput = {
    type: "EMAIL_VERIFICATION";
    user: {
        // we have the id here cause when sending the email, we have
        // the user's session. Therefore, it makes sense to also primary the
        // primary user's ID.
        id: string;
        recipeUserId: RecipeUserId;
        email: string;
    };
    emailVerifyLink: string;
};

export type GetEmailForRecipeUserIdFunc = (
    recipeUserId: RecipeUserId,
    userContext: any
) => Promise<
    | {
          status: "OK";
          email: string;
      }
    | { status: "EMAIL_DOES_NOT_EXIST_ERROR" | "UNKNOWN_USER_ID_ERROR" }
>;
