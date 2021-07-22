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

import {
    RecipeInterface as EmailVerificationRecipeInterface,
    APIInterface as EmailVerificationAPIInterface,
    OriginalAPIInterface as EmailVerificationOriginalAPIInterface,
} from "../emailverification";
import { TypeInput as TypeInputEmailVerification } from "../emailverification/types";
import { Request, Response, NextFunction } from "express";

const TypeString = {
    type: "string",
};

const TypeBoolean = {
    type: "boolean",
};

const TypeAny = {
    type: "any",
};

export type TypeInputSetJwtPayloadForSession = (
    user: User,
    formFields: TypeFormField[],
    action: "signin" | "signup"
) => Promise<{ [key: string]: any } | undefined>;

export type TypeInputSetSessionDataForSession = (
    user: User,
    formFields: TypeFormField[],
    action: "signin" | "signup"
) => Promise<{ [key: string]: any } | undefined>;

export type TypeInputSessionFeature = {
    /**
     * @deprecated Use override functions instead for >= v6.0
     *   */
    setJwtPayload?: TypeInputSetJwtPayloadForSession;

    /**
     * @deprecated Use override functions instead for >= v6.0
     *   */
    setSessionData?: TypeInputSetSessionDataForSession;
};

const InputSessionFeatureSchema = {
    type: "object",
    properties: {
        setJwtPayload: TypeAny,
        setSessionData: TypeAny,
    },
    additionalProperties: false,
};

export type TypeNormalisedInputSessionFeature = {
    setJwtPayload: TypeInputSetJwtPayloadForSession;
    setSessionData: TypeInputSetSessionDataForSession;
};

export type TypeNormalisedInput = {
    sessionFeature: TypeNormalisedInputSessionFeature;
    signUpFeature: TypeNormalisedInputSignUp;
    signInFeature: TypeNormalisedInputSignIn;
    resetPasswordUsingTokenFeature: TypeNormalisedInputResetPasswordUsingTokenFeature;
    emailVerificationFeature: TypeInputEmailVerification;
    override: {
        functions: (originalImplementation: RecipeInterface) => RecipeInterface;
        apis: (originalImplementation: OriginalAPIInterface) => APIInterface;
        emailVerificationFeature?: {
            functions?: (originalImplementation: EmailVerificationRecipeInterface) => EmailVerificationRecipeInterface;
            apis?: (originalImplementation: EmailVerificationOriginalAPIInterface) => EmailVerificationAPIInterface;
        };
    };
};

const InputEmailVerificationFeatureSchema = {
    type: "object",
    properties: {
        getEmailVerificationURL: TypeAny,
        createAndSendCustomEmail: TypeAny,
    },
    additionalProperties: false,
};

export type TypeInputEmailVerificationFeature = {
    getEmailVerificationURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
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

const InputSignUpSchema = {
    type: "object",
    properties: {
        formFields: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: TypeString,
                    validate: TypeAny,
                    optional: TypeBoolean,
                },
                required: ["id"],
                additionalProperties: false,
            },
        },
    },
    additionalProperties: false,
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

export type TypeInputResetPasswordUsingTokenFeature = {
    getResetPasswordURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, passwordResetURLWithToken: string) => Promise<void>;
};

export const InputResetPasswordUsingTokenFeatureSchema = {
    type: "object",
    properties: {
        getResetPasswordURL: TypeAny,
        createAndSendCustomEmail: TypeAny,
    },
    additionalProperties: false,
};

export type TypeNormalisedInputResetPasswordUsingTokenFeature = {
    getResetPasswordURL: (user: User) => Promise<string>;
    createAndSendCustomEmail: (user: User, passwordResetURLWithToken: string) => Promise<void>;
    formFieldsForGenerateTokenForm: NormalisedFormField[];
    formFieldsForPasswordResetForm: NormalisedFormField[];
};

export type User = {
    id: string;
    email: string;
    timeJoined: number;
};

