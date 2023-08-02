// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
declare type Response = {
    status: "OK" | "EMAIL_ALREADY_VERIFIED_ERROR";
};
export declare const userEmailVerifyTokenPost: (
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
) => Promise<Response>;
export {};
