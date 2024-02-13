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
import { SessionContainerInterface } from "../session/types";
import {
    TypeInput as EmailDeliveryTypeInput,
    TypeInputWithService as EmailDeliveryTypeInputWithService,
} from "../../ingredients/emaildelivery/types";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import { GeneralErrorResponse, NormalisedAppinfo, User, UserContext } from "../../types";
import RecipeUserId from "../../recipeUserId";

export type TypeNormalisedInput = {
    signUpFeature: TypeNormalisedInputSignUp;
    signInFeature: TypeNormalisedInputSignIn;
    getEmailDeliveryConfig: (
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
    validate?: (value: any, tenantId: string, userContext: UserContext) => Promise<string | undefined>;
    optional?: boolean;
};

export type TypeFormField = { id: string; value: any };

export type TypeInputSignUp = {
    formFields?: TypeInputFormField[];
};

export type NormalisedFormField = {
    id: string;
    validate: (value: any, tenantId: string, userContext: UserContext) => Promise<string | undefined>;
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
        session: SessionContainerInterface | undefined;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
        | {
              status: "NON_PRIMARY_SESSION_USER";
              reason: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;
    // this function is meant only for creating the recipe in the core and nothing else.
    // we added this even though signUp exists cause devs may override signup expecting it
    // to be called just during sign up. But we also need a version of signing up which can be
    // called during operations like creating a user during password reset flow.
    createNewRecipeUser(input: {
        email: string;
        password: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
    >;

    signIn(input: {
        email: string;
        password: string;
        session: SessionContainerInterface | undefined;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | { status: "OK"; user: User; recipeUserId: RecipeUserId }
        | { status: "WRONG_CREDENTIALS_ERROR" }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
        | {
              status: "NON_PRIMARY_SESSION_USER";
              reason: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;

    /**
     * We pass in the email as well to this function cause the input userId
     * may not be associated with an emailpassword account. In this case, we
     * need to know which email to use to create an emailpassword account later on.
     */
    createResetPasswordToken(input: {
        userId: string; // the id can be either recipeUserId or primaryUserId
        email: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }>;

    consumePasswordResetToken(input: {
        token: string;
        session: SessionContainerInterface | undefined;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              email: string;
              userId: string;
          }
        | { status: "RESET_PASSWORD_INVALID_TOKEN_ERROR" }
    >;

    updateEmailOrPassword(input: {
        recipeUserId: RecipeUserId; // the id should only be a recipeUserId cause if we give just an id
        // and a password, and if there are multiple emailpassword accounts, we do not know
        // for which one to update the password for.
        email?: string;
        password?: string;
        userContext: UserContext;
        applyPasswordPolicy?: boolean;
        tenantIdForPasswordPolicy: string;
    }): Promise<
        | {
              status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR";
          }
        | {
              status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
              reason: string;
          }
        | { status: "PASSWORD_POLICY_VIOLATED_ERROR"; failureReason: string }
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
              tenantId: string;
              options: APIOptions;
              userContext: UserContext;
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
              session: SessionContainerInterface | undefined;
              tenantId: string;
              options: APIOptions;
              userContext: UserContext;
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
              tenantId: string;
              session: SessionContainerInterface | undefined;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    email: string;
                    user: User;
                }
              | {
                    status: "RESET_PASSWORD_INVALID_TOKEN_ERROR";
                }
              | { status: "PASSWORD_POLICY_VIOLATED_ERROR"; failureReason: string }
              | GeneralErrorResponse
          >);

    signInPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              tenantId: string;
              session?: SessionContainerInterface;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    user: User;
                    session: SessionContainerInterface;
                }
              | {
                    status: "SIGN_IN_NOT_ALLOWED";
                    reason: string;
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
              tenantId: string;
              session?: SessionContainerInterface;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    user: User;
                    session: SessionContainerInterface;
                }
              | {
                    status: "SIGN_UP_NOT_ALLOWED";
                    reason: string;
                }
              | {
                    status: "EMAIL_ALREADY_EXISTS_ERROR";
                }
              | GeneralErrorResponse
          >);
};

export type TypeEmailPasswordPasswordResetEmailDeliveryInput = {
    type: "PASSWORD_RESET";
    user: {
        id: string;
        recipeUserId: RecipeUserId | undefined;
        email: string;
    };
    passwordResetLink: string;
    tenantId: string;
};

export type TypeEmailPasswordEmailDeliveryInput = TypeEmailPasswordPasswordResetEmailDeliveryInput;
