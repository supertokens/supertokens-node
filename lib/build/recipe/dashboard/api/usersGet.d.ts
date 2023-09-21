// @ts-nocheck
import { APIInterface, APIOptions, UserWithFirstAndLastName } from "../types";
export declare type Response = {
    status: "OK";
    nextPaginationToken?: string;
    users: UserWithFirstAndLastName[];
};
export default function usersGet(
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
): Promise<Response>;
export declare function getSearchParamsFromURL(
    path: string
): {
    [key: string]: string;
};
