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
import { UserContext } from "../../../types";
import { send200Response } from "../../../utils";
import { APIInterface, APIOptions } from "../types";

export default async function getOpenIdDiscoveryConfiguration(
    apiImplementation: APIInterface,
    options: APIOptions,
    userContext: UserContext
): Promise<boolean> {
    if (apiImplementation.getOpenIdDiscoveryConfigurationGET === undefined) {
        return false;
    }

    let result = await apiImplementation.getOpenIdDiscoveryConfigurationGET({
        options,
        userContext,
    });
    if (result.status === "OK") {
        options.res.setHeader("Access-Control-Allow-Origin", "*", false);
        send200Response(options.res, {
            issuer: result.issuer,
            jwks_uri: result.jwks_uri,
            authorization_endpoint: result.authorization_endpoint,
            token_endpoint: result.token_endpoint,
            userinfo_endpoint: result.userinfo_endpoint,
            revocation_endpoint: result.revocation_endpoint,
            token_introspection_endpoint: result.token_introspection_endpoint,
            end_session_endpoint: result.end_session_endpoint,
            subject_types_supported: result.subject_types_supported,
            id_token_signing_alg_values_supported: result.id_token_signing_alg_values_supported,
            response_types_supported: result.response_types_supported,
        });
    } else {
        send200Response(options.res, result);
    }
    return true;
}
