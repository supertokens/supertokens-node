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

        completeFactorInSession: async function (input) {
            // const  await input.session.getClaimValue(MFAClaim)
            let value = (await input.session.getClaimValue(MfaClaim, input.userContext)) ?? { c: {}, next: [] };

            const MFARecipeImpl = MfaRecipe.getInstanceOrThrowError().recipeInterfaceImpl;

            // if (Object.keys(value.c).length === 0) {
            // Should happen before calling any user creating API otherwise user won't login but
            // will be created
            //     const expectedFirstFactors = await MFARecipeImpl.getFirstFactors({tenantId: 'public', userContext: input.userContext});
            //     if (expectedFirstFactors.indexOf(input.factorId) === -1) {
            //         throw new Error(`First factor must be one of ${expectedFirstFactors.join(", ")}`);
            //     }
            // }

            const completedFactors = Object.keys(value.c);
            const enabledByUser = await MFARecipeImpl.getAllFactorsEnabledForUser({
                tenantId: "public",
                userId: input.session.getUserId(),
                userContext: input.userContext,
            });

            const nextFactors = await MFARecipeImpl.getNextFactors({
                session: input.session,
                completedFactors,
                enabledByUser,
                userContext: input.userContext,
            });

            value.next = [];
            value.c[input.factorId] = new Date().getTime();

            // Insert items from nextFactors into value.next if they don't already exist in value.c
            for (const factorId of nextFactors) {
                if (value.c[factorId] === undefined) {
                    value.next.push(factorId);
                }
            }

            await input.session.setClaimValue(MfaClaim, value, input.userContext);
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
                const totpDevices = await listDevices({ userId: input.session.getUserId() });
                return totpDevices.status === "OK" && totpDevices.devices.length > 0; // FIXME: check for verified devices?
            }

            throw new Error(`Unknown factor id ${input.factorId}`); // FIXME: Should return a status instead of raising error?
        },

        getUserIdForFactor: async function (input) {
            return input.session.getUserId(); // FIXME
        },

        setUserIdForFactor: async function (_input) {},

        getPrimaryUserIdForFactor: async function (_input) {
            return undefined; // FIXME
        },

        enableFactorForUser: async function (input) {
            const { userContext, ...rest } = input;
            const response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/mfa/enable"), {
                ...rest,
            });
            return response; // TODO: Verify type?
        },

        getAllFactorsEnabledForUser: async function (_input) {
            // const { userContext, ...rest } = input;
            // const response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/mfa/factors/list"), {
            //     ...rest,
            // });
            // return response; // TODO: Verify type?
            // return ["emailpassword", "passwordless"];
            return ["thirdparty", "emailpassword"];
        },

        disableFactorForUser: async function (input) {
            const { userContext, ...rest } = input;
            const response = await querier.sendPostRequest(new NormalisedURLPath("/recipe/mfa/disable"), {
                ...rest,
            });
            return response; // TODO: Verify type?
        },
    };
}
