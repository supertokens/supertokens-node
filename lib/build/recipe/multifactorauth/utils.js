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
exports.isValidFirstFactor = exports.checkFactorRequirement = exports.validateAndNormaliseUserInput = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const multitenancy_1 = __importDefault(require("../multitenancy"));
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
function checkFactorRequirement(req, completedFactors) {
    return {
        id: req,
        isValid: completedFactors !== undefined && completedFactors[req] !== undefined,
        message: "Not completed",
    };
}
exports.checkFactorRequirement = checkFactorRequirement;
const isValidFirstFactor = async function (tenantId, factorId, userContext) {
    const tenantInfo = await multitenancy_1.default.getTenant(tenantId, userContext);
    if (tenantInfo === undefined) {
        throw new Error("tenant not found");
    }
    const { status: _ } = tenantInfo,
        tenantConfig = __rest(tenantInfo, ["status"]);
    // we prioritise the firstFactors configured in tenant. If not present, we fallback to the recipe config
    // if validFirstFactors is undefined, we assume it's valid. We assume it's valid because we will still get errors
    // if the loginMethod is disabled in core, or not initialised in the recipeList
    // Core already validates that the firstFactors are valid as per the logn methods enabled for that tenant,
    // so we don't need to do additional checks here
    let validFirstFactors =
        tenantConfig.firstFactors !== undefined
            ? tenantConfig.firstFactors
            : recipe_1.default.getInstanceOrThrowError().config.firstFactors;
    if (validFirstFactors !== undefined && !validFirstFactors.includes(factorId)) {
        return false;
    }
    return true;
};
exports.isValidFirstFactor = isValidFirstFactor;
