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
import { TypeProvider, APIOptions as ThirdPartyAPIOptionsOriginal } from "../thirdparty/types";
import { TypeInput as TypeNormalisedInputEmailVerification } from "../emailverification/types";
import {
    RecipeImplementation as EmailVerificationRecipeImplementation,
    RecipeInterface as EmailVerificationRecipeInterface,
    APIImplementation as EmailVerificationAPIImplementation,
    APIInterface as EmailVerificationAPIInterface,
} from "../emailverification";
import {
    NormalisedFormField,
    TypeFormField,
    TypeInputFormField,
    TypeInputResetPasswordUsingTokenFeature,
    InputResetPasswordUsingTokenFeatureSchema,
    APIOptions as EmailPasswordAPIOptionsOriginal,
} from "../emailpassword/types";
import { RecipeImplementation, APIImplementation } from "./";

const TypeString = {
    type: "string",
};

const TypeBoolean = {
    type: "boolean",
};

const TypeAny = {
    type: "any",
};

export type User = {
    id: string;
    timeJoined: number;
    email: string;
    thirdParty?: {
        id: string;
        userId: string;
    };
};

export type TypeContextEmailPasswordSignUp = {
    loginType: "emailpassword";
    formFields: TypeFormField[];
};

export type TypeContextEmailPasswordSessionDataAndJWT = {
    loginType: "emailpassword";
    formFields: TypeFormField[];
};

export type TypeContextEmailPasswordSignIn = {
    loginType: "emailpassword";
};

export type TypeContextThirdParty = {
    loginType: "thirdparty";
    thirdPartyAuthCodeResponse: any;
};

export type TypeInputHandlePostSignUp = (
    user: User,
    context: TypeContextEmailPasswordSignUp | TypeContextThirdParty
) => Promise<void>;

export type TypeInputHandlePostSignIn = (
    user: User,
    context: TypeContextEmailPasswordSignIn | TypeContextThirdParty
) => Promise<void>; // same as signup to keep the signature consistent

export type TypeInputSetJwtPayloadForSession = (
    user: User,
    context: TypeContextEmailPasswordSessionDataAndJWT | TypeContextThirdParty,
    action: "signin" | "signup"
) => Promise<{ [key: string]: any } | undefined>;

export type TypeInputSetSessionDataForSession = (
    user: User,
    context: TypeContextEmailPasswordSessionDataAndJWT | TypeContextThirdParty,
    action: "signin" | "signup"
) => Promise<{ [key: string]: any } | undefined>;

