"use strict";
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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ActiveDirectory;
const custom_1 = __importDefault(require("./custom"));
const utils_1 = require("./utils");
function ActiveDirectory(input) {
    if (input.config.name === undefined) {
        input.config.name = "Active Directory";
    }
    const oOverride = input.override;
    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function ({ clientType, userContext }) {
            const config = await oGetConfig({ clientType, userContext });
            if (config.additionalConfig !== undefined && config.additionalConfig.directoryId !== undefined) {
                config.oidcDiscoveryEndpoint = `https://login.microsoftonline.com/${config.additionalConfig.directoryId}/v2.0/.well-known/openid-configuration`;
            }
            if (config.oidcDiscoveryEndpoint !== undefined) {
                // The config could be coming from core where we didn't add the well-known previously
                config.oidcDiscoveryEndpoint = (0, utils_1.normaliseOIDCEndpointToIncludeWellKnown)(
                    config.oidcDiscoveryEndpoint
                );
            }
            if (config.scope === undefined) {
                config.scope = ["openid", "email"];
            }
            // TODO later if required, client assertion impl
            return config;
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return (0, custom_1.default)(input);
}
