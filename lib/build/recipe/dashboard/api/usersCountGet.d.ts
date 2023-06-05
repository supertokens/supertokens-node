// @ts-nocheck
import { APIInterface, APIOptions } from "../types";
export declare type Response = {
    status: "OK";
    count: number;
};
export default function usersCountGet(_: APIInterface, __: APIOptions): Promise<Response>;
