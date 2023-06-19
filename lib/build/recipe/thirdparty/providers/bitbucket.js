"use strict";
/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const custom_1 = __importDefault(require("./custom"));
function Bitbucket(input) {
    if (input.config.name === undefined) {
        input.config.name = "Bitbucket";
    }
    if (input.config.authorizationEndpoint === undefined) {
        input.config.authorizationEndpoint = "https://bitbucket.org/site/oauth2/authorize";
    }
    if (input.config.tokenEndpoint === undefined) {
        input.config.tokenEndpoint = "https://bitbucket.org/site/oauth2/access_token";
    }
    if (input.config.userInfoEndpoint === undefined) {
        input.config.userInfoEndpoint = "https://api.bitbucket.org/2.0/user";
    }
    // TODO overrides and working of this
    return custom_1.default(input);
}
exports.default = Bitbucket;
