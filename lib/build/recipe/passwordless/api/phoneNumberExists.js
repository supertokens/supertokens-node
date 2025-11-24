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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = phoneNumberExists;
const utils_1 = require("../../../utils");
const error_1 = __importDefault(require("../error"));
async function phoneNumberExists(apiImplementation, tenantId, options, userContext) {
    if (apiImplementation.phoneNumberExistsGET === undefined) {
        return false;
    }
    let phoneNumber = options.req.getKeyValueFromQuery("phoneNumber");
    if (phoneNumber === undefined || typeof phoneNumber !== "string") {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Please provide the phoneNumber as a GET param",
        });
    }
    let result = await apiImplementation.phoneNumberExistsGET({
        phoneNumber,
        tenantId,
        options,
        userContext,
    });
    (0, utils_1.send200Response)(options.res, result);
    return true;
}
