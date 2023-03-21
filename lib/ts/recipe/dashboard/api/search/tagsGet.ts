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

import { APIInterface, APIOptions } from "../../types";
import { Querier } from "../../../../querier";
import NormalisedURLPath from "../../../../normalisedURLPath";

type TagsResponse = { status: "OK"; tags: string[] };

export const getSearchTags = async (_: APIInterface, __: APIOptions): Promise<TagsResponse> => {
    let querier = Querier.getNewInstanceOrThrowError(undefined);
    try {
        let tagsResponse = await querier.sendGetRequest(new NormalisedURLPath("/recipe/dashboard/tags"), {});
        if (tagsResponse.status === 200) {
            return tagsResponse;
        }
    } catch (err) {
        return { status: "OK", tags: ["email", "phone", "provider"] };
    }
    return { status: "OK", tags: ["email", "phone", "provider"] };
};
