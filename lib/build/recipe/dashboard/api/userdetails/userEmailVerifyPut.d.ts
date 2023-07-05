// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
declare type Response = {
    status: "OK";
};
export declare const userEmailVerifyPut: (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
) => Promise<Response>;
export {};
