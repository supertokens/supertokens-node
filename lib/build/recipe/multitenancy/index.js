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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllowedDomainsClaim = exports.TenantDoesNotExistError = exports.RecipeDisabledForTenantError = exports.disassociateUserFromTenant = exports.associateUserToTenant = exports.deleteThirdPartyConfig = exports.createOrUpdateThirdPartyConfig = exports.listAllTenants = exports.getTenant = exports.deleteTenant = exports.createOrUpdateTenant = exports.init = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const error_1 = require("./error");
Object.defineProperty(exports, "RecipeDisabledForTenantError", {
    enumerable: true,
    get: function () {
        return error_1.RecipeDisabledForTenantError;
    },
});
Object.defineProperty(exports, "TenantDoesNotExistError", {
    enumerable: true,
    get: function () {
        return error_1.TenantDoesNotExistError;
    },
});
const multitenancyClaim_1 = require("./multitenancyClaim");
Object.defineProperty(exports, "AllowedDomainsClaim", {
    enumerable: true,
    get: function () {
        return multitenancyClaim_1.AllowedDomainsClaim;
    },
});
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
    static getTenant(tenantId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return recipeInstance.recipeInterfaceImpl.getTenant({
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
    static createOrUpdateThirdPartyConfig(tenantId, config, skipValidation, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return recipeInstance.recipeInterfaceImpl.createOrUpdateThirdPartyConfig({
                tenantId,
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
    static associateUserToTenant(tenantId, userId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return recipeInstance.recipeInterfaceImpl.associateUserToTenant({
                tenantId,
                userId,
                userContext: userContext === undefined ? {} : userContext,
            });
        });
    }
    static disassociateUserFromTenant(tenantId, userId, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipeInstance = recipe_1.default.getInstanceOrThrowError();
            return recipeInstance.recipeInterfaceImpl.disassociateUserFromTenant({
                tenantId,
                userId,
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
exports.getTenant = Wrapper.getTenant;
exports.listAllTenants = Wrapper.listAllTenants;
exports.createOrUpdateThirdPartyConfig = Wrapper.createOrUpdateThirdPartyConfig;
exports.deleteThirdPartyConfig = Wrapper.deleteThirdPartyConfig;
exports.associateUserToTenant = Wrapper.associateUserToTenant;
exports.disassociateUserFromTenant = Wrapper.disassociateUserFromTenant;
