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
var __rest =
    (this && this.__rest) ||
    function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
            }
        return t;
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidFirstFactor = void 0;
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
exports.isFactorConfiguredForTenant = isFactorConfiguredForTenant;
const recipe_1 = __importDefault(require("./recipe"));
const logger_1 = require("../../logger");
const types_1 = require("../multifactorauth/types");
function validateAndNormaliseUserInput(config) {
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config === null || config === void 0 ? void 0 : config.override
    );
    return {
        getAllowedDomainsForTenantId:
            config === null || config === void 0 ? void 0 : config.getAllowedDomainsForTenantId,
        override,
    };
}
const isValidFirstFactor = async function (tenantId, factorId, userContext) {
    var _a;
    const mtRecipe = recipe_1.default.getInstance();
    if (mtRecipe === undefined) {
        throw new Error("Should never happen");
    }
    const tenantInfo = await mtRecipe.recipeInterfaceImpl.getTenant({ tenantId, userContext });
    if (tenantInfo === undefined) {
        return {
            status: "TENANT_NOT_FOUND_ERROR",
        };
    }
    const { status: _ } = tenantInfo,
        tenantConfig = __rest(tenantInfo, ["status"]);
    const firstFactorsFromMFA = mtRecipe.staticFirstFactors;
    (0, logger_1.logDebugMessage)(
        `isValidFirstFactor got ${
            (_a = tenantConfig.firstFactors) === null || _a === void 0 ? void 0 : _a.join(", ")
        } from tenant config`
    );
    (0, logger_1.logDebugMessage)(`isValidFirstFactor got ${firstFactorsFromMFA} from MFA`);
    // first factors configured in core is prioritised over the ones configured statically
    let configuredFirstFactors =
        tenantConfig.firstFactors !== undefined ? tenantConfig.firstFactors : firstFactorsFromMFA;
    if (configuredFirstFactors === undefined) {
        configuredFirstFactors = mtRecipe.allAvailableFirstFactors;
    }
    if (
        isFactorConfiguredForTenant({
            tenantConfig,
            allAvailableFirstFactors: mtRecipe.allAvailableFirstFactors,
            firstFactors: configuredFirstFactors,
            factorId,
        })
    ) {
        return {
            status: "OK",
        };
    }
    return {
        status: "INVALID_FIRST_FACTOR_ERROR",
    };
};
exports.isValidFirstFactor = isValidFirstFactor;
function isFactorConfiguredForTenant({ allAvailableFirstFactors, firstFactors, factorId }) {
    // Here we filter the array so that we only have:
    // 1. Factors that other recipes have marked as available
    // 2. Custom factors (not in the built-in FactorIds list)
    let configuredFirstFactors = firstFactors.filter(
        (factorId) =>
            allAvailableFirstFactors.includes(factorId) || !Object.values(types_1.FactorIds).includes(factorId)
    );
    // Filter based on enabled recipes in the core is no more required
    // if (tenantConfig.emailPassword.enabled === false) {
    //     configuredFirstFactors = configuredFirstFactors.filter(
    //         (factorId: string) => factorId !== FactorIds.EMAILPASSWORD
    //     );
    // }
    // if (tenantConfig.passwordless.enabled === false) {
    //     configuredFirstFactors = configuredFirstFactors.filter(
    //         (factorId: string) =>
    //             ![FactorIds.LINK_EMAIL, FactorIds.LINK_PHONE, FactorIds.OTP_EMAIL, FactorIds.OTP_PHONE].includes(
    //                 factorId
    //             )
    //     );
    // }
    // if (tenantConfig.thirdParty.enabled === false) {
    //     configuredFirstFactors = configuredFirstFactors.filter((factorId: string) => factorId !== FactorIds.THIRDPARTY);
    // }
    return configuredFirstFactors.includes(factorId);
}
