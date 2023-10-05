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
exports.MultiFactorAuthClaim = exports.completeFactorInSession = exports.enableFactorForUser = exports.enableFactorForTenant = exports.init = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const multiFactorAuthClaim_1 = require("./multiFactorAuthClaim");
Object.defineProperty(exports, "MultiFactorAuthClaim", {
    enumerable: true,
    get: function () {
        return multiFactorAuthClaim_1.MultiFactorAuthClaim;
    },
});
class Wrapper {
    static async enableFactorForUser(tenantId, userId, factorId, userContext) {
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        return recipeInstance.recipeInterfaceImpl.enableFactorForUser({
            userId,
            factorId,
            tenantId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static async enableFactorForTenant(tenantId, factorId, userContext) {
        const recipeInstance = recipe_1.default.getInstanceOrThrowError();
        return recipeInstance.recipeInterfaceImpl.enableFactorForTenant({
            tenantId,
            factorId,
            userContext: userContext === undefined ? {} : userContext,
        });
    }
    static async completeFactorInSession(session, factor, userContext) {
        return recipe_1.default.getInstanceOrThrowError().completeFactorInSession({
            session,
            factor,
            userContext: userContext !== null && userContext !== void 0 ? userContext : {},
        });
    }
}
exports.default = Wrapper;
Wrapper.init = recipe_1.default.init;
Wrapper.MultiFactorAuthClaim = multiFactorAuthClaim_1.MultiFactorAuthClaim;
exports.init = Wrapper.init;
exports.enableFactorForTenant = Wrapper.enableFactorForTenant;
exports.enableFactorForUser = Wrapper.enableFactorForUser;
exports.completeFactorInSession = Wrapper.completeFactorInSession;
