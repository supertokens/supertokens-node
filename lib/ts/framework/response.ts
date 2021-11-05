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

export abstract class BaseResponse {
    wrapperUsed: boolean;
    original: any;
    constructor() {
        this.wrapperUsed = true;
    }
    abstract setHeader: (key: string, value: string, allowDuplicateKey: boolean) => void;
    abstract setCookie: (
        key: string,
        value: string,
        domain: string | undefined,
        secure: boolean,
        httpOnly: boolean,
        expires: number,
        path: string,
        sameSite: "strict" | "lax" | "none"
    ) => void;
    abstract setStatusCode: (statusCode: number) => void;
    abstract sendJSONResponse: (content: any) => void;
    abstract sendHTMLResponse: (html: string) => void;
}
