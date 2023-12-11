// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
declare type Response = {
    status: "OK";
};
export declare const userEmailVerifyPut: (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: Record<string, any>
) => Promise<Response>;
export {};
