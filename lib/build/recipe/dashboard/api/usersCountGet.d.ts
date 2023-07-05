// @ts-nocheck
import { APIInterface, APIOptions } from "../types";
export declare type Response = {
    status: "OK";
    count: number;
};
export default function usersCountGet(_: APIInterface, tenantId: string, __: APIOptions, ___: any): Promise<Response>;
