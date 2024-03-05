// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
import { ProviderConfig } from "../../../thirdparty/types";
export declare type Response = {
    status: "OK";
    providers: ProviderConfig[];
};
export default function getAllThirdPartyProviders(
    _: APIInterface,
    __: string,
    options: APIOptions,
    userContext: any
): Promise<Response>;
