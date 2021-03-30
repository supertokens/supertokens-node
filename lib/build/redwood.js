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
const sessionRecipe_1 = require("./recipe/session/sessionRecipe");
const session_1 = require("./recipe/session");
const http_1 = require("http");
class CustomResponse extends http_1.ServerResponse {
    constructor({ options }) {
        super({ options });
        this._write_ = (chunk) => {
            this.chunks.push(Buffer.from(chunk));
            this.write_original(chunk);
        };
        this._end_ = (chunk) => {
            if (chunk) {
                this.chunks.push(Buffer.from(chunk));
            }
            this.body = Buffer.concat(this.chunks).toString("utf8");
            this.end_original(chunk);
        };
        this.json = (chunk) => {
            this.setHeader("Content-Type", "application/json");
            this.send(JSON.stringify(chunk));
        };
        this.set = (field, val) => {
            let value = Array.isArray(val) ? val.map(String) : String(val);
            this.setHeader(field, value);
            return this;
        };
        this.get = (field) => {
            return this.getHeader(field);
        };
        this.send = (chunk) => {
            // populate Content-Length
            let len = 0;
            if (chunk !== undefined) {
                if (Buffer.isBuffer(chunk)) {
                    len = chunk.length;
                } else {
                    len = Buffer.from(chunk).length;
                }
                this.set("Content-Length", len);
            }
            // strip irrelevant headers
            if (204 === this.statusCode || 304 === this.statusCode) {
                this.removeHeader("Content-Type");
                this.removeHeader("Content-Length");
                this.removeHeader("Transfer-Encoding");
                chunk = "";
            }
            this.end(chunk);
            return this;
        };
        this.chunks = [];
        this.write_original = this.write;
        this.end_original = this.end;
        this.end = this._end_;
        this.write = this._write_;
        this.body = undefined;
    }
}
// TODO: take serverless app as argument --DONE
// TODO: this should be imported from supertokens-node/redwood --DONE
// TODO: supertokensRedwoodGraphQLHandler -> supertokensGraphQLHandler --DONE
function supertokensGraphQLHandler(createGraphQLHandler, createGraphQLHandlerOptions) {
    return (event, context, callback) => {
        if (
            event.headers !== undefined &&
            event.headers["auth-provider"] !== undefined &&
            event.headers["auth-provider"] === "supertokens"
        ) {
            event.method = event.httpMethod;
            event.params = event.pathParameters;
            event.query = event.queryStringParameters;
            let response = new CustomResponse(event);
            session_1
                .getSession(event, response)
                .then((session) => {
                    let callbackForGraphQL = (err, callbackResult) => {
                        if (response.getHeaders() !== undefined) {
                            if (callbackResult.headers === undefined) {
                                callbackResult.headers = {};
                            }
                            let resultHeaderKeys = Object.keys(response.getHeaders());
                            for (let i = 0; i < resultHeaderKeys.length; i++) {
                                if (callbackResult.headers[resultHeaderKeys[i]] === undefined) {
                                    callbackResult.headers[resultHeaderKeys[i]] = response.getHeaders()[
                                        resultHeaderKeys[i]
                                    ];
                                }
                            }
                        }
                        return callback(err, callbackResult);
                    };
                    createGraphQLHandler(
                        Object.assign(Object.assign({}, createGraphQLHandlerOptions), {
                            getCurrentUser: (___, __) =>
                                __awaiter(this, void 0, void 0, function* () {
                                    return yield createGraphQLHandlerOptions.getCurrentUser(session, {
                                        type: "supertokens",
                                        token: "",
                                        schema: "",
                                    });
                                }),
                        })
                    )(event, context, callbackForGraphQL);
                })
                .catch((err) => {
                    let callbackCalled = false;
                    let errorHandler = undefined;
                    if (err.type === session_1.Error.UNAUTHORISED) {
                        errorHandler = sessionRecipe_1.default.getInstanceOrThrowError().config.errorHandlers
                            .onUnauthorised;
                    } else if (err.type === session_1.Error.TRY_REFRESH_TOKEN) {
                        errorHandler = sessionRecipe_1.default.getInstanceOrThrowError().config.errorHandlers
                            .onTryRefreshToken;
                    } else {
                        return callback(err);
                    }
                    errorHandler(err.message, event, response, (error) => {
                        if (!callbackCalled) {
                            callbackCalled = true;
                            return callback(error);
                        }
                    });
                    if (!callbackCalled) {
                        callbackCalled = true;
                        return callback(null, {
                            headers: response.getHeaders(),
                            body: response.body,
                            statusCode: response.statusCode,
                        });
                    }
                });
        } else {
            createGraphQLHandler(createGraphQLHandlerOptions)(event, context, callback);
        }
    };
}
exports.supertokensGraphQLHandler = supertokensGraphQLHandler;
//# sourceMappingURL=redwood.js.map
