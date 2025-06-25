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
exports.FactorIds =
    exports.MultiFactorAuthClaim =
    exports.removeFromRequiredSecondaryFactorsForUser =
    exports.addToRequiredSecondaryFactorsForUser =
    exports.getMFARequirementsForAuth =
    exports.getRequiredSecondaryFactorsForUser =
    exports.getFactorsSetupForUser =
    exports.markFactorAsCompleteInSession =
    exports.assertAllowedToSetupFactorElseThrowInvalidClaimError =
    exports.init =
        void 0;
const recipe_1 = __importDefault(require("./recipe"));
const multiFactorAuthClaim_1 = require("./multiFactorAuthClaim");
Object.defineProperty(exports, "MultiFactorAuthClaim", {
    enumerable: true,
    get: function () {
        return multiFactorAuthClaim_1.MultiFactorAuthClaim;
    },
});
const __1 = require("../..");
const utils_1 = require("../../utils");
const utils_2 = require("./utils");
const types_1 = require("./types");
Object.defineProperty(exports, "FactorIds", {
    enumerable: true,
    get: function () {
        return types_1.FactorIds;
    },
});
class Wrapper {
    static async assertAllowedToSetupFactorElseThrowInvalidClaimError(session, factorId, userContext) {
        let ctx = (0, utils_1.getUserContext)(userContext);
        const mfaInfo = await (0, utils_2.updateAndGetMFARelatedInfoInSession)({
            session,
            userContext: ctx,
        });
        const factorsSetUpForUser = await Wrapper.getFactorsSetupForUser(session.getUserId(), ctx);
        await recipe_1.default
            .getInstanceOrThrowError()
            .recipeInterfaceImpl.assertAllowedToSetupFactorElseThrowInvalidClaimError({
                session,
                factorId,
                get factorsSetUpForUser() {
                    return Promise.resolve(factorsSetUpForUser);
                },
                get mfaRequirementsForAuth() {
                    return Promise.resolve(mfaInfo.mfaRequirementsForAuth);
                },
                userContext: ctx,
            });
    }
    static async getMFARequirementsForAuth(session, userContext) {
        let ctx = (0, utils_1.getUserContext)(userContext);
        const mfaInfo = await (0, utils_2.updateAndGetMFARelatedInfoInSession)({
            session,
            userContext: ctx,
        });
        return mfaInfo.mfaRequirementsForAuth;
    }
    static async markFactorAsCompleteInSession(session, factorId, userContext) {
        await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.markFactorAsCompleteInSession({
            session,
            factorId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async getFactorsSetupForUser(userId, userContext) {
        const ctx = (0, utils_1.getUserContext)(userContext);
        const user = await (0, __1.getUser)(userId, ctx);
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
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async addToRequiredSecondaryFactorsForUser(userId, factorId, userContext) {
        await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.addToRequiredSecondaryFactorsForUser({
            userId,
            factorId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
    static async removeFromRequiredSecondaryFactorsForUser(userId, factorId, userContext) {
        await recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.removeFromRequiredSecondaryFactorsForUser({
            userId,
            factorId,
            userContext: (0, utils_1.getUserContext)(userContext),
        });
    }
}
Wrapper.init = recipe_1.default.init;
Wrapper.MultiFactorAuthClaim = multiFactorAuthClaim_1.MultiFactorAuthClaim;
Wrapper.FactorIds = types_1.FactorIds;
exports.default = Wrapper;
exports.init = Wrapper.init;
exports.assertAllowedToSetupFactorElseThrowInvalidClaimError =
    Wrapper.assertAllowedToSetupFactorElseThrowInvalidClaimError;
exports.markFactorAsCompleteInSession = Wrapper.markFactorAsCompleteInSession;
exports.getFactorsSetupForUser = Wrapper.getFactorsSetupForUser;
exports.getRequiredSecondaryFactorsForUser = Wrapper.getRequiredSecondaryFactorsForUser;
exports.getMFARequirementsForAuth = Wrapper.getMFARequirementsForAuth;
exports.addToRequiredSecondaryFactorsForUser = Wrapper.addToRequiredSecondaryFactorsForUser;
exports.removeFromRequiredSecondaryFactorsForUser = Wrapper.removeFromRequiredSecondaryFactorsForUser;
