"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAndNormaliseUserInput = void 0;
function validateAndNormaliseUserInput(_appInfo, config) {
    if (config === undefined || config.providerConfig === undefined) {
        throw new Error("Please pass providerConfig argument in the OAuth2Client recipe.");
    }
    if (config.providerConfig.clientId === undefined) {
        throw new Error("Please pass clientId argument in the OAuth2Client providerConfig.");
    }
    // TODO: Decide on the prefix and also if we will allow users to customise clientIds
    // if (!config.providerConfig.clientId.startsWith("supertokens_")) {
    //     throw new Error(
    //         `Only Supertokens OAuth ClientIds are supported in the OAuth2Client recipe. For any other OAuth Clients use the thirdparty recipe.`
    //     );
    // }
    if (config.providerConfig.clientSecret === undefined) {
        throw new Error("Please pass clientSecret argument in the OAuth2Client providerConfig.");
    }
    if (config.providerConfig.oidcDiscoveryEndpoint === undefined) {
        throw new Error("Please pass oidcDiscoveryEndpoint argument in the OAuth2Client providerConfig.");
    }
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config === null || config === void 0 ? void 0 : config.override
    );
    return {
        providerConfig: config.providerConfig,
        override,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
