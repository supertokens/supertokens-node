// @ts-nocheck
import { APIFunction } from "../types";
export type Response = {
    status: "OK";
    count: number;
};
export default function usersCountGet({
    stInstance,
    tenantId,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response>;
