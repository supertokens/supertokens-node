// @ts-nocheck
import { APIFunction } from "../types";
export type Response = {
    status: "OK";
};
export default function analyticsPost({
    stInstance,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response>;
