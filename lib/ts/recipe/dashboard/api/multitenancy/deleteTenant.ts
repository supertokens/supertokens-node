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
import { UserContext } from "../../../../types";

export type Response =
    | {
          status: "OK";
          didExist: boolean;
      }
    | {
          status: "CANNOT_DELETE_PUBLIC_TENANT_ERROR";
      };

export default async function deleteTenant(
    _: APIInterface,
    tenantId: string,
    __: APIOptions,
    userContext: UserContext
): Promise<Response> {
    try {
        const deleteTenantRes = await Multitenancy.deleteTenant(tenantId, userContext);

        return deleteTenantRes;
    } catch (err) {
        if (err.statusCodeFromCore === 403 && err.errorMessageFromCore.includes("Cannot delete public tenant")) {
            return {
                status: "CANNOT_DELETE_PUBLIC_TENANT_ERROR",
            };
        }
        throw err;
    }
}
