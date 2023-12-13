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
exports.MultiFactorAuthClaim = exports.addToDefaultRequiredFactorsForUser = exports.markFactorAsCompleteInSession = exports.isAllowedToSetupFactor = exports.getFactorsSetupForUser = exports.init = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const multiFactorAuthClaim_1 = require("./multiFactorAuthClaim");
Object.defineProperty(exports, "MultiFactorAuthClaim", {
    enumerable: true,
    get: function () {
        return multiFactorAuthClaim_1.MultiFactorAuthClaim;
    },
});
const multitenancy_1 = __importDefault(require("../multitenancy"));
const __1 = require("../..");
const recipe_2 = __importDefault(require("../usermetadata/recipe"));
class Wrapper {
    static async getFactorsSetupForUser(tenantId, userId, userContext) {
        const ctx = userContext !== null && userContext !== void 0 ? userContext : {};
        const user = await __1.getUser(userId, ctx);
        if (!user) {
            throw new Error("UKNKNOWN_USER_ID");
        }
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getFactorsSetupForUser({
            tenantId,
            user,
            userContext: ctx,
        });
    }
    static async isAllowedToSetupFactor(session, factorId, userContext) {
        var _a, _b;
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
        const defaultMFARequirementsForUser = await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getDefaultRequiredFactorsForUser({
                user,
                tenantId: session.getTenantId(),
                userContext: ctx,
            });
        const tenantInfo = await multitenancy_1.default.getTenant(session.getTenantId(), userContext);
        const defaultMFARequirementsForTenant =
            (_b = tenantInfo === null || tenantInfo === void 0 ? void 0 : tenantInfo.defaultRequiredFactorIds) !==
                null && _b !== void 0
                ? _b
                : [];
        const requirements = await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getMFARequirementsForAuth({
                user,
                accessTokenPayload: session.getAccessTokenPayload(),
                tenantId: session.getTenantId(),
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
            userContext: userContext !== null && userContext !== void 0 ? userContext : {},
        });
    }
    static async markFactorAsCompleteInSession(session, factorId, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.markFactorAsCompleteInSession({
            session,
            factorId,
            userContext: userContext !== null && userContext !== void 0 ? userContext : {},
        });
    }
    static async addToDefaultRequiredFactorsForUser(userId, factorId, userContext) {
        var _a, _b;
        const ctx = userContext !== null && userContext !== void 0 ? userContext : {};
        const userMetadataInstance = recipe_2.default.getInstanceOrThrowError();
        const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadata({
            userId,
            userContext: ctx,
        });
        const factorIds =
            (_b =
                (_a = metadata.metadata._supertokens) === null || _a === void 0
                    ? void 0
                    : _a.defaultRequiredFactorIdsForUser) !== null && _b !== void 0
                ? _b
                : [];
        if (factorIds.includes(factorId)) {
            return;
        }
        factorIds.push(factorId);
        const metadataUpdate = Object.assign(Object.assign({}, metadata.metadata), {
            _supertokens: Object.assign(Object.assign({}, metadata.metadata._supertokens), {
                defaultRequiredFactorIdsForUser: factorIds,
            }),
        });
        await userMetadataInstance.recipeInterfaceImpl.updateUserMetadataInternal({
            userId: userId,
            metadataUpdate,
            userContext: ctx,
        });
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
Wrapper.MultiFactorAuthClaim = multiFactorAuthClaim_1.MultiFactorAuthClaim;
exports.init = Wrapper.init;
exports.getFactorsSetupForUser = Wrapper.getFactorsSetupForUser;
exports.isAllowedToSetupFactor = Wrapper.isAllowedToSetupFactor;
exports.markFactorAsCompleteInSession = Wrapper.markFactorAsCompleteInSession;
exports.addToDefaultRequiredFactorsForUser = Wrapper.addToDefaultRequiredFactorsForUser;
