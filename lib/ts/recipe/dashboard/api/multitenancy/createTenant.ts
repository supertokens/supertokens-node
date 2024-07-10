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
import { UserContext } from "../../../../types";

export type Response =
    | {
          status: "OK";
          createdNew: boolean;
      }
    | {
          status: "MULTITENANCY_NOT_ENABLED_IN_CORE_ERROR" | "TENANT_ID_ALREADY_EXISTS_ERROR";
      }
    | {
          status: "INVALID_TENANT_ID_ERROR";
          message: string;
      };

export default async function createTenant(
    _: APIInterface,
    __: string,
    options: APIOptions,
    userContext: UserContext
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
        const errMsg: string = err.message;
        if (errMsg.includes("SuperTokens core threw an error for a ")) {
        }
        if (errMsg.includes("with status code: 402")) {
            return {
                status: "MULTITENANCY_NOT_ENABLED_IN_CORE_ERROR",
            };
        }
        if (errMsg.includes("with status code: 400")) {
            return {
                status: "INVALID_TENANT_ID_ERROR",
                message: errMsg.split(" and message: ")[1],
            };
        }
        throw err;
    }

    if (tenantRes.createdNew === false) {
        return {
            status: "TENANT_ID_ALREADY_EXISTS_ERROR",
        };
    }

    return tenantRes;
}
