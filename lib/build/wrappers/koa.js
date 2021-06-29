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
const co_body_1 = require("co-body");
class KoaRequest extends request_1.BaseRequest {
    constructor(ctx) {
        super();
        this.getKeyValueFromQuery = (key) =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.ctx.query === undefined) {
                    return undefined;
                }
                let value = this.ctx.request.query[key];
                if (value === undefined || typeof value !== "string") {
                    return undefined;
                }
                return value;
            });
        this.getJSONBody = () =>
            __awaiter(this, void 0, void 0, function* () {
                if (this.parsedJSONBody === undefined) {
                    this.parsedJSONBody = yield parseJSONBodyFromRequest(this.ctx);
                }
                return this.parsedJSONBody === undefined ? {} : this.parsedJSONBody;
            });
        this.getMethod = () => {
            return utils_1.normaliseHttpMethod(this.ctx.request.method);
        };
        this.getCookieValue = (key) => {
            return this.ctx.cookies.get(key);
        };
        this.getHeaderValue = (key) => {
            return utils_2.getHeaderValueFromIncomingMessage(this.ctx.req, key);
        };
        this.getOriginalURL = () => {
            return this.ctx.originalUrl;
        };
        this.ctx = ctx;
        this.parsedJSONBody = undefined;
    }
}
exports.KoaRequest = KoaRequest;
function parseJSONBodyFromRequest(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield co_body_1.json(ctx);
    });
}
//# sourceMappingURL=koa.js.map
