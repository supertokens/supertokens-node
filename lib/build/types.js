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
const TypeString = {
    type: "string",
};
const TypeBoolean = {
    type: "boolean",
};
exports.InputSchema = {
    type: "object",
    properties: {
        supertokens: {
            type: "object",
            properties: {
                connectionURI: TypeString,
                apiKey: TypeString,
            },
            required: ["connectionURI"],
            additionalProperties: false,
        },
        appInfo: {
            type: "object",
            properties: {
                appName: TypeString,
                websiteDomain: TypeString,
                apiDomain: TypeString,
                apiBasePath: TypeString,
                apiGatewayPath: TypeString,
                websiteBasePath: TypeString,
            },
            required: ["appName", "websiteDomain", "apiDomain"],
            additionalProperties: false,
        },
        recipeList: {
            type: "array",
        },
        telemetry: TypeBoolean,
        isInServerlessEnv: TypeBoolean,
    },
    required: ["supertokens", "appInfo", "recipeList"],
    additionalProperties: false,
};
//# sourceMappingURL=types.js.map
