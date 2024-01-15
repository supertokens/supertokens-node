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
import RecipeUserId from "../../../../recipeUserId";

export type Response = ReturnType<typeof Multitenancy.associateUserToTenant>;

export default async function associateUserToTenant(
    _: APIInterface,
    __: string,
    options: APIOptions,
    userContext: any
): Response {
    const requestBody = await options.req.getJSONBody();
    const { tenantId, userId } = requestBody;

    if (typeof tenantId !== "string" || tenantId === "" || typeof userId !== "string" || userId === "") {
        throw new SuperTokensError({
            message: "Missing required parameter 'tenantId' or 'userId'",
            type: SuperTokensError.BAD_INPUT_ERROR,
        });
    }

    const recipeUserId = new RecipeUserId(userId);

    const response = await Multitenancy.associateUserToTenant(tenantId, recipeUserId, userContext);

    return response;
}
