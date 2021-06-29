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

import { APIGatewayProxyEventV2, APIGatewayProxyEvent } from "aws-lambda";
import { HTTPMethod } from "../types";
import { normaliseHttpMethod } from "../utils";
import { BaseRequest } from "./request";
import { normalizeHeaderValue, getCookieValueFromHeaders } from "./utils";

export class AWSRequest extends BaseRequest {
    private event: APIGatewayProxyEventV2 | APIGatewayProxyEvent;
    private parsedJSONBody: Object | undefined;

    constructor(event: APIGatewayProxyEventV2 | APIGatewayProxyEvent) {
        super();
        this.event = event;
        this.parsedJSONBody = undefined;
    }

    getKeyValueFromQuery = async (key: string): Promise<string | undefined> => {
        if (this.event.queryStringParameters === undefined || this.event.queryStringParameters === null) {
            return undefined;
        }
        let value = this.event.queryStringParameters[key];
        if (value === undefined || typeof value !== "string") {
            return undefined;
        }
        return value;
    };

    getJSONBody = async (): Promise<any> => {
        if (this.parsedJSONBody === undefined) {
            if (this.event.body === null || this.event.body === undefined) {
                this.parsedJSONBody = {};
            } else {
                this.parsedJSONBody = JSON.parse(this.event.body);
                if (this.parsedJSONBody === undefined) {
                    this.parsedJSONBody = {};
                }
            }
        }
        return this.parsedJSONBody;
    };

    getMethod = (): HTTPMethod => {
        let rawMethod = (this.event as APIGatewayProxyEvent).httpMethod;
        if (rawMethod !== undefined) {
            return normaliseHttpMethod(rawMethod);
        }
        return normaliseHttpMethod((this.event as APIGatewayProxyEventV2).requestContext.http.method);
    };

    getCookieValue = (key: string): string | undefined => {
        return getCookieValueFromHeaders(this.event.headers, key);
    };

    getHeaderValue = (key: string): string | undefined => {
        return normalizeHeaderValue(this.event.headers[key]);
    };

    getOriginalURL = (): string => {
        let path = (this.event as APIGatewayProxyEvent).requestContext.path;
        if (path === undefined) {
            path = (this.event as APIGatewayProxyEventV2).requestContext.http.path;
        }
        return path;
    };
}
