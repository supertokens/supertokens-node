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
const recipe_1 = require("./recipe");
const error_1 = require("./error");
exports.RecipeDisabledForTenantError = error_1.RecipeDisabledForTenantError;
exports.TenantDoesNotExistError = error_1.TenantDoesNotExistError;
const multitenancyClaim_1 = require("./multitenancyClaim");
exports.AllowedDomainsClaim = multitenancyClaim_1.AllowedDomainsClaim;
class Wrapper {
    static createOrUpdateTenant(tenantId, config, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return recipeInstance.recipeInterfaceImpl.createOrUpdateTenant({
                tenantId,
                config,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static deleteTenant(tenantId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return recipeInstance.recipeInterfaceImpl.deleteTenant({
                tenantId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static getTenantConfig(tenantId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return recipeInstance.recipeInterfaceImpl.getTenantConfig({
                tenantId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static listAllTenants(userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return recipeInstance.recipeInterfaceImpl.listAllTenants({
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static createOrUpdateThirdPartyConfig(config, skipValidation, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return recipeInstance.recipeInterfaceImpl.createOrUpdateThirdPartyConfig({
                config,
                skipValidation,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static deleteThirdPartyConfig(tenantId, thirdPartyId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return recipeInstance.recipeInterfaceImpl.deleteThirdPartyConfig({
                tenantId,
                thirdPartyId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static listThirdPartyConfigsForThirdPartyId(thirdPartyId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return recipeInstance.recipeInterfaceImpl.listThirdPartyConfigsForThirdPartyId({
                thirdPartyId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
exports.init = Wrapper.init;
exports.createOrUpdateTenant = Wrapper.createOrUpdateTenant;
exports.deleteTenant = Wrapper.deleteTenant;
exports.getTenantConfig = Wrapper.getTenantConfig;
exports.listAllTenants = Wrapper.listAllTenants;
exports.createOrUpdateThirdPartyConfig = Wrapper.createOrUpdateThirdPartyConfig;
exports.deleteThirdPartyConfig = Wrapper.deleteThirdPartyConfig;
exports.listThirdPartyConfigsForThirdPartyId = Wrapper.listThirdPartyConfigsForThirdPartyId;
