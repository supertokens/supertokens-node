// @ts-nocheck
import { APIInterface, APIOptions } from "../../types";
import { UserContext } from "../../../../types";
type TagsResponse = {
    status: "OK";
    tags: string[];
};
export declare const getSearchTags: (
    _: APIInterface,
    ___: string,
    options: APIOptions,
    userContext: UserContext
) => Promise<TagsResponse>;
export {};
