// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
export declare type Response = {
    status: "OK";
    createdNew: boolean;
};
export default function createOrUpdateThirdPartyConfig(
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
): Promise<Response>;
