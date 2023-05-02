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
import { SessionContainerInterface } from "../session/types";
import {
    TypeInput as EmailDeliveryTypeInput,
    TypeInputWithService as EmailDeliveryTypeInputWithService,
} from "../../ingredients/emaildelivery/types";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import { GeneralErrorResponse, NormalisedAppinfo, User } from "../../types";

export type TypeNormalisedInput = {
    signUpFeature: TypeNormalisedInputSignUp;
    signInFeature: TypeNormalisedInputSignIn;
    getEmailDeliveryConfig: (
        recipeImpl: RecipeInterface,
        isInServerlessEnv: boolean
    ) => EmailDeliveryTypeInputWithService<TypeEmailPasswordEmailDeliveryInput>;
    resetPasswordUsingTokenFeature: TypeNormalisedInputResetPasswordUsingTokenFeature;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeInputFormField = {
    id: string;
    validate?: (value: any) => Promise<string | undefined>;
    optional?: boolean;
};

export type TypeFormField = { id: string; value: any };

export type TypeInputSignUp = {
    formFields?: TypeInputFormField[];
};

export type NormalisedFormField = {
    id: string;
    validate: (value: any) => Promise<string | undefined>;
    optional: boolean;
};

export type TypeNormalisedInputSignUp = {
    formFields: NormalisedFormField[];
};

export type TypeNormalisedInputSignIn = {
    formFields: NormalisedFormField[];
};

export type TypeNormalisedInputResetPasswordUsingTokenFeature = {
    formFieldsForGenerateTokenForm: NormalisedFormField[];
    formFieldsForPasswordResetForm: NormalisedFormField[];
};

export type TypeInput = {
    signUpFeature?: TypeInputSignUp;
    emailDelivery?: EmailDeliveryTypeInput<TypeEmailPasswordEmailDeliveryInput>;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type RecipeInterface = {
    signUp(input: {
        email: string;
        password: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              user: User;
          }
        | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
    >;

    // this function is meant only for creating the recipe in the core and nothing else.
    createNewRecipeUser(input: {
        email: string;
        password: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              user: User;
          }
        | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
    >;

    signIn(input: {
        email: string;
        password: string;
        userContext: any;
    }): Promise<{ status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" }>;

    /**
     * We pass in the email as well to this function cause the input userId
     * may not be associated with an emailpassword account. In this case, we
     * need to know which email to use to create an emailpassword account later on.
     */
    createResetPasswordToken(input: {
        userId: string; // the id can be either recipeUserId or primaryUserId
        email: string;
        userContext: any;
    }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }>;

    consumePasswordResetToken(input: {
        token: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              email: string;
              userId: string;
          }
        | { status: "RESET_PASSWORD_INVALID_TOKEN_ERROR" }
    >;

    updateEmailOrPassword(input: {
        userId: string; // the id can be either recipeUserId or primaryUserId
        email?: string;
        password?: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR";
          }
        | {
              status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
              reason: string;
          }
    >;
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    appInfo: NormalisedAppinfo;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
    emailDelivery: EmailDeliveryIngredient<TypeEmailPasswordEmailDeliveryInput>;
};

export type APIInterface = {
    emailExistsGET:
        | undefined
        | ((input: {
              email: string;
              options: APIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    exists: boolean;
                }
              | GeneralErrorResponse
          >);

    generatePasswordResetTokenPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              options: APIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                }
              | {
                    status: "PASSWORD_RESET_NOT_ALLOWED";
                    reason: string;
                }
              | GeneralErrorResponse
          >);

    passwordResetPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              token: string;
              options: APIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    email: string;
                    userId: string;
                }
              | {
                    status: "RESET_PASSWORD_INVALID_TOKEN_ERROR";
                }
              | GeneralErrorResponse
          >);

    signInPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              options: APIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    user: User;
                    session: SessionContainerInterface;
                }
              | {
                    status: "WRONG_CREDENTIALS_ERROR";
                }
              | GeneralErrorResponse
          >);

    signUpPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              options: APIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    user: User;
                    session: SessionContainerInterface;
                }
              | {
                    status: "EMAIL_ALREADY_EXISTS_ERROR";
                }
              | {
                    status: "SIGNUP_NOT_ALLOWED";
                    reason: string;
                }
              | GeneralErrorResponse
          >);

    linkAccountToExistingAccountPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              session: SessionContainerInterface;
              options: APIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    wereAccountsAlreadyLinked: boolean;
                }
              | {
                    status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR" | "ACCOUNT_LINKING_NOT_ALLOWED_ERROR";
                    description: string;
                }
              | {
                    status: "WRONG_CREDENTIALS_ERROR";
                }
              | GeneralErrorResponse
          >);
};

export type TypeEmailPasswordPasswordResetEmailDeliveryInput = {
    type: "PASSWORD_RESET";
    user: {
        id: string;
        email: string;
    };
    passwordResetLink: string;
};

export type TypeEmailPasswordEmailDeliveryInput = TypeEmailPasswordPasswordResetEmailDeliveryInput;
