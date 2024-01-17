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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiFactorAuthClaim = exports.FactorIds = exports.removeFromRequiredSecondaryFactorsForUser = exports.addToRequiredSecondaryFactorsForUser = exports.getRequiredSecondaryFactorsForUser = exports.getFactorsSetupForUser = exports.markFactorAsCompleteInSession = exports.assertAllowedToSetupFactorElseThrowInvalidClaimError = exports.init = void 0;
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
const utils_1 = require("../../utils");
class Wrapper {
    static async assertAllowedToSetupFactorElseThrowInvalidClaimError(session, factorId, userContext) {
        var _a, _b;
        let ctx = utils_1.getUserContext(userContext);
        const user = await __1.getUser(session.getUserId(), ctx);
        if (!user) {
            throw new Error("Session user not found");
        }
        const factorsSetup = await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getFactorsSetupForUser({
                user,
                userContext: ctx,
            });
        const mfaClaimValue = await session.getClaimValue(multiFactorAuthClaim_1.MultiFactorAuthClaim, ctx);
        // if MFA claim or c is missing, we can assume that no factors are completed
        // this can happen when an old session is migrated with MFA claim and we don't know what was the first factor
        // it is okay to assume no factors are completed at this stage because the MFA requirements are generally about
        // the second factors. In the worst case, the user will be asked to do the factor again, which should be okay.
        const completedFactors =
            (_a = mfaClaimValue === null || mfaClaimValue === void 0 ? void 0 : mfaClaimValue.c) !== null &&
            _a !== void 0
                ? _a
                : {};
        const defaultMFARequirementsForUser = await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getRequiredSecondaryFactorsForUser({
                userId: session.getUserId(),
                userContext: ctx,
            });
        const tenantInfo = await multitenancy_1.default.getTenant(session.getTenantId(), userContext);
        if (tenantInfo === undefined) {
            throw new Error("Tenant not found");
        }
        const defaultMFARequirementsForTenant =
            (_b = tenantInfo.requiredSecondaryFactors) !== null && _b !== void 0 ? _b : [];
        const requirements = await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getMFARequirementsForAuth({
                user,
                accessTokenPayload: session.getAccessTokenPayload(),
                tenantId: session.getTenantId(),
                factorsSetUpForUser: factorsSetup,
                requiredSecondaryFactorsForUser: defaultMFARequirementsForUser,
                requiredSecondaryFactorsForTenant: defaultMFARequirementsForTenant,
                completedFactors,
                userContext: ctx,
            });
        await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.assertAllowedToSetupFactorElseThrowInvalidClaimError({
                session,
                factorId,
                completedFactors,
                mfaRequirementsForAuth: requirements,
                factorsSetUpForUser: factorsSetup,
                requiredSecondaryFactorsForUser: defaultMFARequirementsForUser,
                requiredSecondaryFactorsForTenant: defaultMFARequirementsForTenant,
                userContext: ctx,
            });
    }
    static async getMFARequirementsForAuth(session, userContext) {
        var _a, _b;
        let ctx = utils_1.getUserContext(userContext);
        const user = await __1.getUser(session.getUserId(), ctx);
        if (!user) {
            throw new Error("Session user not found");
        }
        const factorsSetup = await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.getFactorsSetupForUser({
                user,
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
            .recipeInterfaceImpl.getRequiredSecondaryFactorsForUser({
                userId: session.getUserId(),
                userContext: ctx,
            });
        const tenantInfo = await multitenancy_1.default.getTenant(session.getTenantId(), userContext);
        if (tenantInfo === undefined) {
            throw new Error("Tenant not found");
        }
        const defaultMFARequirementsForTenant =
            (_b = tenantInfo.requiredSecondaryFactors) !== null && _b !== void 0 ? _b : [];
        return await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getMFARequirementsForAuth({
            user,
            accessTokenPayload: session.getAccessTokenPayload(),
            tenantId: session.getTenantId(),
            factorsSetUpForUser: factorsSetup,
            requiredSecondaryFactorsForUser: defaultMFARequirementsForUser,
            requiredSecondaryFactorsForTenant: defaultMFARequirementsForTenant,
            completedFactors,
            userContext: ctx,
        });
    }
    static async markFactorAsCompleteInSession(session, factorId, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.markFactorAsCompleteInSession({
            session,
            factorId,
            userContext: utils_1.getUserContext(userContext),
        });
    }
    static async getFactorsSetupForUser(userId, userContext) {
        const ctx = utils_1.getUserContext(userContext);
        const user = await __1.getUser(userId, ctx);
        if (!user) {
            throw new Error("Unknown user id");
        }
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getFactorsSetupForUser({
            user,
            userContext: ctx,
        });
    }
    static async getRequiredSecondaryFactorsForUser(userId, userContext) {
        return recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getRequiredSecondaryFactorsForUser({
            userId,
            userContext: utils_1.getUserContext(userContext),
        });
    }
    static async addToRequiredSecondaryFactorsForUser(userId, factorId, userContext) {
        await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.addToRequiredSecondaryFactorsForUser({
            userId,
            factorId,
            userContext: utils_1.getUserContext(userContext),
        });
    }
    static async removeFromRequiredSecondaryFactorsForUser(userId, factorId, userContext) {
        await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.removeFromRequiredSecondaryFactorsForUser({
            userId,
            factorId,
            userContext: utils_1.getUserContext(userContext),
        });
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
Wrapper.MultiFactorAuthClaim = multiFactorAuthClaim_1.MultiFactorAuthClaim;
exports.init = Wrapper.init;
exports.assertAllowedToSetupFactorElseThrowInvalidClaimError =
    Wrapper.assertAllowedToSetupFactorElseThrowInvalidClaimError;
exports.markFactorAsCompleteInSession = Wrapper.markFactorAsCompleteInSession;
exports.getFactorsSetupForUser = Wrapper.getFactorsSetupForUser;
exports.getRequiredSecondaryFactorsForUser = Wrapper.getRequiredSecondaryFactorsForUser;
exports.addToRequiredSecondaryFactorsForUser = Wrapper.addToRequiredSecondaryFactorsForUser;
exports.removeFromRequiredSecondaryFactorsForUser = Wrapper.removeFromRequiredSecondaryFactorsForUser;
exports.FactorIds = {
    EMAILPASSWORD: "emailpassword",
    OTP_EMAIL: "otp-email",
    OTP_PHONE: "otp-phone",
    LINK_EMAIL: "link-email",
    LINK_PHONE: "link-phone",
    THIRDPARTY: "thirdparty",
    TOTP: "totp",
};
