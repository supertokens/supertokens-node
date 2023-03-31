// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
declare type TagsResponse = {
    status: "OK";
    tags: string[];
};
export declare const getSearchTags: (_: APIInterface, __: APIOptions) => Promise<TagsResponse>;
export {};
