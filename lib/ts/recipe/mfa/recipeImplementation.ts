/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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

import { RecipeInterface, TypeNormalisedInput } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";

import { getUser } from "../..";
import { listDevices } from "../totp";
import { MfaClaim } from "./mfaClaim";
import MfaRecipe from "./recipe";

export default function getRecipeInterface(querier: Querier, config: TypeNormalisedInput): RecipeInterface {
    return {
        getNextFactors: async function (input) {
            return input.enabledByUser;
        },

        getFirstFactors: async function (_) {
            return config.defaultFirstFactors;
        },

        completeFactorInSession: async function ({ session, factorId, userContext }) {
            let value = (await session.getClaimValue(MfaClaim, userContext)) ?? { c: {}, next: [] };

            const MFARecipeImpl = MfaRecipe.getInstanceOrThrowError().recipeInterfaceImpl;

            const completedFactors = Object.keys(value.c);
            const enabledByUser = await MFARecipeImpl.getAllFactorsEnabledForUser({
                tenantId: "public", // TODO: Paas a variable
                userId: session.getUserId(),
                userContext: userContext,
            });

            const nextFactors = await MFARecipeImpl.getNextFactors({
                session,
                completedFactors,
                enabledByUser,
                userContext,
            });

            // Mark the factor as completed at current timestamp
            value.next = [];
            value.c[factorId] = new Date().getTime();

            // Insert items from nextFactors into value.next if they don't already exist in value.c
            for (const factorId of nextFactors) {
                if (value.c[factorId] === undefined) {
                    value.next.push(factorId);
                }
            }

            await session.setClaimValue(MfaClaim, value, userContext);
        },

        isFactorAlreadySetup: async function (input) {
            const firstFactorUser = await getUser(input.session.getUserId(), input.userContext);
            if (firstFactorUser === undefined) {
                throw new Error(`User doesn't exist`); // shouldn't happen
            }

            // Handles emailpassword, passwordless, thirdparty recipe users
            if (
                input.factorId === "emailpassword" ||
                input.factorId === "thirdparty" ||
                input.factorId === "passwordless"
            ) {
                const loginMethod = firstFactorUser.loginMethods.find((m) => m.recipeId === input.factorId);
                return loginMethod !== undefined;
            }

            if (input.factorId === "totp") {
                const res = await listDevices({ userId: input.session.getUserId() });
                const verifiedDevicesCount = res.status === "OK" ? res.devices.filter((d) => d.verified).length : 0;
                return verifiedDevicesCount > 0;
            }

            // FIXME: Should return a status instead of raising error?
            throw new Error(`Unknown factor id ${input.factorId}`);
        },

        getUserIdForFactor: async function (input) {
            return input.session.getUserId(); // FIXME
        },

        setUserIdForFactor: async function (_input) {
            // FIXME
        },

        getPrimaryUserIdForFactor: async function (_input) {
            return undefined; // FIXME
        },

        enableFactorForUser: async function (input) {
            const { tenantId, userId, factorId } = input;
            const response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/mfa/enable"), {
                tenantId,
                userId,
                factorId,
            });
            return response;
        },

        getAllFactorsEnabledForUser: async function (_input) {
            const { tenantId, userId } = _input;
            const response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/mfa/factors/list"), {
                tenantId,
                userId,
            });
            // return ["thirdparty", "emailpassword"];
            return response;
        },

        disableFactorForUser: async function (input) {
            const { tenantId, userId, factorId } = input;
            const response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/mfa/disable"), {
                tenantId,
                userId,
                factorId,
            });
            return response;
        },
    };
}
