// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
declare type TagsResponse = {
    status: "OK";
    tags: string[];
};
export declare const getSearchTags: (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    __: any
) => Promise<TagsResponse>;
export {};
