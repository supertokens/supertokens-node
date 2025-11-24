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
exports.AllowedDomainsClaim =
    exports.disassociateUserFromTenant =
    exports.associateUserToTenant =
    exports.deleteThirdPartyConfig =
    exports.createOrUpdateThirdPartyConfig =
    exports.listAllTenants =
    exports.getTenant =
    exports.deleteTenant =
    exports.createOrUpdateTenant =
    exports.init =
        void 0;
const recipe_1 = __importDefault(require("./recipe"));
const allowedDomainsClaim_1 = require("./allowedDomainsClaim");
Object.defineProperty(exports, "AllowedDomainsClaim", {
    enumerable: true,
    get: function () {
        return allowedDomainsClaim_1.AllowedDomainsClaim;
    },
});
const utils_1 = require("../../utils");
class Wrapper {
    static async createOrUpdateTenant(tenantId, config, userContext) {
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        return recipeInstance.recipeInterfaceImpl.createOrUpdateTenant({
            tenantId,
            config,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async deleteTenant(tenantId, userContext) {
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        return recipeInstance.recipeInterfaceImpl.deleteTenant({
            tenantId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async getTenant(tenantId, userContext) {
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        return recipeInstance.recipeInterfaceImpl.getTenant({
            tenantId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async listAllTenants(userContext) {
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        return recipeInstance.recipeInterfaceImpl.listAllTenants({
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async createOrUpdateThirdPartyConfig(tenantId, config, skipValidation, userContext) {
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        return recipeInstance.recipeInterfaceImpl.createOrUpdateThirdPartyConfig({
            tenantId,
            config,
            skipValidation,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async deleteThirdPartyConfig(tenantId, thirdPartyId, userContext) {
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        return recipeInstance.recipeInterfaceImpl.deleteThirdPartyConfig({
            tenantId,
            thirdPartyId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async associateUserToTenant(tenantId, recipeUserId, userContext) {
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        return recipeInstance.recipeInterfaceImpl.associateUserToTenant({
            tenantId,
            recipeUserId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async disassociateUserFromTenant(tenantId, recipeUserId, userContext) {
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        return recipeInstance.recipeInterfaceImpl.disassociateUserFromTenant({
            tenantId,
            recipeUserId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
}
Wrapper.init = recipe_1.default.init;
exports.default = Wrapper;
exports.init = Wrapper.init;
exports.createOrUpdateTenant = Wrapper.createOrUpdateTenant;
exports.deleteTenant = Wrapper.deleteTenant;
exports.getTenant = Wrapper.getTenant;
exports.listAllTenants = Wrapper.listAllTenants;
exports.createOrUpdateThirdPartyConfig = Wrapper.createOrUpdateThirdPartyConfig;
exports.deleteThirdPartyConfig = Wrapper.deleteThirdPartyConfig;
exports.associateUserToTenant = Wrapper.associateUserToTenant;
exports.disassociateUserFromTenant = Wrapper.disassociateUserFromTenant;
