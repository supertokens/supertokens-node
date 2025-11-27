// @ts-nocheck
import { APIFunction } from "../../types";
type Response = {
    status: "OK";
};
export declare const userEmailVerifyPut: ({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]) => Promise<Response>;
export {};
