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

import { TypeInput as TypeNormalisedInputEmailVerification } from "../emailverification/types";

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
        params: { [key: string]: string };
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

export type TypeInputEmailVerificationFeature = {
    disableDefaultImplementation?: boolean;
    getEmailVerificationURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    handlePostEmailVerification?: (user: User) => Promise<void>;
};

const InputEmailVerificationFeatureSchema = {
    type: "object",
    properties: {
        disableDefaultImplementation: TypeBoolean,
        getEmailVerificationURL: TypeAny,
        createAndSendCustomEmail: TypeAny,
        handlePostEmailVerification: TypeAny,
    },
    additionalProperties: false,
};

export type TypeNormalisedInputEmailVerificationFeature = {
    disableDefaultImplementation: boolean;
    getEmailVerificationURL: (user: User) => Promise<string>;
    createAndSendCustomEmail: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    handlePostEmailVerification: (user: User) => Promise<void>;
};

export type TypeInputSignInAndUp = {
    disableDefaultImplementation?: boolean;
    handlePostSignUpIn?: (user: User, thirdPartyAuthCodeResponse: any) => Promise<void>;
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
    handlePostSignUpIn: (user: User, thirdPartyAuthCodeResponse: any) => Promise<void>;
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
    signInAndUpFeature: TypeInputSignInAndUp;
    signOutFeature?: TypeInputSignOutFeature;
    emailVerificationFeature?: TypeInputEmailVerificationFeature;
};

export const InputSchema = {
    type: "object",
    properties: {
        signInAndUpFeature: InputSignInAndUpSchema,
        signOutFeature: InputSignOutSchema,
        emailVerificationFeature: InputEmailVerificationFeatureSchema,
    },
    required: ["signInAndUpFeature"],
    additionalProperties: false,
};

export type TypeNormalisedInput = {
    signInAndUpFeature: TypeNormalisedInputSignInAndUp;
    signOutFeature: TypeNormalisedInputSignOutFeature;
    emailVerificationFeature: TypeNormalisedInputEmailVerification;
};
