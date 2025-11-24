// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
import { JSONObject, UserContext } from "../../types";
export type TypeInput = {
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export type TypeNormalisedInput = {
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export type APIInterface = {};
export type RecipeInterface = {
    getUserMetadata: (input: { userId: string; userContext: UserContext }) => Promise<{
        status: "OK";
        metadata: any;
    }>;
    /**
     * Updates the metadata object of the user by doing a shallow merge of the stored and the update JSONs
     * and removing properties set to null on the root level of the update object.
     * e.g.:
     *   - stored: `{ "preferences": { "theme":"dark" }, "notifications": { "email": true }, "todos": ["example"] }`
     *   - update: `{ "notifications": { "sms": true }, "todos": null }`
     *   - result: `{ "preferences": { "theme":"dark" }, "notifications": { "sms": true } }`
     */
    updateUserMetadata: (input: { userId: string; metadataUpdate: JSONObject; userContext: UserContext }) => Promise<{
        status: "OK";
        metadata: JSONObject;
    }>;
    clearUserMetadata: (input: { userId: string; userContext: UserContext }) => Promise<{
        status: "OK";
    }>;
};
