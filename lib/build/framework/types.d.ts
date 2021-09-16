// @ts-nocheck
export declare type TypeFramework = "express" | "fastify" | "hapi" | "loopback" | "koa" | "awsLambda";
import { BaseRequest, BaseResponse } from ".";
export declare let SchemaFramework: {
    type: string;
    enum: string[];
};
export interface Framework {
    wrapRequest: (unwrapped: any) => BaseRequest;
    wrapResponse: (unwrapped: any) => BaseResponse;
}
