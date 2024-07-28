"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
function getAPIImplementation() {
    return {
        getJWKSGET: async function ({ options, userContext }) {
            const resp = await options.recipeImplementation.getJWKS({ userContext });
            if (resp.validityInSeconds !== undefined) {
                options.res.setHeader("Cache-Control", `max-age=${resp.validityInSeconds}, must-revalidate`, false);
            }
            const oauth2Provider = require("../../oauth2provider/recipe").default.getInstance();
            // TODO: dirty hack until we get core support
            if (oauth2Provider !== undefined) {
                const oauth2JWKSRes = await fetch("http://localhost:4444/.well-known/jwks.json");
                if (oauth2JWKSRes.ok) {
                    const oauth2RespBody = await oauth2JWKSRes.json();
                    resp.keys = resp.keys.concat(oauth2RespBody.keys);
                }
            }
            return {
                keys: resp.keys,
            };
        },
    };
}
exports.default = getAPIImplementation;
