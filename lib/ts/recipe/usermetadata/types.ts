/* Copyright (c) 2022, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

import OverrideableBuilder from "supertokens-js-override";
import { JSONObject } from "../../types";

export type TypeInput = {
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type APIInterface = {};

export type RecipeInterface = {
    getUserMetadata: (input: {
        userId: string;
        userContext: any;
    }) => Promise<{
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
    updateUserMetadata: (input: {
        userId: string;
        metadataUpdate: JSONObject;
        userContext: any;
    }) => Promise<{
        status: "OK";
        metadata: JSONObject;
    }>;

    // same as updateUserMetadata, but used internally. As of now for multifactorauth.
    updateUserMetadataInternal: (input: {
        userId: string;
        metadataUpdate: JSONObject;
        userContext: any;
    }) => Promise<{
        status: "OK";
        metadata: JSONObject;
    }>;

    clearUserMetadata: (input: {
        userId: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
    }>;
};
