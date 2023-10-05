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
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAndNormaliseUserInput = void 0;
function validateAndNormaliseUserInput(config) {
    var _a, _b;
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config === null || config === void 0 ? void 0 : config.override
    );
    return {
        firstFactors: config === null || config === void 0 ? void 0 : config.firstFactors,
        getMFARequirementsForFactorSetup:
            (_a = config === null || config === void 0 ? void 0 : config.getMFARequirementsForFactorSetup) !== null &&
            _a !== void 0
                ? _a
                : () => {
                      // TODO: the default should be 2FA if any secondary factors are set up, otherwise we only require the first factor to be completed
                      return [];
                  },
        getGlobalMFARequirements:
            (_b = config === null || config === void 0 ? void 0 : config.getGlobalMFARequirements) !== null &&
            _b !== void 0
                ? _b
                : () => {
                      // TODO: the default should be 2FA (so any 2 factors)
                      return [];
                  },
        override,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
