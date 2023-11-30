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
exports.MultiFactorAuthClaim = exports.markFactorAsCompleteInSession = exports.init = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const multiFactorAuthClaim_1 = require("./multiFactorAuthClaim");
Object.defineProperty(exports, "MultiFactorAuthClaim", {
    enumerable: true,
    get: function () {
        return multiFactorAuthClaim_1.MultiFactorAuthClaim;
    },
});
const __1 = require("../..");
class Wrapper {
    static async getFactorsSetUpByUser(tenantId, userId, userContext) {
        const ctx = userContext !== null && userContext !== void 0 ? userContext : {};
        const user = await __1.getUser(userId, ctx);
        if (!user) {
            throw new Error("UKNKNOWN_USER_ID");
        }
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getFactorsSetupForUser({
            user,
            tenantId,
            userContext: ctx,
        });
    }
    static async isAllowedToSetupFactor(session, factorId, userContext) {
        var _a;
        let ctx = userContext !== null && userContext !== void 0 ? userContext : {};
        const user = await __1.getUser(session.getUserId(), ctx);
        if (!user) {
            throw new Error("UKNKNOWN_USER_ID");
        }
        const factorsSetup = await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getFactorsSetupForUser({
                user,
                tenantId: session.getTenantId(),
                userContext: ctx,
            });
        const mfaClaimValue = await session.getClaimValue(multiFactorAuthClaim_1.MultiFactorAuthClaim, ctx);
        const completedFactors =
            (_a = mfaClaimValue === null || mfaClaimValue === void 0 ? void 0 : mfaClaimValue.c) !== null &&
            _a !== void 0
                ? _a
                : {};
        const defaultMFARequirementsForUser = []; // TODO MFA
        const defaultMFARequirementsForTenant = []; // TODO MFA
        const requirements = await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getMFARequirementsForAuth({
                session,
                factorsSetUpForUser: factorsSetup,
                defaultRequiredFactorIdsForUser: defaultMFARequirementsForUser,
                defaultRequiredFactorIdsForTenant: defaultMFARequirementsForTenant,
                completedFactors,
                userContext: ctx,
            });
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.isAllowedToSetupFactor({
            session,
            factorId,
            completedFactors,
            mfaRequirementsForAuth: requirements,
            factorsSetUpForUser: factorsSetup,
            defaultRequiredFactorIdsForUser: defaultMFARequirementsForUser,
            defaultRequiredFactorIdsForTenant: defaultMFARequirementsForTenant,
            userContext,
        });
    }
    static async markFactorAsCompleteInSession(session, factorId, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.markFactorAsCompleteInSession({
            session,
            factorId,
            userContext: userContext !== null && userContext !== void 0 ? userContext : {},
        });
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
Wrapper.MultiFactorAuthClaim = multiFactorAuthClaim_1.MultiFactorAuthClaim;
exports.init = Wrapper.init;
exports.markFactorAsCompleteInSession = Wrapper.markFactorAsCompleteInSession;
