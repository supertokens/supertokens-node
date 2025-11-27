// @ts-nocheck
import { APIFunction, UserWithFirstAndLastName } from "../types";
export type Response = {
    status: "OK";
    nextPaginationToken?: string;
    users: UserWithFirstAndLastName[];
};
export default function usersGet({
    stInstance,
    tenantId,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response>;
export declare function getSearchParamsFromURL(path: string): {
    [key: string]: string;
};
