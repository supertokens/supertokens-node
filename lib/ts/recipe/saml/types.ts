/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
import { GeneralErrorResponse, UserContext } from "../../types";
import { SessionContainerInterface } from "../session/types";

export type TypeInput = {
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type RecipeInterface = {
    verifyClientRedirectURI: (input: {
        clientId: string;
        redirectURI: string;
        userContext: UserContext;
    }) => Promise<{ status: "OK"; info: string } | { status: "UNKNOWN_CLIENT" | "INVALID_REDIRECT_URI" }>;

    createLoginRequest: (input: {
        clientId: string;
        redirectURI: string;
        userContext: UserContext;
    }) => Promise<{ status: "OK"; redirectURL: string }>;

    verifySAMLResponse: (input: { samlResponse: string; userContext: UserContext }) => Promise<
        | {
              status: "OK";
          }
        | {
              status: "INVALID_RESPONSE";
          }
    >;
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
    loginGET:
        | undefined
        | ((input: { clientId: string; redirectURI: string; options: APIOptions; userContext: UserContext }) => Promise<
              | {
                    status: "OK";
                    redirectURL: string;
                }
              | GeneralErrorResponse
          >);

    callbackPOST:
        | undefined
        | ((input: { options: APIOptions; session: SessionContainerInterface; userContext: UserContext }) => Promise<
              | {
                    status: "OK";
                }
              | GeneralErrorResponse
          >);
};
