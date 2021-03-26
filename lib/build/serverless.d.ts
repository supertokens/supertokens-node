import * as express from "express";
import * as serverless from "serverless-http";
import { TypeInput } from "./types";
import type { APIGatewayProxyEvent, Context as LambdaContext } from "aws-lambda";
export declare function supertokensServerlessHandler(options: {
    config: TypeInput;
    handler: ((request: express.Request, response: express.Response, next: express.NextFunction) => Promise<void>) | express.Router;
    errorHandler?: (err: any, request: express.Request, response: express.Response, next: express.NextFunction) => Promise<void>;
}): serverless.Handler;
export declare function supertokensRedwoodGraphQLHandler(config: TypeInput, createGraphQLHandler: any, createGraphQLHandlerOptions: any): (event: APIGatewayProxyEvent, context: LambdaContext, callback: any) => void;
