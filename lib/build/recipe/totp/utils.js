"use strict";
/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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
function validateAndNormaliseUserInput(_, appInfo, config) {
    var _a, _b, _c;
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config.override
    );
    return {
        issuer: (_a = config.issuer) !== null && _a !== void 0 ? _a : appInfo.appName,
        defaultPeriod: (_b = config.defaultPeriod) !== null && _b !== void 0 ? _b : 30,
        defaultSkew: (_c = config.defaultSkew) !== null && _c !== void 0 ? _c : 1,
        getUserIdentifierInfoForUserId: config.getEmailOrPhoneForRecipeUserId,
        override,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;