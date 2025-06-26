// @ts-nocheck
import { APIInterface, APIOptions } from "../types";
import { UserContext } from "../../../types";
export type Response = {
    status: "OK";
};
export default function analyticsPost(
    _: APIInterface,
    ___: string,
    options: APIOptions,
    userContext: UserContext
): Promise<Response>;
