"use strict";
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
const express = require("express");
const sessionRecipe_1 = require("./recipe/session/sessionRecipe");
const session_1 = require("./recipe/session");
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
            let response = Object.create(express.response);
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
                        return callback(null, response);
                    }
                });
        } else {
            createGraphQLHandler(createGraphQLHandlerOptions)(event, context, callback);
        }
    };
}
exports.supertokensGraphQLHandler = supertokensGraphQLHandler;
//# sourceMappingURL=redwood.js.map
