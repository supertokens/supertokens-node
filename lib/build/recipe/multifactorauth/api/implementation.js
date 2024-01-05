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
const multitenancy_1 = __importDefault(require("../../multitenancy"));
const multiFactorAuthClaim_1 = require("../multiFactorAuthClaim");
const __1 = require("../../..");
const error_1 = __importDefault(require("../../session/error"));
function getAPIInterface() {
    return {
        resyncSessionAndFetchMFAInfoPUT: async ({ options, session, userContext }) => {
            var _a, _b, _c, _d, _e;
            const userId = session.getUserId();
            const tenantId = session.getTenantId();
            const user = await __1.getUser(userId, userContext);
            if (user === undefined) {
                throw new error_1.default({
                    type: error_1.default.UNAUTHORISED,
                    message: "Session user not found",
                });
            }
            const tenantInfo = await multitenancy_1.default.getTenant(tenantId, userContext);
            if (tenantInfo === undefined) {
                throw new error_1.default({
                    type: error_1.default.UNAUTHORISED,
                    message: "Tenant not found",
                });
            }
            const isAlreadySetup = await options.recipeImplementation.getFactorsSetupForUser({
                user,
                userContext,
            });
            const { status: _ } = tenantInfo,
                tenantConfig = __rest(tenantInfo, ["status"]);
            const availableFactors = await options.recipeInstance.getAllAvailableFactorIds(tenantConfig);
            // session is active and a new user is going to be created, so we need to check if the factor setup is allowed
            const requiredSecondaryFactorsForUser = await options.recipeImplementation.getRequiredSecondaryFactorsForUser(
                {
                    userId,
                    userContext,
                }
            );
            const completedFactorsClaimValue = await session.getClaimValue(
                multiFactorAuthClaim_1.MultiFactorAuthClaim,
                userContext
            );
            const completedFactors =
                (_a =
                    completedFactorsClaimValue === null || completedFactorsClaimValue === void 0
                        ? void 0
                        : completedFactorsClaimValue.c) !== null && _a !== void 0
                    ? _a
                    : {};
            const mfaRequirementsForAuth = await options.recipeImplementation.getMFARequirementsForAuth({
                user: user,
                accessTokenPayload: session.getAccessTokenPayload(),
                tenantId,
                factorsSetUpForUser: isAlreadySetup,
                requiredSecondaryFactorsForTenant:
                    (_b =
                        tenantInfo === null || tenantInfo === void 0 ? void 0 : tenantInfo.requiredSecondaryFactors) !==
                        null && _b !== void 0
                        ? _b
                        : [],
                requiredSecondaryFactorsForUser,
                completedFactors: completedFactors,
                userContext,
            });
            const isAllowedToSetup = [];
            for (const id of availableFactors) {
                if (
                    await options.recipeImplementation.isAllowedToSetupFactor({
                        session,
                        factorId: id,
                        completedFactors: completedFactors,
                        requiredSecondaryFactorsForTenant:
                            (_c =
                                tenantInfo === null || tenantInfo === void 0
                                    ? void 0
                                    : tenantInfo.requiredSecondaryFactors) !== null && _c !== void 0
                                ? _c
                                : [],
                        requiredSecondaryFactorsForUser,
                        factorsSetUpForUser: isAlreadySetup,
                        mfaRequirementsForAuth,
                        userContext,
                    })
                ) {
                    isAllowedToSetup.push(id);
                }
            }
            const c =
                (_e =
                    (_d = await session.getClaimValue(multiFactorAuthClaim_1.MultiFactorAuthClaim, userContext)) ===
                        null || _d === void 0
                        ? void 0
                        : _d.c) !== null && _e !== void 0
                    ? _e
                    : {};
            const nextSetOfUnsatisfiedFactors = multiFactorAuthClaim_1.MultiFactorAuthClaim.getNextSetOfUnsatisfiedFactors(
                c,
                mfaRequirementsForAuth
            );
            await session.fetchAndSetClaim(multiFactorAuthClaim_1.MultiFactorAuthClaim, userContext);
            return {
                status: "OK",
                factors: {
                    next: nextSetOfUnsatisfiedFactors.filter(
                        (factorId) => isAllowedToSetup.includes(factorId) || isAlreadySetup.includes(factorId)
                    ),
                    isAlreadySetup,
                    isAllowedToSetup,
                },
                emails: options.recipeInstance.getEmailsForFactors(user, session.getRecipeUserId()),
                phoneNumbers: options.recipeInstance.getPhoneNumbersForFactors(user, session.getRecipeUserId()),
            };
        },
    };
}
exports.default = getAPIInterface;
