"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getRecipeInterface;
function getRecipeInterface(querier) {
    return {
        getUserMetadata: function ({ userId, userContext }) {
            return querier.sendGetRequest("/recipe/user/metadata", { userId }, userContext);
        },
        updateUserMetadata: async function ({ userId, metadataUpdate, userContext }) {
            const response = await querier.sendPutRequest(
                "/recipe/user/metadata",
                {
                    userId,
                    metadataUpdate,
                },
                {},
                userContext
            );
            return Object.assign(Object.assign({}, response), { metadata: response.metadata });
        },
        clearUserMetadata: function ({ userId, userContext }) {
            return querier.sendPostRequest(
                "/recipe/user/metadata/remove",
                {
                    userId,
                },
                userContext
            );
        },
    };
}
