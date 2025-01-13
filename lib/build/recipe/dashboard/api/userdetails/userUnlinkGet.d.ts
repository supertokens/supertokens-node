// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
import { UserContext } from "../../../../types";
type Response = {
    status: "OK";
};
export declare const userUnlink: (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    userContext: UserContext
) => Promise<Response>;
export {};
