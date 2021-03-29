import * as express from "express";
import Session from "./recipe/session/sessionRecipe";
import { getSession, Error as STError } from "./recipe/session";

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
            let response: express.Response = Object.create(express.response);
            getSession(event, response)
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
                        return callback(null, response);
                    }
                });
        } else {
            createGraphQLHandler(createGraphQLHandlerOptions)(event, context, callback);
        }
    };
}
