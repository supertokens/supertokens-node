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
exports.default = BoxySAML;
const custom_1 = __importDefault(require("./custom"));
function BoxySAML(input) {
    var _a;
    if (input.config.name === undefined) {
        input.config.name = "SAML";
    }
    input.config.userInfoMap = Object.assign(Object.assign({}, input.config.userInfoMap), {
        fromUserInfoAPI: Object.assign(
            { userId: "id", email: "email" },
            (_a = input.config.userInfoMap) === null || _a === void 0 ? void 0 : _a.fromUserInfoAPI
        ),
    });
    const oOverride = input.override;
    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function ({ clientType, userContext }) {
            var _a;
            const config = await oGetConfig({ clientType, userContext });
            if (((_a = config.additionalConfig) === null || _a === void 0 ? void 0 : _a.boxyURL) !== undefined) {
                const boxyURL = config.additionalConfig.boxyURL;
                if (config.authorizationEndpoint === undefined) {
                    config.authorizationEndpoint = `${boxyURL}/api/oauth/authorize`;
                }
                if (config.tokenEndpoint === undefined) {
                    config.tokenEndpoint = `${boxyURL}/api/oauth/token`;
                }
                if (config.userInfoEndpoint === undefined) {
                    config.userInfoEndpoint = `${boxyURL}/api/oauth/userinfo`;
                }
            }
            return config;
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return (0, custom_1.default)(input);
}
