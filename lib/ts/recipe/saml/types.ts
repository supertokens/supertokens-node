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
import { GeneralErrorResponse, NormalisedAppinfo, UserContext } from "../../types";

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

export type SAMLClient = {
    clientId: string;
    spEntityId: string;
    redirectURIs: string[];
    defaultRedirectURI: string;
    idpEntityId: string;
    idpSigningCertificate?: string;
    allowIDPInitiatedLogin: boolean;
};

export type RecipeInterface = {
    createOrUpdateClient: (input: {
        tenantId: string;
        clientId?: string;
        spEntityId: string;
        redirectURIs: string[];
        defaultRedirectURI: string;
        metadataXML?: string;
        metadataURL?: string;
        allowIDPInitiatedLogin?: boolean;
        userContext: UserContext;
    }) => Promise<({ status: "OK" } & SAMLClient) | { status: "INVALID_METADATA_XML_ERROR" }>;

    listClients: (input: {
        tenantId: string;
        userContext: UserContext;
    }) => Promise<{ status: "OK"; clients: SAMLClient[] }>;

    removeClient: (input: {
        tenantId: string;
        clientId: string;
        userContext: UserContext;
    }) => Promise<{ status: "OK"; didExist: boolean }>;

    verifyClientRedirectURI: (input: {
        clientId: string;
        redirectURI: string;
        userContext: UserContext;
    }) => Promise<{ status: "OK"; info: string } | { status: "UNKNOWN_CLIENT" | "INVALID_REDIRECT_URI" }>;

    createLoginRequest: (input: {
        tenantId: string;
        clientId: string;
        redirectURI: string;
        state?: string;
        acsURL: string;
        userContext: UserContext;
    }) => Promise<{ status: "OK"; redirectURI: string } | { status: "INVALID_CLIENT_ERROR" }>;

    verifySAMLResponse: (input: {
        tenantId: string;
        samlResponse: string;
        relayState: string | undefined;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
              redirectURI: string;
          }
        | {
              status: "SAML_RESPONSE_VERIFICATION_FAILED_ERROR" | "INVALID_RELAY_STATE_ERROR";
          }
    >;

    exchangeCodeForToken: (input: { tenantId: string; code: string; userContext: UserContext }) => Promise<
        | {
              status: "OK";
              tokens: {
                  idToken: string;
              };
          }
        | {
              status: "INVALID_CODE_ERROR";
          }
    >;
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    appInfo: NormalisedAppinfo;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};

export type APIInterface = {
    loginGET:
        | undefined
        | ((input: {
              tenantId: string;
              clientId: string;
              redirectURI: string;
              state?: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    redirectURI: string;
                    state?: string;
                }
              | {
                    status: "INVALID_CLIENT_ERROR";
                }
              | GeneralErrorResponse
          >);

    callbackPOST:
        | undefined
        | ((input: {
              tenantId: string;
              options: APIOptions;
              userContext: UserContext;
              samlResponse: string;
              relayState: string | undefined;
          }) => Promise<
              | {
                    status: "OK";
                    redirectURI: string;
                }
              | {
                    status: "SAML_RESPONSE_VERIFICATION_FAILED_ERROR" | "INVALID_RELAY_STATE_ERROR";
                }
              | GeneralErrorResponse
          >);
};
