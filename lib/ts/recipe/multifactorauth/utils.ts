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

import {
    TypeInput,
    TypeNormalisedInput,
    RecipeInterface,
    APIInterface,
    MFAClaimValue,
    MFARequirementList,
} from "./types";
import MultiFactorAuthRecipe from "./recipe";
import Multitenancy from "../multitenancy";
import { UserContext } from "../../types";
import { SessionContainerInterface } from "../session/types";
import { RecipeUserId, User, getUser } from "../..";
import Recipe from "./recipe";
import { MultiFactorAuthClaim } from "./multiFactorAuthClaim";
import { TenantConfig } from "../multitenancy/types";
import Session from "../session";
import SessionError from "../session/error";
import { FactorIds } from "./types";
import { logDebugMessage } from "../../logger";

export function validateAndNormaliseUserInput(config?: TypeInput): TypeNormalisedInput {
    if (config?.firstFactors !== undefined && config?.firstFactors.length === 0) {
        throw new Error("'firstFactors' can be either undefined or a non-empty array");
    }

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config?.override,
    };

    return {
        firstFactors: config?.firstFactors,
        override,
    };
}

export const isValidFirstFactor = async function (
    tenantId: string,
    factorId: string,
    userContext: UserContext
): Promise<
    | {
          status: "OK";
      }
    | {
          status: "INVALID_FIRST_FACTOR_ERROR";
      }
    | {
          status: "TENANT_NOT_FOUND_ERROR";
      }
> {
    const tenantInfo = await Multitenancy.getTenant(tenantId, userContext);
    if (tenantInfo === undefined) {
        return {
            status: "TENANT_NOT_FOUND_ERROR",
        };
    }
    const { status: _, ...tenantConfig } = tenantInfo;

    // we prioritise the firstFactors configured in tenant. If not present, we fallback to the recipe config
    // Core already validates that the firstFactors are valid as per the logn methods enabled for that tenant,
    // so we don't need to do additional checks here

    const firstFactorsFromMFA = MultiFactorAuthRecipe.getInstance()?.config.firstFactors;

    logDebugMessage(`isValidFirstFactor got ${tenantConfig.firstFactors?.join(", ")} from tenant config`);
    logDebugMessage(`isValidFirstFactor got ${firstFactorsFromMFA} from tenant config`);

    let validFirstFactors = tenantConfig.firstFactors !== undefined ? tenantConfig.firstFactors : firstFactorsFromMFA;

    if (validFirstFactors === undefined) {
        // if validFirstFactors is undefined, we can safely assume it to be true because we would then
        // have other points of failure:
        // - if login method is disabled in core for the tenant
        // - if appropriate recipe is not initialized, will result in a 404
        // In all other cases, we just want to allow all available login methods to be used as first factor

        return {
            status: "OK",
        };
    }

    if (validFirstFactors.includes(factorId)) {
        return {
            status: "OK",
        };
    }

    return {
        status: "INVALID_FIRST_FACTOR_ERROR",
    };
};

