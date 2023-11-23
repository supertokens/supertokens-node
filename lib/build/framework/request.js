"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRequest = void 0;
class BaseRequest {
    constructor() {
        // Note: While it's not recommended to override this method in child classes,
        // if necessary, implement a similar caching strategy to ensure that `getFormDataFromRequestBody` is called only once.
        this.getFormData = async () => {
            if (this.parsedUrlEncodedFormData === undefined) {
                this.parsedUrlEncodedFormData = await this.getFormDataFromRequestBody();
            }
            return this.parsedUrlEncodedFormData;
        };
        // Note: While it's not recommended to override this method in child classes,
        // if necessary, implement a similar caching strategy to ensure that `getJSONFromRequestBody` is called only once.
        this.getJSONBody = async () => {
            if (this.parsedJSONBody === undefined) {
                this.parsedJSONBody = await this.getJSONFromRequestBody();
            }
            return this.parsedJSONBody;
        };
        this.wrapperUsed = true;
        this.parsedJSONBody = undefined;
        this.parsedUrlEncodedFormData = undefined;
    }
}
exports.BaseRequest = BaseRequest;
