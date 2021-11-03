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

import { NormalisedAppinfo } from "../../types";
import { validateTheStructureOfUserInput } from "../../utils";
import Recipe from "./recipe";
import { TypeInput as TypeNormalisedInputEmailVerification } from "../emailverification/types";
import { RecipeInterface, APIInterface, TypeProvider } from "./types";
import {
    TypeInput,
    InputSchema,
    TypeNormalisedInput,
    TypeInputSignInAndUp,
    TypeNormalisedInputSignInAndUp,
} from "./types";

export function validateAndNormaliseUserInput(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput {
    validateTheStructureOfUserInput(config, InputSchema, "thirdparty recipe");

    let emailVerificationFeature = validateAndNormaliseEmailVerificationConfig(recipeInstance, appInfo, config);

    let signInAndUpFeature = validateAndNormaliseSignInAndUpConfig(appInfo, config.signInAndUpFeature);

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config.override,
    };

    return {
        emailVerificationFeature,
        signInAndUpFeature,
        override,
    };
}

export function findRightProvider(
    providers: TypeProvider[],
    thirdPartyId: string,
    clientId?: string
): TypeProvider | undefined {
    return providers.find((p) => {
        let id = p.id;
        if (id !== thirdPartyId) {
            return false;
        }

        // first if there is only one provider with thirdPartyId in the providers array,
        let otherProvidersWithSameId = providers.filter((p1) => p1.id === id && p !== p1);
        if (otherProvidersWithSameId.length === 0) {
            // they we always return that.
            return true;
        }

        // otherwise, we look for the primary provider if clientId is missing
        if (clientId === undefined) {
            return p.primary === true;
        }

        // otherwise, we return a provider that matches based on client ID as well.
        return p.get(undefined, undefined).getClientId() === clientId;
    });
}

function validateAndNormaliseSignInAndUpConfig(
    _: NormalisedAppinfo,
    config: TypeInputSignInAndUp
): TypeNormalisedInputSignInAndUp {
    let providers = config.providers;

    if (providers === undefined || providers.length === 0) {
        throw new Error(
            "thirdparty recipe requires atleast 1 provider to be passed in signInAndUpFeature.providers config"
        );
    }

    // we check if there are multiple providers with the same id that have primary as true.
    // In this case, we want to throw an error..
    let primaryProvidersSet = new Set<string>();
    let allProvidersSet = new Set<string>();
    providers.forEach((p) => {
        let id = p.id;
        allProvidersSet.add(p.id);
        let isPrimary = p.primary;

        if (isPrimary === undefined) {
            // if this id is not being used by any other provider, we treat this as the primary
            let otherProvidersWithSameId = providers.filter((p1) => p1.id === id && p !== p1);
            if (otherProvidersWithSameId.length === 0) {
                // we treat this as the primary now...
                isPrimary = true;
            }
        }
        if (isPrimary) {
            if (primaryProvidersSet.has(id)) {
                throw new Error(
                    `You have provided multiple third party providers that have the id: "${id}" and are marked as primary. Please only mark one of them as primary.`
                );
            }
            primaryProvidersSet.add(id);
        }
    });

    if (primaryProvidersSet.size !== allProvidersSet.size) {
        // this means that there is no provider marked as primary
        throw new Error(
            `You have provided multiple third party providers that have the id and have not set any of them as "primary: true". Please make sure to mark exactly one of them as primary.`
        );
    }

    return {
        providers,
    };
}

function validateAndNormaliseEmailVerificationConfig(
    recipeInstance: Recipe,
    _: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInputEmailVerification {
    return {
        getEmailForUserId: recipeInstance.getEmailForUserId,
        override: config?.override?.emailVerificationFeature,
        createAndSendCustomEmail:
            config?.emailVerificationFeature?.createAndSendCustomEmail === undefined
                ? undefined
                : async (user, link) => {
                      let userInfo = await recipeInstance.recipeInterfaceImpl.getUserById({ userId: user.id });
                      if (
                          userInfo === undefined ||
                          config?.emailVerificationFeature?.createAndSendCustomEmail === undefined
                      ) {
                          throw new Error("Unknown User ID provided");
                      }
                      return await config.emailVerificationFeature.createAndSendCustomEmail(userInfo, link);
                  },
        getEmailVerificationURL:
            config?.emailVerificationFeature?.getEmailVerificationURL === undefined
                ? undefined
                : async (user) => {
                      let userInfo = await recipeInstance.recipeInterfaceImpl.getUserById({ userId: user.id });
                      if (
                          userInfo === undefined ||
                          config?.emailVerificationFeature?.getEmailVerificationURL === undefined
                      ) {
                          throw new Error("Unknown User ID provided");
                      }
                      return await config.emailVerificationFeature.getEmailVerificationURL(userInfo);
                  },
    };
}
