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

import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface, NormalisedErrorHandlers } from "./types";
import { BaseRequest, BaseResponse } from "../../framework";
import { sendNon200ResponseWithMessage } from "../../utils";

export function validateAndNormaliseUserInput(config?: TypeInput): TypeNormalisedInput {
    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config?.override,
    };

    const errorHandlers: NormalisedErrorHandlers = {
        onTenantDoesNotExistError: async function (message: string, _: BaseRequest, response: BaseResponse) {
            sendNon200ResponseWithMessage(response, message, 422);
        },
        onRecipeDisabledForTenantError: async function (message: string, _: BaseRequest, response: BaseResponse) {
            sendNon200ResponseWithMessage(response, message, 403);
        },
    };

    if (config !== undefined) {
        if (config.errorHandlers !== undefined) {
            if (config.errorHandlers.onTenantDoesNotExistError !== undefined) {
                errorHandlers.onTenantDoesNotExistError = config.errorHandlers.onTenantDoesNotExistError;
            }
            if (config.errorHandlers.onRecipeDisabledForTenantError !== undefined) {
                errorHandlers.onRecipeDisabledForTenantError = config.errorHandlers.onRecipeDisabledForTenantError;
            }
        }
    }

    return {
        getTenantIdForUserId: config?.getTenantIdForUserId,
        getAllowedDomainsForTenantId: config?.getAllowedDomainsForTenantId,
        errorHandlers,
        override,
    };
}
