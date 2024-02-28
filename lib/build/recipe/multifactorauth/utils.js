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
exports.getMFARelatedInfoFromSession = exports.validateAndNormaliseUserInput = void 0;
const multitenancy_1 = __importDefault(require("../multitenancy"));
const __1 = require("../..");
const recipe_1 = __importDefault(require("./recipe"));
const multiFactorAuthClaim_1 = require("./multiFactorAuthClaim");
const session_1 = __importDefault(require("../session"));
const error_1 = __importDefault(require("../session/error"));
const types_1 = require("./types");
const utils_1 = require("../multitenancy/utils");
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
// This function is to reuse a piece of code that is needed in multiple places
const getMFARelatedInfoFromSession = async function (input) {
    var _a;
    let sessionRecipeUserId;
    let tenantId;
    let accessTokenPayload;
    let sessionHandle;
    if ("session" in input) {
        sessionRecipeUserId = input.session.getRecipeUserId(input.userContext);
        tenantId = input.session.getTenantId(input.userContext);
        accessTokenPayload = input.session.getAccessTokenPayload(input.userContext);
        sessionHandle = input.session.getHandle(input.userContext);
    } else {
        sessionRecipeUserId = input.sessionRecipeUserId;
        tenantId = input.tenantId;
        accessTokenPayload = input.accessTokenPayload;
        sessionHandle = accessTokenPayload.sessionHandle;
    }
    const sessionUser = await __1.getUser(sessionRecipeUserId.getAsString(), input.userContext);
    if (sessionUser === undefined) {
        throw new error_1.default({
            type: error_1.default.UNAUTHORISED,
            message: "Session user not found",
        });
    }
    const factorsSetUpForUser = await recipe_1.default
        .getInstanceOrThrowError()
        .recipeInterfaceImpl.getFactorsSetupForUser({
            user: sessionUser,
            userContext: input.userContext,
        });
    let mfaClaimValue = multiFactorAuthClaim_1.MultiFactorAuthClaim.getValueFromPayload(accessTokenPayload);
    if (mfaClaimValue === undefined) {
        // This can happen with older session, because we did not add MFA claims previously.
        // We try to determine best possible factorId based on the session's recipe user id.
        const sessionInfo = await session_1.default.getSessionInformation(sessionHandle);
        if (sessionInfo === undefined) {
            throw new error_1.default({
                type: error_1.default.UNAUTHORISED,
                message: "Session not found",
            });
        }
        const firstFactorTime = sessionInfo.timeCreated;
        let computedFirstFactorIdForSession = undefined;
        for (const lM of sessionUser.loginMethods) {
            if (lM.recipeUserId.getAsString() === sessionRecipeUserId.getAsString()) {
                if (lM.recipeId === "emailpassword") {
                    let validRes = await utils_1.isValidFirstFactor(
                        tenantId,
                        types_1.FactorIds.EMAILPASSWORD,
                        input.userContext
                    );
                    if (validRes.status === "TENANT_NOT_FOUND_ERROR") {
                        throw new error_1.default({
                            type: error_1.default.UNAUTHORISED,
                            message: "Tenant not found",
                        });
                    } else if (validRes.status === "OK") {
                        computedFirstFactorIdForSession = types_1.FactorIds.EMAILPASSWORD;
                        break;
                    }
                } else if (lM.recipeId === "thirdparty") {
                    let validRes = await utils_1.isValidFirstFactor(
                        tenantId,
                        types_1.FactorIds.THIRDPARTY,
                        input.userContext
                    );
                    if (validRes.status === "TENANT_NOT_FOUND_ERROR") {
                        throw new error_1.default({
                            type: error_1.default.UNAUTHORISED,
                            message: "Tenant not found",
                        });
                    } else if (validRes.status === "OK") {
                        computedFirstFactorIdForSession = types_1.FactorIds.THIRDPARTY;
                        break;
                    }
                } else {
                    let factorsToCheck = [];
                    if (lM.email !== undefined) {
                        factorsToCheck.push(types_1.FactorIds.LINK_EMAIL);
                        factorsToCheck.push(types_1.FactorIds.OTP_EMAIL);
                    }
                    if (lM.phoneNumber !== undefined) {
                        factorsToCheck.push(types_1.FactorIds.LINK_PHONE);
                        factorsToCheck.push(types_1.FactorIds.OTP_PHONE);
                    }
                    for (const factorId of factorsToCheck) {
                        let validRes = await utils_1.isValidFirstFactor(tenantId, factorId, input.userContext);
                        if (validRes.status === "TENANT_NOT_FOUND_ERROR") {
                            throw new error_1.default({
                                type: error_1.default.UNAUTHORISED,
                                message: "Tenant not found",
                            });
                        } else if (validRes.status === "OK") {
                            computedFirstFactorIdForSession = factorId;
                            break;
                        }
                    }
                    if (computedFirstFactorIdForSession !== undefined) {
                        break;
                    }
                }
            }
        }
        if (computedFirstFactorIdForSession === undefined) {
            throw new error_1.default({
                type: error_1.default.UNAUTHORISED,
                message: "Incorrect login method used",
            });
        }
        mfaClaimValue = {
            c: {
                [computedFirstFactorIdForSession]: firstFactorTime,
            },
            v: true, // updated later in this function
        };
    }
    const completedFactors = mfaClaimValue.c;
    const requiredSecondaryFactorsForUser = await recipe_1.default
        .getInstanceOrThrowError()
        .recipeInterfaceImpl.getRequiredSecondaryFactorsForUser({
            userId: sessionUser.id,
            userContext: input.userContext,
        });
    const tenantInfo = await multitenancy_1.default.getTenant(tenantId, input.userContext);
    if (tenantInfo === undefined) {
        throw new error_1.default({
            type: error_1.default.UNAUTHORISED,
            message: "Tenant not found",
        });
    }
    const { status: _ } = tenantInfo,
        tenantConfig = __rest(tenantInfo, ["status"]);
    const requiredSecondaryFactorsForTenant =
        (_a = tenantInfo.requiredSecondaryFactors) !== null && _a !== void 0 ? _a : [];
    const mfaRequirementsForAuth = await recipe_1.default
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
    mfaClaimValue.v =
        multiFactorAuthClaim_1.MultiFactorAuthClaim.getNextSetOfUnsatisfiedFactors(
            completedFactors,
            mfaRequirementsForAuth
        ).factorIds.length === 0;
    if ("session" in input) {
        await input.session.setClaimValue(
            multiFactorAuthClaim_1.MultiFactorAuthClaim,
            mfaClaimValue,
            input.userContext
        );
    }
    return {
        sessionUser,
        factorsSetUpForUser,
        completedFactors,
        requiredSecondaryFactorsForUser,
        requiredSecondaryFactorsForTenant,
        mfaRequirementsForAuth,
        tenantConfig,
        isMFARequirementsForAuthSatisfied: mfaClaimValue.v,
    };
};
exports.getMFARelatedInfoFromSession = getMFARelatedInfoFromSession;
