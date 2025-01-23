// @ts-nocheck
import { APIInterface, APIOptions } from "../types";
import { UserContext } from "../../../types";
export type Response = {
    status: "OK";
    count: number;
};
export default function usersCountGet(
    _: APIInterface,
    tenantId: string,
    __: APIOptions,
    userContext: UserContext
): Promise<Response>;
