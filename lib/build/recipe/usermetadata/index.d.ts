// @ts-nocheck
import { JSONObject } from "../../types";
import Recipe from "./recipe";
import { RecipeInterface, MetadataUpdate } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static getUserMetadata(
        userId: string,
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
        metadata: any;
    }>;
    static updateUserMetadata<T extends object>(
        userId: string,
        metadataUpdate: MetadataUpdate<T>,
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
        metadata: JSONObject;
    }>;
    static clearUserMetadata(
        userId: string,
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
    }>;
}
export declare const init: typeof Recipe.init;
export declare const getUserMetadata: typeof Wrapper.getUserMetadata;
export declare const updateUserMetadata: typeof Wrapper.updateUserMetadata;
export declare const clearUserMetadata: typeof Wrapper.clearUserMetadata;
export type { RecipeInterface, JSONObject };
