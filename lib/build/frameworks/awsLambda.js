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
const utils_1 = require("../utils");
const request_1 = require("./request");
const utils_2 = require("./utils");
class AWSRequest extends request_1.BaseRequest {
    constructor(event) {
        super();
        this.getKeyValueFromQuery = (key) =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.event.queryStringParameters === undefined || this.event.queryStringParameters === null) {
                    return undefined;
                }
                let value = this.event.queryStringParameters[key];
                if (value === undefined || typeof value !== "string") {
                    return undefined;
                }
                return value;
            });
        this.getJSONBody = () =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.parsedJSONBody === undefined) {
                    if (this.event.body === null || this.event.body === undefined) {
                        this.parsedJSONBody = {};
                    } else {
                        this.parsedJSONBody = JSON.parse(this.event.body);
                        if (this.parsedJSONBody === undefined) {
                            this.parsedJSONBody = {};
                        }
                    }
                }
                return this.parsedJSONBody;
            });
        this.getMethod = () => {
            let rawMethod = this.event.httpMethod;
            if (rawMethod !== undefined) {
                return utils_1.normaliseHttpMethod(rawMethod);
            }
            return utils_1.normaliseHttpMethod(this.event.requestContext.http.method);
        };
        this.getCookieValue = (key) => {
            return utils_2.getCookieValueFromHeaders(this.event.headers, key);
        };
        this.getHeaderValue = (key) => {
            return utils_2.normalizeHeaderValue(this.event.headers[key]);
        };
        this.getOriginalURL = () => {
            let path = this.event.requestContext.path;
            if (path === undefined) {
                path = this.event.requestContext.http.path;
            }
            return path;
        };
        this.event = event;
        this.parsedJSONBody = undefined;
    }
}
exports.AWSRequest = AWSRequest;
//# sourceMappingURL=awsLambda.js.map
