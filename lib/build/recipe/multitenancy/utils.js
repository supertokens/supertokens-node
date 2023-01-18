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
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../utils");
function validateAndNormaliseUserInput(config) {
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config === null || config === void 0 ? void 0 : config.override
    );
    const errorHandlers = {
        onTenantDoesNotExistError: function (message, _, response) {
            return __awaiter(this, void 0, void 0, function* () {
                utils_1.sendNon200ResponseWithMessage(response, message, 422);
            });
        },
        onRecipeDisabledForTenantError: function (message, _, response) {
            return __awaiter(this, void 0, void 0, function* () {
                utils_1.sendNon200ResponseWithMessage(response, message, 403);
            });
        },
    };
    if (config !== undefined) {
        if (config.errorHandlers !== undefined) {
            if (config.errorHandlers.onTenantDoesNotExistError !== undefined) {
                errorHandlers.onTenantDoesNotExistError = config.errorHandlers.onTenantDoesNotExistError;
            }
            if (config.errorHandlers.onRecipeDisabledForTenantError !== undefined) {
                errorHandlers.onRecipeDisabledForTenantError = config.errorHandlers.onRecipeDisabledForTenantError;
            }
        }
    }
    return {
        getTenantIdForUserId: config === null || config === void 0 ? void 0 : config.getTenantIdForUserId,
        getAllowedDomainsForTenantId:
            config === null || config === void 0 ? void 0 : config.getAllowedDomainsForTenantId,
        override,
        errorHandlers,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
