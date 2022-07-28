/* Copyright (c) 2022, VRAI Labs and/or its affiliates. All rights reserved.
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

import { RecipeInterface } from "./types";
import NormalisedURLPath from "../../normalisedURLPath";
import { Querier } from "../../querier";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
    return {
        createUserIdMapping: async function ({ superTokensUserId, externalUserId, externalUserIdInfo }) {
            return await querier.sendPostRequest(new NormalisedURLPath("/recipe/userid/map"), {
                superTokensUserId,
                externalUserId,
                externalUserIdInfo,
            });
        },
        getUserIdMapping: async function ({ userId, userIdType, userContext }) {
            if (userContext._default && userContext._default.userIdMapping !== undefined) {
                return userContext._default.userIdMapping;
            }

            let response = await querier.sendGetRequest(new NormalisedURLPath("/recipe/userid/map"), {
                userId,
                userIdType,
            });

            userContext._default.userIdMapping = response;
            return response;
        },
        deleteUserIdMapping: async function ({ userId, userIdType }) {
            return await querier.sendPostRequest(new NormalisedURLPath("/recipe/userid/map/remove"), {
                userId,
                userIdType,
            });
        },
        updateOrDeleteUserIdMappingInfo: async function ({ userId, userIdType, externalUserIdInfo }) {
            return await querier.sendPutRequest(new NormalisedURLPath("/recipe/userid/external-user-id-info"), {
                userId,
                userIdType,
                externalUserIdInfo,
            });
        },
    };
}
