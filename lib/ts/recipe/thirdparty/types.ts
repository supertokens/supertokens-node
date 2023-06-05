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
import { NormalisedAppinfo } from "../../types";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";
import { GeneralErrorResponse, User } from "../../types";

export type UserInfo = { id: string; email?: { id: string; isVerified: boolean } };

export type TypeProviderGetResponse = {
    accessTokenAPI: {
        url: string;
        params: { [key: string]: string }; // Will be merged with our object
    };
    authorisationRedirect: {
        url: string;
        params: { [key: string]: string | ((request: any) => string) };
    };
    getProfileInfo: (authCodeResponse: any, userContext: any) => Promise<UserInfo>;
    getClientId: (userContext: any) => string;
    getRedirectURI?: (userContext: any) => string; // if undefined, the redirect_uri is set on the frontend.
};

export type TypeProvider = {
    id: string;
    get: (
        redirectURI: string | undefined,
        authCodeFromRequest: string | undefined,
        userContext: any
    ) => TypeProviderGetResponse;
    isDefault?: boolean; // if not present, we treat it as false
};

export type TypeInputSignInAndUp = {
    providers: TypeProvider[];
};

export type TypeNormalisedInputSignInAndUp = {
    providers: TypeProvider[];
};

export type TypeInput = {
    signInAndUpFeature: TypeInputSignInAndUp;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    signInAndUpFeature: TypeNormalisedInputSignInAndUp;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type RecipeInterface = {
    signInUp(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: string;
        isVerified: boolean;
        userContext: any;
    }): Promise<
        | { status: "OK"; createdNewUser: boolean; user: User }
        | {
              status: "SIGN_IN_NOT_ALLOWED";
              reason: string;
          }
    >;

    createNewOrUpdateEmailOfRecipeUser(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: string;
        userContext: any;
    }): Promise<
        | { status: "OK"; createdNewUser: boolean; user: User }
        | {
              status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
              reason: string;
          }
    >;
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    providers: TypeProvider[];
    req: BaseRequest;
    res: BaseResponse;
    appInfo: NormalisedAppinfo;
};

export type APIInterface = {
    authorisationUrlGET:
        | undefined
        | ((input: {
              provider: TypeProvider;
              options: APIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    url: string;
                }
              | GeneralErrorResponse
          >);

    signInUpPOST:
        | undefined
        | ((input: {
              provider: TypeProvider;
              code: string;
              redirectURI: string;
              authCodeResponse?: any;
              clientId?: string;
              options: APIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    createdNewUser: boolean;
                    user: User;
                    session: SessionContainerInterface;
                    authCodeResponse: any;
                }
              | { status: "NO_EMAIL_GIVEN_BY_PROVIDER" }
              | {
                    status: "SIGN_IN_NOT_ALLOWED";
                    reason: string;
                }
              | {
                    status: "EMAIL_ALREADY_EXISTS_ERROR";
                }
              | GeneralErrorResponse
          >);

    linkAccountWithUserFromSessionPOST:
        | undefined
        | ((input: {
              provider: TypeProvider;
              code: string;
              redirectURI: string;
              authCodeResponse?: any;
              clientId?: string;
              fromProvider:
                  | {
                        userInfo: UserInfo;
                        authCodeResponse: any;
                    }
                  | undefined;
              session: SessionContainerInterface;
              options: APIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    wereAccountsAlreadyLinked: boolean;
                    authCodeResponse: any;
                }
              | { status: "NO_EMAIL_GIVEN_BY_PROVIDER" }
              | {
                    status: "SIGN_IN_NOT_ALLOWED";
                    reason: string;
                }
              | {
                    status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR";
                    description: string;
                }
              | {
                    status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR";
                    description: string;
                    recipeUserId: string;
                    email: string;
                }
              | GeneralErrorResponse
          >);

    appleRedirectHandlerPOST:
        | undefined
        | ((input: { code: string; state: string; options: APIOptions; userContext: any }) => Promise<void>);
};
