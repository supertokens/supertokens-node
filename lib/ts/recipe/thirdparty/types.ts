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
    APIInterface as EmailVerificationAPIInterface,
    OriginalAPIInterface as EmailVerificationOriginalAPIInterface,
} from "../emailverification";
import { TypeInput as TypeInputEmailVerification } from "../emailverification/types";

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

export type TypeInputSignInAndUp = {
    providers: TypeProvider[];
};

const InputSignInAndUpSchema = {
    type: "object",
    properties: {
        providers: {
            type: "array",
        },
    },
    required: ["providers"],
    additionalProperties: false,
};

export type TypeNormalisedInputSignInAndUp = {
    providers: TypeProvider[];
};

export type TypeInput = {
    sessionFeature?: TypeInputSessionFeature;
    signInAndUpFeature: TypeInputSignInAndUp;
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
        signInAndUpFeature: InputSignInAndUpSchema,
        emailVerificationFeature: InputEmailVerificationFeatureSchema,
        override: TypeAny,
    },
    required: ["signInAndUpFeature"],
    additionalProperties: false,
};

export type TypeNormalisedInput = {
    sessionFeature: TypeNormalisedInputSessionFeature;
    signInAndUpFeature: TypeNormalisedInputSignInAndUp;
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

export interface RecipeInterface {
    getUserById(input: { userId: string }): Promise<User | undefined>;

    getUserByThirdPartyInfo(input: { thirdPartyId: string; thirdPartyUserId: string }): Promise<User | undefined>;

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

    signInUp(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: {
            id: string;
            isVerified: boolean;
        };
    }): Promise<
        | { status: "OK"; createdNewUser: boolean; user: User }
        | {
              status: "FIELD_ERROR";
              error: string;
          }
    >;
}

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    providers: TypeProvider[];
    req: Request;
    res: Response;
    next: NextFunction;
};

export interface OriginalAPIInterface {
    authorisationUrlGET: (input: {
        provider: TypeProvider;
        options: APIOptions;
    }) => Promise<{
        status: "OK";
        url: string;
    }>;

    signInUpPOST: (input: {
        provider: TypeProvider;
        code: string;
        redirectURI: string;
        options: APIOptions;
    }) => Promise<
        | {
              status: "OK";
              createdNewUser: boolean;
              user: User;
              authCodeResponse: any;
          }
        | { status: "NO_EMAIL_GIVEN_BY_PROVIDER" }
        | {
              status: "FIELD_ERROR";
              error: string;
          }
    >;
}

export interface APIInterface {
    authorisationUrlGET:
        | undefined
        | ((input: {
              provider: TypeProvider;
              options: APIOptions;
          }) => Promise<{
              status: "OK";
              url: string;
          }>);

    signInUpPOST:
        | undefined
        | ((input: {
              provider: TypeProvider;
              code: string;
              redirectURI: string;
              options: APIOptions;
          }) => Promise<
              | {
                    status: "OK";
                    createdNewUser: boolean;
                    user: User;
                    authCodeResponse: any;
                }
              | { status: "NO_EMAIL_GIVEN_BY_PROVIDER" }
              | {
                    status: "FIELD_ERROR";
                    error: string;
                }
          >);
}
