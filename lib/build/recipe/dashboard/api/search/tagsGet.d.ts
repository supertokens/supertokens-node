// @ts-nocheck
import { APIFunction } from "../../types";
type TagsResponse = {
    status: "OK";
    tags: string[];
};
export declare const getSearchTags: ({
    stInstance,
    options,
    userContext,
}: Parameters<APIFunction>[0]) => Promise<TagsResponse>;
export {};
