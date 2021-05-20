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
import { TypeProvider } from "../thirdparty/types";
import { TypeInput as TypeNormalisedInputEmailVerification } from "../emailverification/types";
import {
    RecipeImplementation as EmailVerificationRecipeImplementation,
    RecipeInterface as EmailVerificationRecipeInterface,
} from "../emailverification";
import {
    NormalisedFormField,
    TypeFormField,
    TypeInputFormField,
    TypeInputResetPasswordUsingTokenFeature,
    InputResetPasswordUsingTokenFeatureSchema,
} from "../emailpassword/types";
import { RecipeImplementation } from "./";

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
    disableDefaultImplementation?: boolean;
    formFields?: TypeInputFormField[];
    handlePostSignUp?: TypeInputHandlePostSignUp;
};

const InputSignUpSchema = {
    type: "object",
    properties: {
        disableDefaultImplementation: TypeBoolean,
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
        handlePostSignUp: TypeAny,
    },
    additionalProperties: false,
};

export type TypeNormalisedInputSignUp = {
    disableDefaultImplementation: boolean;
    formFields: NormalisedFormField[];
    handlePostSignUp: TypeInputHandlePostSignUp;
};

export type TypeInputSignIn = {
    disableDefaultImplementation?: boolean;
    handlePostSignIn?: TypeInputHandlePostSignIn;
};

const InputSignInSchema = {
    type: "object",
    properties: {
        disableDefaultImplementation: TypeBoolean,
        handlePostSignIn: TypeAny,
    },
    additionalProperties: false,
};

export type TypeNormalisedInputSignIn = {
    disableDefaultImplementation: boolean;
    handlePostSignIn: TypeInputHandlePostSignIn;
};

export type TypeInputSignOut = {
    disableDefaultImplementation?: boolean;
};

const InputSignOutSchema = {
    type: "object",
    properties: {
        disableDefaultImplementation: TypeBoolean,
    },
    additionalProperties: false,
};

export type TypeNormalisedInputSignOut = {
    disableDefaultImplementation: boolean;
};

export type TypeInputEmailVerificationFeature = {
    disableDefaultImplementation?: boolean;
    getEmailVerificationURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    handlePostEmailVerification?: (user: User) => Promise<void>;
    override?: {
        functions?: (originalImplementation: EmailVerificationRecipeImplementation) => EmailVerificationRecipeInterface;
    };
};

const InputEmailVerificationFeatureSchema = {
    type: "object",
    properties: {
        disableDefaultImplementation: TypeBoolean,
        getEmailVerificationURL: TypeAny,
        createAndSendCustomEmail: TypeAny,
        handlePostEmailVerification: TypeAny,
        override: TypeAny,
    },
    additionalProperties: false,
};

export type TypeInput = {
    sessionFeature?: TypeInputSessionFeature;
    signUpFeature?: TypeInputSignUp;
    signInFeature?: TypeInputSignIn;
    providers?: TypeProvider[];
    signOutFeature?: TypeInputSignOut;
    resetPasswordUsingTokenFeature?: TypeInputResetPasswordUsingTokenFeature;
    emailVerificationFeature?: TypeInputEmailVerificationFeature;
    override?: {
        functions?: (originalImplementation: RecipeImplementation) => RecipeInterface;
    };
};

const InputProvidersSchema = {
    type: "array",
};

export const InputSchema = {
    sessionFeature: InputSessionFeatureSchema,
    signUpFeature: InputSignUpSchema,
    signInFeature: InputSignInSchema,
    providers: InputProvidersSchema,
    signOutFeature: InputSignOutSchema,
    resetPasswordUsingTokenFeature: InputResetPasswordUsingTokenFeatureSchema,
    emailVerificationFeature: InputEmailVerificationFeatureSchema,
    override: TypeAny,
};

export type TypeNormalisedInput = {
    sessionFeature: TypeNormalisedInputSessionFeature;
    signUpFeature: TypeNormalisedInputSignUp;
    signInFeature: TypeNormalisedInputSignIn;
    providers: TypeProvider[];
    signOutFeature: TypeNormalisedInputSignOut;
    resetPasswordUsingTokenFeature?: TypeInputResetPasswordUsingTokenFeature;
    emailVerificationFeature: TypeNormalisedInputEmailVerification;
    override: {
        functions: (originalImplementation: RecipeImplementation) => RecipeInterface;
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