export type TypeInput = {
    sessionFeature?: TypeInputSessionFeature;
    signUpFeature?: TypeInputSignUp;
    resetPasswordUsingTokenFeature?: TypeInputResetPasswordUsingTokenFeature;
    emailVerificationFeature?: TypeInputEmailVerificationFeature;
    override?: {
        functions?: (originalImplementation: RecipeInterface) => RecipeInterface;
        apis?: (originalImplementation: OriginalAPIInterface) => APIInterface;
        emailVerificationFeature?: {
            functions?: (originalImplementation: EmailVerificationRecipeInterface) => EmailVerificationRecipeInterface;
            apis?: (originalImplementation: EmailVerificationOriginalAPIInterface) => EmailVerificationAPIInterface;
        };
    };
};

export const InputSchema = {
    type: "object",
    properties: {
        sessionFeature: InputSessionFeatureSchema,
        signUpFeature: InputSignUpSchema,
        resetPasswordUsingTokenFeature: InputResetPasswordUsingTokenFeatureSchema,
        emailVerificationFeature: InputEmailVerificationFeatureSchema,
        override: TypeAny,
    },
    additionalProperties: false,
};

export interface RecipeInterface {
    signUp(input: {
        email: string;
        password: string;
    }): Promise<{ status: "OK"; user: User } | { status: "EMAIL_ALREADY_EXISTS_ERROR" }>;

    signIn(input: {
        email: string;
        password: string;
    }): Promise<{ status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" }>;

    getUserById(input: { userId: string }): Promise<User | undefined>;

    getUserByEmail(input: { email: string }): Promise<User | undefined>;

    createResetPasswordToken(input: {
        userId: string;
    }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID" }>;

    resetPasswordUsingToken(input: {
        token: string;
        newPassword: string;
    }): Promise<{ status: "OK" | "RESET_PASSWORD_INVALID_TOKEN_ERROR" }>;

    /**
     * @deprecated Please do not override this function
     *   */
    getUsersOldestFirst(input: {
        limit?: number;
        nextPaginationToken?: string;
    }): Promise<{
        users: User[];
        nextPaginationToken?: string;
    }>;

    /**
     * @deprecated Please do not override this function
     *   */
    getUsersNewestFirst(input: {
        limit?: number;
        nextPaginationToken?: string;
    }): Promise<{
        users: User[];
        nextPaginationToken?: string;
    }>;

    /**
     * @deprecated Please do not override this function
     *   */
    getUserCount(): Promise<number>;
}

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: Request;
    res: Response;
    next: NextFunction;
};

export interface OriginalAPIInterface {
    emailExistsGET: (input: {
        email: string;
        options: APIOptions;
    }) => Promise<{
        status: "OK";
        exists: boolean;
    }>;

    generatePasswordResetTokenPOST: (input: {
        formFields: {
            id: string;
            value: string;
        }[];
        options: APIOptions;
    }) => Promise<{
        status: "OK";
    }>;

    passwordResetPOST: (input: {
        formFields: {
            id: string;
            value: string;
        }[];
        token: string;
        options: APIOptions;
    }) => Promise<{
        status: "OK" | "RESET_PASSWORD_INVALID_TOKEN_ERROR";
    }>;

    signInPOST: (input: {
        formFields: {
            id: string;
            value: string;
        }[];
        options: APIOptions;
    }) => Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;

    signUpPOST: (input: {
        formFields: {
            id: string;
            value: string;
        }[];
        options: APIOptions;
    }) => Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "EMAIL_ALREADY_EXISTS_ERROR";
          }
    >;
}

export interface APIInterface {
    emailExistsGET:
        | undefined
        | ((input: {
              email: string;
              options: APIOptions;
          }) => Promise<{
              status: "OK";
              exists: boolean;
          }>);

    generatePasswordResetTokenPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              options: APIOptions;
          }) => Promise<{
              status: "OK";
          }>);

    passwordResetPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              token: string;
              options: APIOptions;
          }) => Promise<{
              status: "OK" | "RESET_PASSWORD_INVALID_TOKEN_ERROR";
          }>);

    signInPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              options: APIOptions;
          }) => Promise<
              | {
                    status: "OK";
                    user: User;
                }
              | {
                    status: "WRONG_CREDENTIALS_ERROR";
                }
          >);

    signUpPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              options: APIOptions;
          }) => Promise<
              | {
                    status: "OK";
                    user: User;
                }
              | {
                    status: "EMAIL_ALREADY_EXISTS_ERROR";
                }
          >);
}
