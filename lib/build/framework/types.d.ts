// @ts-nocheck
export type TypeFramework = "express" | "fastify" | "hapi" | "loopback" | "koa" | "awsLambda" | "custom";
import { BaseRequest, BaseResponse } from ".";
export declare let SchemaFramework: {
    type: string;
    enum: string[];
};
export interface Framework {
    wrapRequest: (unwrapped: any) => BaseRequest;
    wrapResponse: (unwrapped: any) => BaseResponse;
}
