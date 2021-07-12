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

// TODO: not finished
import { HTTPMethod } from "../types";
import { normaliseHttpMethod } from "../utils";
import { BaseRequest } from "./request";
import {
    getCookieValueFromIncomingMessage,
    getHeaderValueFromIncomingMessage,
    assertThatBodyParserHasBeenUsedForExpressLikeRequest,
} from "./utils";
import { NextApiRequest } from "next";

export class NextRequest extends BaseRequest {
    private request: NextApiRequest;
    private parserChecked: boolean;

    constructor(request: NextApiRequest) {
        super();
        this.request = request;
        this.parserChecked = false;
    }

    getKeyValueFromQuery = async (key: string): Promise<string | undefined> => {
        if (!this.parserChecked) {
            await assertThatBodyParserHasBeenUsedForExpressLikeRequest(this.getMethod(), this.request);
            this.parserChecked = true;
        }
        if (this.request.query === undefined) {
            return undefined;
        }
        let value = this.request.query[key];
        if (value === undefined || typeof value !== "string") {
            return undefined;
        }
        return value;
    };

    getJSONBody = async (): Promise<any> => {
        if (!this.parserChecked) {
            await assertThatBodyParserHasBeenUsedForExpressLikeRequest(this.getMethod(), this.request);
            this.parserChecked = true;
        }
        return this.request.body;
    };

    getMethod = (): HTTPMethod => {
        return normaliseHttpMethod(this.request.method as string);
    };

    getCookieValue = (key: string): string | undefined => {
        return getCookieValueFromIncomingMessage(this.request, key);
    };

    getHeaderValue = (key: string): string | undefined => {
        return getHeaderValueFromIncomingMessage(this.request, key);
    };

    getOriginalURL = (): string => {
        return this.request.url as string;
    };
}
