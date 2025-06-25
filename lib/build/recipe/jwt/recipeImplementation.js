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
exports.default = getRecipeInterface;
const defaultJWKSMaxAge = 60; // This corresponds to the dynamicSigningKeyOverlapMS in the core
function getRecipeInterface(querier, config, appInfo) {
    return {
        createJWT: async function ({ payload, validitySeconds, useStaticSigningKey, userContext }) {
            if (validitySeconds === undefined) {
                // If the user does not provide a validity to this function and the config validity is also undefined, use 100 years (in seconds)
                validitySeconds = config.jwtValiditySeconds;
            }
            let response = await querier.sendPostRequest(
                "/recipe/jwt",
                {
                    payload: payload !== null && payload !== void 0 ? payload : {},
                    validity: validitySeconds,
                    useStaticSigningKey: useStaticSigningKey !== false,
                    algorithm: "RS256",
                    jwksDomain: appInfo.apiDomain.getAsStringDangerous(),
                },
                userContext
            );
            if (response.status === "OK") {
                return {
                    status: "OK",
                    jwt: response.jwt,
                };
            } else {
                return {
                    status: "UNSUPPORTED_ALGORITHM_ERROR",
                };
            }
        },
        getJWKS: async function ({ userContext }) {
            const { body, headers } = await querier.sendGetRequestWithResponseHeaders(
                "/.well-known/jwks.json",
                {},
                undefined,
                userContext
            );
            let validityInSeconds = defaultJWKSMaxAge;
            const cacheControl = headers.get("Cache-Control");
            if (cacheControl) {
                const maxAgeHeader = cacheControl.match(/,?\s*max-age=(\d+)(?:,|$)/);
                if (maxAgeHeader !== null) {
                    validityInSeconds = Number.parseInt(maxAgeHeader[1]);
                    if (!Number.isSafeInteger(validityInSeconds)) {
                        validityInSeconds = defaultJWKSMaxAge;
                    }
                }
            }
            return Object.assign({ validityInSeconds }, body);
        },
    };
}
