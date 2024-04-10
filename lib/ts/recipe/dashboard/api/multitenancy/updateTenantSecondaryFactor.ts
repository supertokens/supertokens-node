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
import { APIInterface, APIOptions } from "../../types";
import MultitenancyRecipe from "../../../multitenancy/recipe";
import MultifactorAuthRecipe from "../../../multifactorauth/recipe";
import { FactorIds } from "../../../multifactorauth";
import { normaliseTenantSecondaryFactors } from "./utils";

export type Response =
    | { status: "OK"; isMfaRequirementsForAuthOverridden: boolean }
    | { status: "RECIPE_NOT_CONFIGURED_ON_BACKEND_SDK"; message: string }
    | { status: "MFA_NOT_INITIALIZED" }
    | { status: "MFA_REQUIREMENTS_FOR_AUTH_OVERRIDDEN" }
    | { status: "UNKNOWN_TENANT_ERROR" };

export default async function updateTenantSecondaryFactor(
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
): Promise<Response> {
    const requestBody = await options.req.getJSONBody();
    const { factorId, enable } = requestBody;

    const mtRecipe = MultitenancyRecipe.getInstance();
    const mfaInstance = MultifactorAuthRecipe.getInstance();

    if (mfaInstance === undefined) {
        return {
            status: "MFA_NOT_INITIALIZED",
        };
    }

    const tenantRes = await mtRecipe?.recipeInterfaceImpl.getTenant({ tenantId, userContext });

    if (tenantRes === undefined) {
        return {
            status: "UNKNOWN_TENANT_ERROR",
        };
    }

    let updateTenantBody: any = {};

    if (enable === true) {
        if ([FactorIds.EMAILPASSWORD].includes(factorId)) {
            updateTenantBody.emailPasswordEnabled = true;
            tenantRes.emailPassword.enabled = true;
        } else if (
            [FactorIds.LINK_EMAIL, FactorIds.LINK_PHONE, FactorIds.OTP_EMAIL, FactorIds.OTP_PHONE].includes(factorId)
        ) {
            updateTenantBody.passwordlessEnabled = true;
            tenantRes.passwordless.enabled = true;
        } else if ([FactorIds.THIRDPARTY].includes(factorId)) {
            updateTenantBody.thirdPartyEnabled = true;
            tenantRes.thirdParty.enabled = true;
        }

        const allAvailableSecondaryFactors = mfaInstance.getAllAvailableSecondaryFactorIds(tenantRes);

        if (!allAvailableSecondaryFactors.includes(factorId)) {
            return {
                status: "RECIPE_NOT_CONFIGURED_ON_BACKEND_SDK",
                message: `No suitable recipe for the factor ${factorId} is initialised on the backend SDK`,
            };
        }
    }

    let secondaryFactors = normaliseTenantSecondaryFactors(tenantRes);

    if (enable === true) {
        if (!secondaryFactors.includes(factorId)) {
            secondaryFactors.push(factorId);
        }
    } else {
        secondaryFactors = secondaryFactors.filter((f) => f !== factorId);
    }

    await mtRecipe?.recipeInterfaceImpl.createOrUpdateTenant({
        tenantId,
        config: {
            ...updateTenantBody,
            requiredSecondaryFactors: secondaryFactors.length > 0 ? secondaryFactors : null,
        },
        userContext,
    });

    return {
        status: "OK",
        isMfaRequirementsForAuthOverridden: mfaInstance.isGetMfaRequirementsForAuthOverridden,
    };
}
