/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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

import RecipeModule from "./recipeModule";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";

export type AppInfo = {
    appName: string;
    websiteDomain: string;
    apiDomain: string;
    apiBasePath?: string;
    websiteBasePath?: string;
};

export type NormalisedAppinfo = {
    appName: string;
    websiteDomain: NormalisedURLDomain;
    apiDomain: NormalisedURLDomain;
    apiBasePath: NormalisedURLPath;
    websiteBasePath: NormalisedURLPath;
};

export type TypeInput = {
    supertokens: {
        connectionURI: string;
        apiKey: string;
    };
    appInfo: AppInfo;
    recipeList: RecipeListFunction[];
};

export type RecipeListFunction = (appInfo: NormalisedAppinfo) => RecipeModule;

export type APIHandled = {
    pathWithoutApiBasePath: NormalisedURLPath;
    method: HTTPMethod;
    id: string;
    disabled: boolean;
};

export type HTTPMethod = "post" | "get" | "delete" | "put" | "options" | "trace";
