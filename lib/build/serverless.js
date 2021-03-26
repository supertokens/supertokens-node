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
const serverless = require("serverless-http");
const _1 = require(".");
const bodyParser = require("body-parser");
const session_1 = require("./recipe/session");
function supertokensServerlessHandler(options) {
    let app = express();
    _1.init(options.config);
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use(_1.middleware());
    app.use(options.handler);
    app.use(_1.errorHandler());
    function defaultErrorHandler(error, _, response, __) {
        return __awaiter(this, void 0, void 0, function* () {
            response.statusCode = 500;
            response.json({
                error: error.message === undefined ? "Something went wrong" : error.message,
            });
        });
    }
    options.errorHandler = options.errorHandler === undefined ? defaultErrorHandler : options.errorHandler;
    app.use(options.errorHandler);
    return serverless(app);
}
exports.supertokensServerlessHandler = supertokensServerlessHandler;
function supertokensRedwoodGraphQLHandler(config, createGraphQLHandler, createGraphQLHandlerOptions) {
    return (event, context, callback) => {
        if (
            event.headers !== undefined &&
            event.headers["auth-provider"] !== undefined &&
            event.headers["auth-provider"] === "supertokens"
        ) {
            let router = express.Router();
            let superTokensSession = undefined;
            router.use(session_1.verifySession(), (req, response, __) => {
                superTokensSession = req.session;
                response.json({});
            });
            supertokensServerlessHandler({
                config,
                handler: router,
            })(event, context).then((result) => {
                if (result.statusCode !== 200) {
                    return callback(null, result);
                } else {
                    let customCallback = (err, callbackResult) => {
                        if (result.headers !== undefined) {
                            if (callbackResult.headers === undefined) {
                                callbackResult.headers = {};
                            }
                            let resultHeaderKeys = Object.keys(result.headers);
                            for (let i = 0; i < resultHeaderKeys.length; i++) {
                                if (callbackResult.headers[resultHeaderKeys[i]] !== undefined) {
                                    callbackResult.headers[resultHeaderKeys[i]] = result.headers[resultHeaderKeys[i]];
                                }
                            }
                        }
                        let resultMultiValueHeaders = result.multiValueHeaders;
                        if (resultMultiValueHeaders !== undefined) {
                            if (callbackResult.multiValueHeaders === undefined) {
                                callbackResult.multiValueHeaders = {};
                            }
                            let resultMultiValueHeaderKeys = Object.keys(resultMultiValueHeaders);
                            for (let i = 0; i < resultMultiValueHeaderKeys.length; i++) {
                                if (callbackResult.multiValueHeaders[resultMultiValueHeaderKeys[i]] === undefined) {
                                    callbackResult.multiValueHeaders[resultMultiValueHeaderKeys[i]] = [];
                                }
                                callbackResult.multiValueHeaders[resultMultiValueHeaderKeys[i]].push(
                                    ...resultMultiValueHeaders[resultMultiValueHeaderKeys[i]]
                                );
                            }
                        }
                        return callback(err, callbackResult);
                    };
                    createGraphQLHandler(
                        Object.assign(Object.assign({}, createGraphQLHandlerOptions), {
                            getCurrentUser: (___, __) =>
                                __awaiter(this, void 0, void 0, function* () {
                                    return yield createGraphQLHandlerOptions.getCurrentUser(superTokensSession, {
                                        type: "supertokens",
                                        token: "",
                                        schema: "",
                                    });
                                }),
                        })
                    )(event, context, customCallback);
                }
            });
        } else {
            createGraphQLHandler(createGraphQLHandlerOptions)(event, context, callback);
        }
    };
}
exports.supertokensRedwoodGraphQLHandler = supertokensRedwoodGraphQLHandler;
//# sourceMappingURL=serverless.js.map
