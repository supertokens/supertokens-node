// @ts-nocheck
import { APIInterface, APIOptions } from "../types";
import { User } from "../../../types";
declare type UserWithMetadata = User & {
    firstName?: string;
    lastName?: string;
};
export declare type Response = {
    status: "OK";
    nextPaginationToken?: string;
    users: UserWithMetadata[];
};
export default function usersGet(_: APIInterface, options: APIOptions): Promise<Response>;
export {};
