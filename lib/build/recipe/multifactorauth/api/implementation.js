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
            var _a, _b, _c;
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
                throw new Error("Tenant not found");
            }
            const factorsAlreadySetup = await options.recipeImplementation.getFactorsSetupForUser({
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
                factorsSetUpForUser: factorsAlreadySetup,
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
            const factorsAllowedToSetup = [];
            for (const id of availableFactors) {
                try {
                    await options.recipeImplementation.assertAllowedToSetupFactorElseThrowInvalidClaimError({
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
                        factorsSetUpForUser: factorsAlreadySetup,
                        mfaRequirementsForAuth,
                        userContext,
                    });
                    factorsAllowedToSetup.push(id);
                } catch (err) {
                    // ignore
                }
            }
            const nextSetOfUnsatisfiedFactors = multiFactorAuthClaim_1.MultiFactorAuthClaim.getNextSetOfUnsatisfiedFactors(
                completedFactors,
                mfaRequirementsForAuth
            );
            await session.setClaimValue(
                multiFactorAuthClaim_1.MultiFactorAuthClaim,
                {
                    c: completedFactors,
                    v: multiFactorAuthClaim_1.MultiFactorAuthClaim.isRequirementListSatisfied(
                        completedFactors,
                        mfaRequirementsForAuth
                    ),
                },
                userContext
            );
            let getEmailsForFactorsResult = options.recipeInstance.getEmailsForFactors(user, session.getRecipeUserId());
            let getPhoneNumbersForFactorsResult = options.recipeInstance.getPhoneNumbersForFactors(
                user,
                session.getRecipeUserId()
            );
            if (
                getEmailsForFactorsResult.status === "UNKNOWN_SESSION_RECIPE_USER_ID" ||
                getPhoneNumbersForFactorsResult.status === "UNKNOWN_SESSION_RECIPE_USER_ID"
            ) {
                throw new error_1.default({
                    type: "UNAUTHORISED",
                    message: "User no longer associated with the session",
                    payload: {
                        clearTokens: true,
                    },
                });
            }
            return {
                status: "OK",
                factors: {
                    next: nextSetOfUnsatisfiedFactors.factorIds.filter(
                        (factorId) => factorsAllowedToSetup.includes(factorId) || factorsAlreadySetup.includes(factorId)
                    ),
                    alreadySetup: factorsAlreadySetup,
                    allowedToSetup: factorsAllowedToSetup,
                },
                emails: getEmailsForFactorsResult.factorIdToEmailsMap,
                phoneNumbers: getPhoneNumbersForFactorsResult.factorIdToPhoneNumberMap,
            };
        },
    };
}
exports.default = getAPIInterface;
