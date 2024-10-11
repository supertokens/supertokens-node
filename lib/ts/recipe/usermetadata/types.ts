/* Copyright (c) 2022, VRAI Labs and/or its affiliates. All rights reserved.
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
import { GeneralErrorResponse, JSONObject, UserContext } from "../../types";
import { SessionContainerInterface } from "../session/types";

export type TypeInput = {
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};

export type APIInterface = {
    updateUserDetailsPOST?: (input: {
        session: SessionContainerInterface;
        details: {
            name?: string;
        };
        options: APIOptions;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
              details: {
                  name: string | undefined;
              };
          }
        | {
              status: "USER_DETAILS_UPDATE_NOT_ALLOWED";
              reason: string;
          }
        | GeneralErrorResponse
    >;

    userEmailsGET?: (input: {
        session: SessionContainerInterface;
        options: APIOptions;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
              emails: Array<{
                  id: string;
                  isVerified: boolean;
                  isPrimary: boolean;
              }>;
          }
        | GeneralErrorResponse
    >;

    addEmailForUserPOST?: (input: {
        email: {
            id: string;
            isVerified?: boolean;
            isPrimary?: boolean;
        };
        session: SessionContainerInterface;
        options: APIOptions;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
          }
        | {
              status: "UNVERIFIED_EMAIL_CANNOT_BE_PRIMARY";
              reason: string;
          }
        | GeneralErrorResponse
    >;

    updateEmailForUserPATCH?: (input: {
        emailId: string;
        details: {
            isVerified?: boolean;
            isPrimary?: boolean;
        };
        session: SessionContainerInterface;
        options: APIOptions;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
          }
        | {
              status: "UNVERIFIED_EMAIL_CANNOT_BE_PRIMARY";
              reason: string;
          }
        | GeneralErrorResponse
    >;

    removeEmailForUserDELETE?: (
        emailId: string,
        session: SessionContainerInterface,
        options: APIOptions,
        userContext: UserContext
    ) => Promise<
        | {
              status: "OK";
              email: {
                  id: string;
                  isVerified: boolean;
                  isPrimary: boolean;
              };
          }
        | {
              status: "AT_LEAST_ONE_VERIFIED_EMAIL_IS_REQUIRED";
              reason: string;
          }
        | GeneralErrorResponse
    >;

    userPhoneNumbersGET?: (input: {
        session: SessionContainerInterface;
        options: APIOptions;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
              phones: Array<{
                  number: string;
                  isVerified: boolean;
              }>;
          }
        | GeneralErrorResponse
    >;

    addPhoneNumberForUserPOST?: (input: {
        phone: {
            number: string;
            isVerified?: boolean;
        };
        session: SessionContainerInterface;
        options: APIOptions;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
          }
        | GeneralErrorResponse
    >;

    updatePhoneNumberForUserPATCH?: (input: {
        phoneNumber: string;
        details: {
            isVerified?: boolean;
        };
        session: SessionContainerInterface;
        options: APIOptions;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
          }
        | GeneralErrorResponse
    >;

    removePhoneNumberForUserDELETE?: (
        phoneNumber: string,
        session: SessionContainerInterface,
        options: APIOptions,
        userContext: UserContext
    ) => Promise<
        | {
              status: "OK";
          }
        | GeneralErrorResponse
    >;
};

export type RecipeInterface = {
    getUserMetadata: (input: {
        userId: string;
        userContext: UserContext;
    }) => Promise<{
        status: "OK";
        metadata: any;
    }>;

    /**
     * Updates the metadata object of the user by doing a shallow merge of the stored and the update JSONs
     * and removing properties set to null on the root level of the update object.
     * e.g.:
     *   - stored: `{ "preferences": { "theme":"dark" }, "notifications": { "email": true }, "todos": ["example"] }`
     *   - update: `{ "notifications": { "sms": true }, "todos": null }`
     *   - result: `{ "preferences": { "theme":"dark" }, "notifications": { "sms": true } }`
     */
    updateUserMetadata: (input: {
        userId: string;
        metadataUpdate: JSONObject;
        userContext: UserContext;
    }) => Promise<{
        status: "OK";
        metadata: JSONObject;
    }>;

    clearUserMetadata: (input: {
        userId: string;
        userContext: UserContext;
    }) => Promise<{
        status: "OK";
    }>;
};
