// @ts-nocheck
import { APIInterface, APIOptions, UserWithFirstAndLastName } from "../types";
export type Response = {
    status: "OK";
    nextPaginationToken?: string;
    users: UserWithFirstAndLastName[];
};
export default function usersGet(_: APIInterface, tenantId: string, options: APIOptions): Promise<Response>;
export declare function getSearchParamsFromURL(path: string): {
    [key: string]: string;
};
