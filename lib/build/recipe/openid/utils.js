"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAndNormaliseUserInput = void 0;
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
const normalisedURLDomain_1 = __importDefault(require("../../normalisedURLDomain"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
function validateAndNormaliseUserInput(appInfo, config) {
    let issuerDomain = appInfo.apiDomain;
    let issuerPath = appInfo.apiBasePath;
    if (config !== undefined) {
        if (config.issuer !== undefined) {
            issuerDomain = new normalisedURLDomain_1.default(config.issuer);
            issuerPath = new normalisedURLPath_1.default(config.issuer);
        }
        if (!issuerPath.equals(appInfo.apiBasePath)) {
            throw new Error("The path of the issuer URL must be equal to the apiBasePath. The default value is /auth");
        }
    }
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config === null || config === void 0 ? void 0 : config.override
    );
    return {
        issuerDomain,
        issuerPath,
        jwtValiditySeconds: config === null || config === void 0 ? void 0 : config.jwtValiditySeconds,
        override,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
