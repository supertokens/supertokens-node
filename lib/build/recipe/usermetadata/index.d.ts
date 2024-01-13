// @ts-nocheck
import { JSONObject } from "../../types";
import Recipe from "./recipe";
import { RecipeInterface } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static getUserMetadata(
        userId: string,
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
        metadata: any;
    }>;
    static updateUserMetadata(
        userId: string,
        metadataUpdate: JSONObject,
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
