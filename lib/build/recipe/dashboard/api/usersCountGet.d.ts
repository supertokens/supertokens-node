// @ts-nocheck
import { APIInterface, APIOptions } from "../types";
import { APIResponse } from "./types";
export declare type UsersCountAPIResponse = {
    status: "OK";
    count: number;
};
export default function usersCountGet(_: APIInterface, __: APIOptions): Promise<APIResponse>;
