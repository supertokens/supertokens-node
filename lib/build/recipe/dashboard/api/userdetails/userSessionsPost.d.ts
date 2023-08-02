// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
declare type Response = {
    status: "OK";
};
export declare const userSessionsPost: (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    userContext: any
) => Promise<Response>;
export {};
