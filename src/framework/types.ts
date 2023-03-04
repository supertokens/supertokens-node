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

import { BaseRequest } from "./request";
import { BaseResponse } from "./response";

export type TypeFramework = "express" | "fastify" | "hapi" | "loopback" | "koa" | "awsLambda";

export let SchemaFramework = {
    type: "string",
    enum: ["express", "fastify", "hapi", "loopback", "koa", "awsLambda"],
};

export interface Framework {
    wrapRequest: (unwrapped: any) => BaseRequest;

    wrapResponse: (unwrapped: any) => BaseResponse;
}
