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

import Session from "./recipe/session/sessionRecipe";
import { getSession, Error as STError } from "./recipe/session";

import { ServerResponse } from "http";

class CustomResponse extends ServerResponse {
    chunks: Buffer[];

    body: string | undefined;

    write_original: Function;

    end_original: Function;

    write: any;

    constructor({ options }: any) {
        super({ options } as any);
        this.chunks = [];
        this.write_original = this.write;
        this.end_original = this.end;
        this.end = this._end_;
        this.write = this._write_;
        this.body = undefined;
    }

    _write_ = (chunk: any) => {
        this.chunks.push(Buffer.from(chunk));
        this.write_original(chunk);
    };

    _end_ = (chunk: any) => {
        if (chunk) {
            this.chunks.push(Buffer.from(chunk));
        }

        this.body = Buffer.concat(this.chunks).toString("utf8");
        this.end_original(chunk);
    };

    json = (chunk: any) => {
        this.setHeader("Content-Type", "application/json");
        this.send(JSON.stringify(chunk));
    };

    set = (field: string, val: string | number | string[]) => {
        let value = Array.isArray(val) ? val.map(String) : String(val);
        this.setHeader(field, value);
        return this;
    };

    get = (field: string) => {
        return this.getHeader(field);
    };

    send = (chunk: any) => {
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
}

// TODO: take serverless app as argument --DONE
// TODO: this should be imported from supertokens-node/redwood --DONE
// TODO: supertokensRedwoodGraphQLHandler -> supertokensGraphQLHandler --DONE
export function supertokensGraphQLHandler(createGraphQLHandler: any, createGraphQLHandlerOptions: any) {
    return (event: any, context: any, callback: any): void => {
        if (
            event.headers !== undefined &&
            event.headers["auth-provider"] !== undefined &&
            event.headers["auth-provider"] === "supertokens"
        ) {
            event.method = event.httpMethod;
            event.params = event.pathParameters;
            event.query = event.queryStringParameters;
            let response = new CustomResponse(event);
            getSession(event, response as any)
                .then((session) => {
                    let callbackForGraphQL = (err: any, callbackResult: any) => {
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
                    createGraphQLHandler({
                        ...createGraphQLHandlerOptions,
                        getCurrentUser: async (___: any, __: any) => {
                            return await createGraphQLHandlerOptions.getCurrentUser(session, {
                                type: "supertokens",
                                token: "",
                                schema: "",
                            });
                        },
                    })(event, context, callbackForGraphQL);
                })
                .catch((err) => {
                    let callbackCalled = false;
                    let errorHandler: any = undefined;
                    if (err.type === STError.UNAUTHORISED) {
                        errorHandler = Session.getInstanceOrThrowError().config.errorHandlers.onUnauthorised;
                    } else if (err.type === STError.TRY_REFRESH_TOKEN) {
                        errorHandler = Session.getInstanceOrThrowError().config.errorHandlers.onTryRefreshToken;
                    } else {
                        return callback(err);
                    }
                    errorHandler(err.message, event, response, (error: any) => {
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
