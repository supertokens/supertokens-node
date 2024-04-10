/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
import { APIInterface, APIOptions } from "../../types";
import Multitenancy from "../../../multitenancy";
import SuperTokensError from "../../../../error";
import { QuerierError } from "../../../../QuerierError";

export type Response =
    | {
          status: "OK";
          createdNew: boolean;
      }
    | {
          status: "MULTITENANCY_NOT_ENABLED_IN_CORE_ERROR";
      }
    | {
          status: "INVALID_TENANT_ID_ERROR";
          message: string;
      };

export default async function createOrUpdateTenant(
    _: APIInterface,
    __: string,
    options: APIOptions,
    userContext: any
): Promise<Response> {
    const requestBody = await options.req.getJSONBody();
    const { tenantId, ...config } = requestBody;

    if (typeof tenantId !== "string" || tenantId === "") {
        throw new SuperTokensError({
            message: "Missing required parameter 'tenantId'",
            type: SuperTokensError.BAD_INPUT_ERROR,
        });
    }

    let tenantRes;
    try {
        tenantRes = await Multitenancy.createOrUpdateTenant(tenantId, config, userContext);
    } catch (err) {
        const error = err as QuerierError;
        if (error.statusCode === 402) {
            return {
                status: "MULTITENANCY_NOT_ENABLED_IN_CORE_ERROR",
            };
        }
        if (error.statusCode === 400) {
            return {
                status: "INVALID_TENANT_ID_ERROR",
                message: error.errorMessageFromCore,
            };
        }
        throw err;
    }

    return tenantRes;
}
