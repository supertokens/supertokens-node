// @ts-nocheck
import { APIFunction } from "../../types";
type Response = {
    status: "OK" | "EMAIL_ALREADY_VERIFIED_ERROR";
};
export declare const userEmailVerifyTokenPost: ({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]) => Promise<Response>;
export {};