export type TypeInputSessionFeature = {
    setJwtPayload?: TypeInputSetJwtPayloadForSession;
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

export type TypeNormalisedInputSignUp = {
    formFields: NormalisedFormField[];
};

export type TypeInputEmailVerificationFeature = {
    getEmailVerificationURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
};

const InputEmailVerificationFeatureSchema = {
    type: "object",
    properties: {
        getEmailVerificationURL: TypeAny,
        createAndSendCustomEmail: TypeAny,
    },
    additionalProperties: false,
};

export type TypeInput = {
    sessionFeature?: TypeInputSessionFeature;
    signUpFeature?: TypeInputSignUp;
    providers?: TypeProvider[];
    resetPasswordUsingTokenFeature?: TypeInputResetPasswordUsingTokenFeature;
    emailVerificationFeature?: TypeInputEmailVerificationFeature;
    override?: {
        functions?: (originalImplementation: RecipeImplementation) => RecipeInterface;
        apis?: (originalImplementation: APIImplementation) => APIInterface;
        emailVerificationFeature?: {
            functions?: (
                originalImplementation: EmailVerificationRecipeImplementation
            ) => EmailVerificationRecipeInterface;
            apis?: (originalImplementation: EmailVerificationAPIImplementation) => EmailVerificationAPIInterface;
        };
    };
};

const InputProvidersSchema = {
    type: "array",
};

export const InputSchema = {
    sessionFeature: InputSessionFeatureSchema,
    signUpFeature: InputSignUpSchema,
    providers: InputProvidersSchema,
    resetPasswordUsingTokenFeature: InputResetPasswordUsingTokenFeatureSchema,
    emailVerificationFeature: InputEmailVerificationFeatureSchema,
    override: TypeAny,
};

export type TypeNormalisedInput = {
    sessionFeature: TypeNormalisedInputSessionFeature;
    signUpFeature: TypeNormalisedInputSignUp;
    providers: TypeProvider[];
    resetPasswordUsingTokenFeature?: TypeInputResetPasswordUsingTokenFeature;
    emailVerificationFeature: TypeNormalisedInputEmailVerification;
    override: {
        functions: (originalImplementation: RecipeImplementation) => RecipeInterface;
        apis: (originalImplementation: APIImplementation) => APIInterface;
    };
};

export interface RecipeInterface {
    getUserById(userId: string): Promise<User | undefined>;

    getUserByThirdPartyInfo(thirdPartyId: string, thirdPartyUserId: string): Promise<User | undefined>;

    getUsersOldestFirst(
        limit?: number,
        nextPaginationToken?: string
    ): Promise<{
        users: User[];
        nextPaginationToken?: string;
    }>;

    getUsersNewestFirst(
        limit?: number,
        nextPaginationToken?: string
    ): Promise<{
        users: User[];
        nextPaginationToken?: string;
    }>;

    getUserCount(): Promise<number>;

    signInUp(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: {
            id: string;
            isVerified: boolean;
        }
    ): Promise<{ createdNewUser: boolean; user: User }>;

    signUp(email: string, password: string): Promise<User>;

    signIn(email: string, password: string): Promise<User>;

    getUserByEmail(email: string): Promise<User | undefined>;

    createResetPasswordToken(userId: string): Promise<string>;

    resetPasswordUsingToken(token: string, newPassword: string): Promise<void>;
}

export type EmailPasswordAPIOptions = EmailPasswordAPIOptionsOriginal;

export type ThirdPartyAPIOptions = ThirdPartyAPIOptionsOriginal;

export type SignInUpAPIInput =
    | {
          type: "emailpassword";
          isSignIn: boolean;
          formFields: {
              id: string;
              value: string;
          }[];
          options: EmailPasswordAPIOptions;
      }
    | {
          type: "thirdparty";
          provider: TypeProvider;
          code: string;
          redirectURI: string;
          options: ThirdPartyAPIOptions;
      };

export type SignInUpAPIOutput =
    | {
          type: "emailpassword";
          status: "OK";
          user: User;
          createdNewUser: boolean;
      }
    | {
          type: "thirdparty";
          status: "OK";
          createdNewUser: boolean;
          user: User;
          authCodeResponse: any;
      };

export interface APIInterface {
    authorisationUrlGET:
        | undefined
        | ((
              provider: TypeProvider,
              options: ThirdPartyAPIOptions
          ) => Promise<{
              status: "OK";
              url: string;
          }>);

    signOutPOST:
        | undefined
        | ((
              options: EmailPasswordAPIOptions
          ) => Promise<{
              status: "OK";
          }>);

    emailExistsGET:
        | undefined
        | ((
              email: string,
              options: EmailPasswordAPIOptions
          ) => Promise<{
              status: "OK";
              exists: boolean;
          }>);

    generatePasswordResetTokenPOST:
        | undefined
        | ((
              formFields: {
                  id: string;
                  value: string;
              }[],
              options: EmailPasswordAPIOptions
          ) => Promise<{
              status: "OK";
          }>);

    passwordResetPOST:
        | undefined
        | ((
              formFields: {
                  id: string;
                  value: string;
              }[],
              token: string,
              options: EmailPasswordAPIOptions
          ) => Promise<{
              status: "OK";
          }>);

    signInUpPOST: undefined | ((input: SignInUpAPIInput) => Promise<SignInUpAPIOutput>);
}
