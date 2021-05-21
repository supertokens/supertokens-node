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

import { Request, Response, NextFunction } from "express";
import {
    RecipeInterface as EmailVerificationRecipeInterface,
    RecipeImplementation as EmailVerificationRecipeImplementation,
    APIImplementation as EmailVerificationAPIImplementation,
    APIInterface as EmailVerificationAPIInterface,
} from "../emailverification";
import { TypeInput as TypeNormalisedInputEmailVerification } from "../emailverification/types";
import { RecipeImplementation, APIImplementation } from "./";

const TypeBoolean = {
    type: "boolean",
};

const TypeAny = {
    type: "any",
};

export type UserInfo = { id: string; email?: { id: string; isVerified: boolean } };

export type TypeProviderGetResponse = {
    accessTokenAPI: {
        url: string;
        params: { [key: string]: string }; // Will be merged with our object
    };
    authorisationRedirect: {
        url: string;
        params: { [key: string]: string | ((request: Request) => string) };
    };
    getProfileInfo: (authCodeResponse: any) => Promise<UserInfo>;
};

export type TypeProvider = {
    id: string;
    get: (redirectURI: string | undefined, authCodeFromRequest: string | undefined) => Promise<TypeProviderGetResponse>;
};

export type User = {
    // https://github.com/supertokens/core-driver-interface/wiki#third-party-user
    id: string;
    timeJoined: number;
    email: string;
    thirdParty: {
        id: string;
        userId: string;
    };
};

export type TypeInputSetJwtPayloadForSession = (
    user: User,
    thirdPartyAuthCodeResponse: any,
    action: "signin" | "signup"
) => Promise<{ [key: string]: any } | undefined>;

export type TypeInputSetSessionDataForSession = (
    user: User,
    thirdPartyAuthCodeResponse: any,
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

export type TypeInputEmailVerificationFeature = {
    disableDefaultImplementation?: boolean;
    getEmailVerificationURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    handlePostEmailVerification?: (user: User) => Promise<void>;
    override?: {
        functions?: (originalImplementation: EmailVerificationRecipeImplementation) => EmailVerificationRecipeInterface;
        apis?: (originalImplementation: EmailVerificationAPIImplementation) => EmailVerificationAPIInterface;
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

export type TypeInputSignInAndUp = {
    disableDefaultImplementation?: boolean;
    handlePostSignUpIn?: (user: User, thirdPartyAuthCodeResponse: any, newUser: boolean) => Promise<void>;
    providers: TypeProvider[];
};

const InputSignInAndUpSchema = {
    type: "object",
    properties: {
        disableDefaultImplementation: TypeBoolean,
        providers: {
            type: "array",
        },
        handlePostSignUpIn: TypeAny,
    },
    required: ["providers"],
    additionalProperties: false,
};

export type TypeNormalisedInputSignInAndUp = {
    disableDefaultImplementation: boolean;
    handlePostSignUpIn: (user: User, thirdPartyAuthCodeResponse: any, newUser: boolean) => Promise<void>;
    providers: TypeProvider[];
};

export type TypeInputSignOutFeature = {
    disableDefaultImplementation?: boolean;
};

const InputSignOutSchema = {
    type: "object",
    properties: {
        disableDefaultImplementation: TypeBoolean,
    },
    additionalProperties: false,
};

export type TypeNormalisedInputSignOutFeature = {
    disableDefaultImplementation: boolean;
};

export type TypeInput = {
    sessionFeature?: TypeInputSessionFeature;
    signInAndUpFeature: TypeInputSignInAndUp;
    signOutFeature?: TypeInputSignOutFeature;
    emailVerificationFeature?: TypeInputEmailVerificationFeature;
    override?: {
        functions?: (originalImplementation: RecipeImplementation) => RecipeInterface;
        apis?: (originalImplementation: APIImplementation) => APIInterface;
    };
};

export const InputSchema = {
    type: "object",
    properties: {
        sessionFeature: InputSessionFeatureSchema,
        signInAndUpFeature: InputSignInAndUpSchema,
        signOutFeature: InputSignOutSchema,
        emailVerificationFeature: InputEmailVerificationFeatureSchema,
        override: TypeAny,
    },
    required: ["signInAndUpFeature"],
    additionalProperties: false,
};

export type TypeNormalisedInput = {
    sessionFeature: TypeNormalisedInputSessionFeature;
    signInAndUpFeature: TypeNormalisedInputSignInAndUp;
    signOutFeature: TypeNormalisedInputSignOutFeature;
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
}

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    req: Request;
    res: Response;
    next: NextFunction;
};

export interface APIInterface {
    authorisationUrlGET(
        provider: TypeProvider,
        options: APIOptions
    ): Promise<{
        status: "OK";
        url: string;
    }>;

    signInUpPOST(
        provider: TypeProvider,
        code: string,
        redirectURI: string,
        options: APIOptions
    ): Promise<{
        status: "OK";
        createdNewUser: boolean;
        user: User;
    }>;

    signOutPOST(
        options: APIOptions
    ): Promise<{
        status: "OK";
    }>;
}
