import * as express from "express";
import * as serverless from "serverless-http";
import { TypeInput } from "./types";
import { middleware, init, errorHandler } from ".";
import * as bodyParser from "body-parser";
import type { APIGatewayProxyEvent, Context as LambdaContext, APIGatewayProxyResult } from "aws-lambda";
import Session from "./recipe/session/sessionClass";
import { verifySession } from "./recipe/session";
import { SessionRequest } from "./recipe/session/types";

export function supertokensServerlessHandler(options: {
    config: TypeInput;
    handler:
        | ((request: express.Request, response: express.Response, next: express.NextFunction) => Promise<void>)
        | express.Router;
    errorHandler?: (
        err: any,
        request: express.Request,
        response: express.Response,
        next: express.NextFunction
    ) => Promise<void>;
}) {
    let app = express();

    init(options.config);

    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    app.use(middleware);

    app.use(options.handler);

    app.use(errorHandler());

    async function defaultErrorHandler(
        error: any,
        _: express.Request,
        response: express.Response,
        __: express.NextFunction
    ) {
        response.statusCode = 500;
        response.json({
            error: error.message === undefined ? "Something went wrong" : error.message,
        });
    }

    options.errorHandler = options.errorHandler === undefined ? defaultErrorHandler : options.errorHandler;

    app.use(options.errorHandler);

    return serverless(app);
}

export function supertokensRedwoodGraphQLHandler(
    config: TypeInput,
    createGraphQLHandler: any,
    createGraphQLHandlerOptions: any
) {
    return (event: APIGatewayProxyEvent, context: LambdaContext, callback: any): void => {
        if (
            event.headers !== undefined &&
            event.headers["auth-provider"] !== undefined &&
            event.headers["auth-provider"] === "supertokens"
        ) {
            let router = express.Router();
            let superTokensSession: Session | undefined = undefined;
            router.use(
                verifySession() as any,
                ((req: SessionRequest, response: express.Response, __: express.NextFunction) => {
                    superTokensSession = req.session;
                    response.json({});
                }) as any
            );
            supertokensServerlessHandler({
                config,
                handler: router,
            })(event, context).then((result) => {
                if (result.statusCode !== 200) {
                    return callback(null, result);
                } else {
                    let customCallback = (err: any, callbackResult: APIGatewayProxyResult) => {
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
                        let resultMultiValueHeaders = (result as APIGatewayProxyResult).multiValueHeaders;
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
                    let getCurrentUser = createGraphQLHandlerOptions.getCurrentUser;
                    delete createGraphQLHandlerOptions.getCurrentUser;
                    createGraphQLHandler({
                        getCurrentUser: async (___: any, __: any) => {
                            return await getCurrentUser(superTokensSession, {
                                type: "supertokens",
                                token: "",
                                schema: "",
                            });
                        },
                        ...createGraphQLHandlerOptions,
                    })(event, context, customCallback);
                }
            });
        } else {
            createGraphQLHandler(createGraphQLHandlerOptions)(event, context, callback);
        }
    };
}
