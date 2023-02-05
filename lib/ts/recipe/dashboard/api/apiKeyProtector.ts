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
import { Querier } from "../../../querier";
import { makeDefaultUserContextFromAPI } from "../../../utils";
import { APIFunction, APIInterface, APIOptions } from "../types";
import { sendUnauthorisedAccess } from "../utils";
import NormalisedURLPath from "../../../normalisedURLPath";

type JWTVerifyResponse = { status: "OK" } | { status: "INVALID_JWT" };

export default async function apiKeyProtector(
    apiImplementation: APIInterface,
    options: APIOptions,
    apiFunction: APIFunction
): Promise<boolean> {
    const shouldAllowAccess = await options.recipeImplementation.shouldAllowAccess({
        req: options.req,
        config: options.config,
        userContext: makeDefaultUserContextFromAPI(options.req),
    });

    if (!shouldAllowAccess) {
        sendUnauthorisedAccess(options.res);
        return true;
    }

    // If the apiKey is not present, hit the token verification endpoint first.
    if (!options.config.apiKey) {
        let querier = Querier.getNewInstanceOrThrowError(undefined);
        const authHeaderValue = options.req.getHeaderValue("authorization")?.split(" ")[1];
        let jwtVerificationResponse: JWTVerifyResponse;
        if (true) {
            jwtVerificationResponse = await new Promise((resolve, reject) => {
                try {
                    setTimeout(() => {
                        resolve({
                            status: authHeaderValue?.includes("err") ? "INVALID_JWT" : "OK",
                        });
                    }, 3000);
                } catch (error) {
                    reject(error);
                }
            });
        } else {
            jwtVerificationResponse = await querier.sendPostRequest(new NormalisedURLPath("/recipe/dashboard/verify"), {
                jwt: authHeaderValue,
            });
        }

        if (jwtVerificationResponse.status !== "OK") {
            sendUnauthorisedAccess(options.res);
        }
    }

    const response = await apiFunction(apiImplementation, options);
    options.res.sendJSONResponse(response);
    return true;
}
