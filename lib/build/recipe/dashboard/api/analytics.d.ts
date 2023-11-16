// @ts-nocheck
import { APIInterface, APIOptions } from "../types";
export declare type Response = {
    status: "OK";
};
export default function analyticsPost(
    _: APIInterface,
    ___: string,
    options: APIOptions,
    userContext: any
): Promise<Response>;
