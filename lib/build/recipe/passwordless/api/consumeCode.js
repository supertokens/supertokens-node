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
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
const error_1 = require("../error");
const utils_2 = require("../../../utils");
function consumeCode(apiImplementation, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (apiImplementation.consumeCodePOST === undefined) {
            return false;
        }
        const body = yield options.req.getJSONBody();
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
        let result = yield apiImplementation.consumeCodePOST(
            deviceId !== undefined
                ? {
                      deviceId,
                      userInputCode,
                      preAuthSessionId,
                      options,
                      userContext: utils_2.makeDefaultUserContextFromAPI(options.req),
                  }
                : {
                      linkCode,
                      options,
                      preAuthSessionId,
                      userContext: utils_2.makeDefaultUserContextFromAPI(options.req),
                  }
        );
        if (result.status === "OK") {
            delete result.session;
        }
        utils_1.send200Response(options.res, result);
        return true;
    });
}
exports.default = consumeCode;
