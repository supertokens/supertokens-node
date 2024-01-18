"use strict";
/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
exports.getMFARelatedInfoFromSession = exports.isValidFirstFactor = exports.validateAndNormaliseUserInput = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const multitenancy_1 = __importDefault(require("../multitenancy"));
const __1 = require("../..");
const recipe_2 = __importDefault(require("./recipe"));
const multiFactorAuthClaim_1 = require("./multiFactorAuthClaim");
function validateAndNormaliseUserInput(config) {
    if (
        (config === null || config === void 0 ? void 0 : config.firstFactors) !== undefined &&
        (config === null || config === void 0 ? void 0 : config.firstFactors.length) === 0
    ) {
        throw new Error("'firstFactors' can be either undefined or a non-empty array");
    }
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config === null || config === void 0 ? void 0 : config.override
    );
    return {
        firstFactors: config === null || config === void 0 ? void 0 : config.firstFactors,
        override,
    };
}
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
const isValidFirstFactor = async function (tenantId, factorId, userContext) {
    const tenantInfo = await multitenancy_1.default.getTenant(tenantId, userContext);
    if (tenantInfo === undefined) {
        throw new Error("tenant not found");
    }
    const { status: _ } = tenantInfo,
        tenantConfig = __rest(tenantInfo, ["status"]);
    // we prioritise the firstFactors configured in tenant. If not present, we fallback to the recipe config
    // Core already validates that the firstFactors are valid as per the logn methods enabled for that tenant,
    // so we don't need to do additional checks here
    let validFirstFactors =
        tenantConfig.firstFactors !== undefined
            ? tenantConfig.firstFactors
            : recipe_1.default.getInstanceOrThrowError().config.firstFactors;
    if (validFirstFactors === undefined) {
        // if validFirstFactors is undefined, we can safely assume it to be true because we would then
        // have other points of failure:
        // - if login method is disabled in core for the tenant
        // - if appropriate recipe is not initialized, will result in a 404
        // In all other cases, we just want to allow all available login methods to be used as first factor
        return true;
    }
    return validFirstFactors.includes(factorId);
};
exports.isValidFirstFactor = isValidFirstFactor;
// This function is to reuse a piece of code that is needed in multiple places
const getMFARelatedInfoFromSession = async function (input) {
    var _a, _b;
    let userId;
    let tenantId;
    let accessTokenPayload;
    if ("session" in input) {
        userId = input.session.getUserId();
        tenantId = input.session.getTenantId();
        accessTokenPayload = input.session.getAccessTokenPayload();
    } else {
        userId = input.userId;
        tenantId = input.tenantId;
        accessTokenPayload = input.accessTokenPayload;
    }
    const sessionUser = await __1.getUser(userId, input.userContext);
    if (sessionUser === undefined) {
        return {
            status: "SESSION_USER_NOT_FOUND_ERROR",
        };
    }
    const factorsSetUpForUser = await recipe_2.default
        .getInstanceOrThrowError()
        .recipeInterfaceImpl.getFactorsSetupForUser({
            user: sessionUser,
            userContext: input.userContext,
        });
    const mfaClaimValue = multiFactorAuthClaim_1.MultiFactorAuthClaim.getValueFromPayload(accessTokenPayload);
    if (mfaClaimValue === undefined) {
        if (!input.assumeEmptyCompletedIfNotFound) {
            return {
                status: "MFA_CLAIM_VALUE_NOT_FOUND_ERROR",
            };
        }
    }
    const completedFactors =
        (_a = mfaClaimValue === null || mfaClaimValue === void 0 ? void 0 : mfaClaimValue.c) !== null && _a !== void 0
            ? _a
            : {};
    const requiredSecondaryFactorsForUser = await recipe_2.default
        .getInstanceOrThrowError()
        .recipeInterfaceImpl.getRequiredSecondaryFactorsForUser({
            userId,
            userContext: input.userContext,
        });
    const tenantInfo = await multitenancy_1.default.getTenant(tenantId, input.userContext);
    if (tenantInfo === undefined) {
        return {
            status: "TENANT_NOT_FOUND_ERROR",
        };
    }
    const { status: _ } = tenantInfo,
        tenantConfig = __rest(tenantInfo, ["status"]);
    const requiredSecondaryFactorsForTenant =
        (_b = tenantInfo.requiredSecondaryFactors) !== null && _b !== void 0 ? _b : [];
    const mfaRequirementsForAuth = await recipe_2.default
        .getInstanceOrThrowError()
        .recipeInterfaceImpl.getMFARequirementsForAuth({
            user: sessionUser,
            accessTokenPayload,
            tenantId,
            factorsSetUpForUser,
            requiredSecondaryFactorsForUser,
            requiredSecondaryFactorsForTenant,
            completedFactors,
            userContext: input.userContext,
        });
    return {
        status: "OK",
        sessionUser,
        factorsSetUpForUser,
        completedFactors,
        requiredSecondaryFactorsForUser,
        requiredSecondaryFactorsForTenant,
        mfaRequirementsForAuth,
        tenantConfig,
    };
};
exports.getMFARelatedInfoFromSession = getMFARelatedInfoFromSession;
