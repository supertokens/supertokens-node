// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
declare type Response = {
    status: "OK";
};
export declare const userMetadataPut: (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    userContext: Record<string, any>
) => Promise<Response>;
export {};
