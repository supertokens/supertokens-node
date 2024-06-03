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
import Multitenancy from "../multitenancy";
import { User, UserContext } from "../../types";
import { SessionContainerInterface } from "../session/types";
import { RecipeUserId, getUser } from "../..";
import Recipe from "./recipe";
import { MultiFactorAuthClaim } from "./multiFactorAuthClaim";
import Session from "../session";
import SessionError from "../session/error";
import { FactorIds } from "./types";
import { isValidFirstFactor } from "../multitenancy/utils";

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

// This function is to reuse a piece of code that is needed in multiple places
export const updateAndGetMFARelatedInfoInSession = async function (
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
        updatedFactorId?: string;
        userContext: UserContext;
    }
): Promise<{
    completedFactors: MFAClaimValue["c"];
    mfaRequirementsForAuth: MFARequirementList;
    isMFARequirementsForAuthSatisfied: boolean;
}> {
    let sessionRecipeUserId: RecipeUserId;
    let tenantId: string;
    let accessTokenPayload: any;
    let sessionHandle: string;

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

    let updatedClaimVal = false;
    let mfaClaimValue = MultiFactorAuthClaim.getValueFromPayload(accessTokenPayload);

    if (input.updatedFactorId) {
        if (mfaClaimValue === undefined) {
            updatedClaimVal = true;
            mfaClaimValue = {
                c: {
                    [input.updatedFactorId]: Math.floor(Date.now() / 1000),
                },
                v: true, // updated later in the function
            };
        } else {
            updatedClaimVal = true;
            mfaClaimValue.c[input.updatedFactorId] = Math.floor(Date.now() / 1000);
        }
    }

    if (mfaClaimValue === undefined) {
        // it should be fine to get the user multiple times since the caching will de-duplicate these requests
        const sessionUser = await getUser(sessionRecipeUserId.getAsString(), input.userContext);
        if (sessionUser === undefined) {
            throw new SessionError({
                type: SessionError.UNAUTHORISED,
                message: "Session user not found",
            });
        }
        // This can happen with older session, because we did not add MFA claims previously.
        // We try to determine best possible factorId based on the session's recipe user id.

        const sessionInfo = await Session.getSessionInformation(sessionHandle, input.userContext);

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

        updatedClaimVal = true;
        mfaClaimValue = {
            c: {
                [computedFirstFactorIdForSession]: firstFactorTime,
            },
            v: true, // updated later in this function
        };
    }

    const completedFactors = mfaClaimValue.c;

    let userProm: Promise<User> | undefined;
    function userGetter() {
        if (userProm) {
            return userProm;
        }
        userProm = getUser(sessionRecipeUserId.getAsString(), input.userContext).then((sessionUser) => {
            if (sessionUser === undefined) {
                throw new SessionError({
                    type: SessionError.UNAUTHORISED,
                    message: "Session user not found",
                });
            }
            return sessionUser;
        });
        return userProm;
    }

    const mfaRequirementsForAuth = await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getMFARequirementsForAuth(
        {
            accessTokenPayload,
            tenantId,
            get user() {
                return userGetter();
            },
            get factorsSetUpForUser() {
                return userGetter().then((user) =>
                    Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getFactorsSetupForUser({
                        user,
                        userContext: input.userContext,
                    })
                );
            },
            get requiredSecondaryFactorsForUser() {
                return userGetter().then((sessionUser) => {
                    if (sessionUser === undefined) {
                        throw new SessionError({
                            type: SessionError.UNAUTHORISED,
                            message: "Session user not found",
                        });
                    }

                    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getRequiredSecondaryFactorsForUser({
                        userId: sessionUser.id,
                        userContext: input.userContext,
                    });
                });
            },
            get requiredSecondaryFactorsForTenant() {
                return Multitenancy.getTenant(tenantId, input.userContext).then((tenantInfo) => {
                    if (tenantInfo === undefined) {
                        throw new SessionError({
                            type: SessionError.UNAUTHORISED,
                            message: "Tenant not found",
                        });
                    }

                    return tenantInfo.requiredSecondaryFactors ?? [];
                });
            },
            completedFactors,
            userContext: input.userContext,
        }
    );

    const areAuthReqsComplete =
        MultiFactorAuthClaim.getNextSetOfUnsatisfiedFactors(completedFactors, mfaRequirementsForAuth).factorIds
            .length === 0;
    if (mfaClaimValue.v !== areAuthReqsComplete) {
        updatedClaimVal = true;
        mfaClaimValue.v = areAuthReqsComplete;
    }

    if ("session" in input && updatedClaimVal) {
        await input.session.setClaimValue(MultiFactorAuthClaim, mfaClaimValue, input.userContext);
    }

    return {
        completedFactors,
        mfaRequirementsForAuth,
        isMFARequirementsForAuthSatisfied: mfaClaimValue.v,
    };
};
