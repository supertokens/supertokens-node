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
const utils_1 = require("../../../utils");
const error_1 = __importDefault(require("../error"));
async function consumeCode(apiImplementation, tenantId, options, userContext) {
    if (apiImplementation.consumeCodePOST === undefined) {
        return false;
    }
    const body = await options.req.getJSONBody();
    const preAuthSessionId = body.preAuthSessionId;
    const linkCode = body.linkCode;
    const deviceId = body.deviceId;
    const userInputCode = body.userInputCode;
    if (preAuthSessionId === undefined) {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Please provide preAuthSessionId",
        });
    }
    if (deviceId !== undefined || userInputCode !== undefined) {
        if (linkCode !== undefined) {
            throw new error_1.default({
                type: error_1.default.BAD_INPUT_ERROR,
                message: "Please provide one of (linkCode) or (deviceId+userInputCode) and not both",
            });
        }
        if (deviceId === undefined || userInputCode === undefined) {
            throw new error_1.default({
                type: error_1.default.BAD_INPUT_ERROR,
                message: "Please provide both deviceId and userInputCode",
            });
        }
    } else if (linkCode === undefined) {
        throw new error_1.default({
            type: error_1.default.BAD_INPUT_ERROR,
            message: "Please provide one of (linkCode) or (deviceId+userInputCode) and not both",
        });
    }
    let result = await apiImplementation.consumeCodePOST(
        deviceId !== undefined
            ? {
                  deviceId,
                  userInputCode,
                  preAuthSessionId,
                  tenantId,
                  options,
                  userContext,
              }
            : {
                  linkCode,
                  options,
                  preAuthSessionId,
                  tenantId,
                  userContext,
              }
    );
    if (result.status === "OK") {
        result = Object.assign(Object.assign({}, result), utils_1.getBackwardsCompatibleUserInfo(options.req, result));
        delete result.session;
    }
    utils_1.send200Response(options.res, result);
    return true;
}
exports.default = consumeCode;