// This function is to reuse a piece of code that is needed in multiple places
export const getMFARelatedInfoFromSession = async function (
    input: (
        | {
              sessionRecipeUserId: RecipeUserId;
              tenantId: string;
              accessTokenPayload: any;
          }
        | {
              session: SessionContainerInterface;
          }
    ) & {
        userContext: UserContext;
    }
): Promise<{
    sessionUser: User;
    factorsSetUpForUser: string[];
    completedFactors: MFAClaimValue["c"];
    requiredSecondaryFactorsForUser: string[];
    requiredSecondaryFactorsForTenant: string[];
    mfaRequirementsForAuth: MFARequirementList;
    tenantConfig: TenantConfig;
    isMFARequirementsForAuthSatisfied: boolean;
}> {
    let sessionRecipeUserId: RecipeUserId;
    let tenantId: string;
    let accessTokenPayload: any;
    let sessionHandle: string;

    if ("session" in input) {
        sessionRecipeUserId = input.session.getRecipeUserId();
        tenantId = input.session.getTenantId();
        accessTokenPayload = input.session.getAccessTokenPayload();
        sessionHandle = input.session.getHandle(input.userContext);
    } else {
        sessionRecipeUserId = input.sessionRecipeUserId;
        tenantId = input.tenantId;
        accessTokenPayload = input.accessTokenPayload;
        sessionHandle = accessTokenPayload.sessionhandle;
    }

    const sessionUser = await getUser(sessionRecipeUserId.getAsString(), input.userContext);
    if (sessionUser === undefined) {
        throw new SessionError({
            type: SessionError.UNAUTHORISED,
            message: "Session user not found",
        });
    }

    const factorsSetUpForUser = await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getFactorsSetupForUser({
        user: sessionUser,
        userContext: input.userContext,
    });

    let mfaClaimValue = MultiFactorAuthClaim.getValueFromPayload(accessTokenPayload);

    if (mfaClaimValue === undefined) {
        // This can happen with older session, because we did not add MFA claims previously.
        // We try to determine best possible factorId based on the session's recipe user id.

        const sessionInfo = await Session.getSessionInformation(sessionHandle);

        if (sessionInfo === undefined) {
            throw new SessionError({
                type: SessionError.UNAUTHORISED,
                message: "Session not found",
            });
        }

        const firstFactorTime = sessionInfo.timeCreated;
        let computedFirstFactorIdForSession: string | undefined = undefined;
        for (const lM of sessionUser.loginMethods) {
            if (lM.recipeUserId.getAsString() === sessionRecipeUserId.getAsString()) {
                if (lM.recipeId === "emailpassword") {
                    let validRes = await isValidFirstFactor(tenantId, FactorIds.EMAILPASSWORD, input.userContext);
                    if (validRes.status === "TENANT_NOT_FOUND_ERROR") {
                        throw new SessionError({
                            type: SessionError.UNAUTHORISED,
                            message: "Tenant not found",
                        });
                    } else if (validRes.status === "OK") {
                        computedFirstFactorIdForSession = FactorIds.EMAILPASSWORD;
                        break;
                    }
                } else if (lM.recipeId === "thirdparty") {
                    let validRes = await isValidFirstFactor(tenantId, FactorIds.THIRDPARTY, input.userContext);
                    if (validRes.status === "TENANT_NOT_FOUND_ERROR") {
                        throw new SessionError({
                            type: SessionError.UNAUTHORISED,
                            message: "Tenant not found",
                        });
                    } else if (validRes.status === "OK") {
                        computedFirstFactorIdForSession = FactorIds.THIRDPARTY;
                        break;
                    }
                } else {
                    let factorsToCheck: string[] = [];
                    if (lM.email !== undefined) {
                        factorsToCheck.push(FactorIds.LINK_EMAIL);
                        factorsToCheck.push(FactorIds.OTP_EMAIL);
                    }
                    if (lM.phoneNumber !== undefined) {
                        factorsToCheck.push(FactorIds.LINK_PHONE);
                        factorsToCheck.push(FactorIds.OTP_PHONE);
                    }

                    for (const factorId of factorsToCheck) {
                        let validRes = await isValidFirstFactor(tenantId, factorId, input.userContext);
                        if (validRes.status === "TENANT_NOT_FOUND_ERROR") {
                            throw new SessionError({
                                type: SessionError.UNAUTHORISED,
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
            throw new SessionError({
                type: SessionError.UNAUTHORISED,
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

    const requiredSecondaryFactorsForUser = await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getRequiredSecondaryFactorsForUser(
        {
            userId: sessionUser.id,
            userContext: input.userContext,
        }
    );

    const tenantInfo = await Multitenancy.getTenant(tenantId, input.userContext);

    if (tenantInfo === undefined) {
        throw new SessionError({
            type: SessionError.UNAUTHORISED,
            message: "Tenant not found",
        });
    }

    const { status: _, ...tenantConfig } = tenantInfo;

    const requiredSecondaryFactorsForTenant: string[] = tenantInfo.requiredSecondaryFactors ?? [];
    const mfaRequirementsForAuth = await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getMFARequirementsForAuth(
        {
            user: sessionUser,
            accessTokenPayload,
            tenantId,
            factorsSetUpForUser,
            requiredSecondaryFactorsForUser,
            requiredSecondaryFactorsForTenant,
            completedFactors,
            userContext: input.userContext,
        }
    );

    mfaClaimValue.v =
        MultiFactorAuthClaim.getNextSetOfUnsatisfiedFactors(completedFactors, mfaRequirementsForAuth).factorIds
            .length === 0;

    if ("session" in input) {
        await input.session.setClaimValue(MultiFactorAuthClaim, mfaClaimValue, input.userContext);
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
