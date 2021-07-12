export declare type TypeFramework = "express" | "fastify" | "hapi" | "loopback" | "koa" | "awsLambda";
import { VerifySessionOptions } from "../recipe/session";
import { BaseRequest, BaseResponse } from ".";
export declare let SchemaFramework: {
    type: string;
    enum: string[];
};
export interface Framework {
    middleware: () => any;
    errorHandler: () => any;
    verifySession: (options?: VerifySessionOptions) => any;
    wrapRequest: (unwrapped: any) => BaseRequest;
    wrapResponse: (unwrapped: any) => BaseResponse;
}
