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

import { NormalisedAppinfo } from "../../types";
import { RecipeInterface, APIInterface, TypeProvider, ProviderInput, ProviderConfig } from "./types";
import { TypeInput, TypeNormalisedInput, TypeInputSignInAndUp, TypeNormalisedInputSignInAndUp } from "./types";
import {
    ActiveDirectory,
    Apple,
    Discord,
    Facebook,
    Github,
    Google,
    GoogleWorkspaces,
    Okta,
    Linkedin,
    BoxySaml,
    NewProvider,
} from "./providers";

export function validateAndNormaliseUserInput(appInfo: NormalisedAppinfo, config: TypeInput): TypeNormalisedInput {
    let signInAndUpFeature = validateAndNormaliseSignInAndUpConfig(appInfo, config.signInAndUpFeature);

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config.override,
    };

    return {
        signInAndUpFeature,
        override,
    };
}

function validateAndNormaliseSignInAndUpConfig(
    _: NormalisedAppinfo,
    config: TypeInputSignInAndUp
): TypeNormalisedInputSignInAndUp {
    let providers = config.providers;

    const thirdPartyIdSet: { [key: string]: boolean } = {};

    for (const provider of providers) {
        if (thirdPartyIdSet[provider.config.thirdPartyId] === true) {
            throw new Error(`The providers array has multiple entries for the same third party provider.`);
        }
        thirdPartyIdSet[provider.config.thirdPartyId] = true;
    }

    // TODO tp-rework normalise provider inputs

    return {
        providers,
    };
}

function createProvider(input: ProviderInput): TypeProvider {
    switch (input.config.thirdPartyId) {
        case "active-directory":
            return ActiveDirectory(input);
        case "apple":
            return Apple(input);
        case "discord":
            return Discord(input);
        case "facebook":
            return Facebook(input);
        case "github":
            return Github(input);
        case "google":
            return Google(input);
        case "google-workspaces":
            return GoogleWorkspaces(input);
        case "okta":
            return Okta(input);
        case "linkedin":
            return Linkedin(input);
        case "boxy-saml":
            return BoxySaml(input);
    }

    return NewProvider(input);
}

export function findAndCreateProviderInstance(providers: ProviderInput[], thirdPartyId: string): TypeProvider {
    for (const providerInput of providers) {
        if (providerInput.config.thirdPartyId === thirdPartyId) {
            return createProvider(providerInput);
        }
    }
    throw new Error(`the provider {thirdPartyId} could not be found in the configuration`);
}

export function mergeConfig(staticConfig: ProviderConfig, coreConfig: ProviderConfig): ProviderConfig {
    const result = {
        ...staticConfig,
        ...coreConfig,
        userInfoMap: {
            fromIdTokenPayload: {
                ...staticConfig.userInfoMap?.fromIdTokenPayload,
                ...coreConfig.userInfoMap?.fromIdTokenPayload,
            },
            fromUserInfoAPI: {
                ...staticConfig.userInfoMap?.fromUserInfoAPI,
                ...coreConfig.userInfoMap?.fromUserInfoAPI,
            },
        },
    };

    const mergedClients = [...staticConfig.clients];
    for (const client of coreConfig.clients) {
        const index = mergedClients.findIndex((c) => c.clientType === client.clientType);
        if (index === -1) {
            mergedClients.push(client);
        } else {
            mergedClients[index] = {
                ...client,
            };
        }
    }
    result.clients = mergedClients;

    return result;
}
