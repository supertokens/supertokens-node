/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
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

import { HTTPMethod } from "../types";

interface Request {
    getKeyValueFromQuery: (key: string) => Promise<undefined | string>;

    getJSONBody: () => Promise<Object>;

    getMethod: () => HTTPMethod;

    getCookieValue: (key: string) => undefined | string;

    getHeaderValue: (key: string) => undefined | string;

    getOriginalURL: () => string;
}

export abstract class BaseRequest implements Request {
    wrapperUsed: boolean;
    constructor() {
        this.wrapperUsed = true;
    }
    abstract getKeyValueFromQuery: (key: string) => Promise<string | undefined>;
    abstract getJSONBody: () => Promise<any>;
    abstract getMethod: () => HTTPMethod;
    abstract getCookieValue: (key_: string) => string | undefined;
    abstract getHeaderValue: (key: string) => string | undefined;
    abstract getOriginalURL: () => string;
}
