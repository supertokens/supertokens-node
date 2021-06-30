export declare type TypeWrapper = "express";
import { VerifySessionOptions } from "../recipe/session";
import { BaseRequest, BaseResponse } from ".";
export declare let SchemaWrapper: {
    type: string;
    enum: string[];
};
export interface Wrapper {
    middleware: () => any;
    errorHandler: () => any;
    verifySession: (options?: VerifySessionOptions) => any;
    wrapRequest: (unwrapped: any) => BaseRequest;
    wrapReresponse: (unwrapped: any) => BaseResponse;
}
