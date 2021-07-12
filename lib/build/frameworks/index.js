"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
var request_1 = require("./request");
exports.BaseRequest = request_1.BaseRequest;
var response_1 = require("./response");
exports.BaseResponse = response_1.BaseResponse;
const express_1 = require("./express");
const fastify_1 = require("./fastify");
const hapi_1 = require("./hapi");
const loopback_1 = require("./loopback");
const koa_1 = require("./koa");
const awsLambda_1 = require("./awsLambda");
exports.default = {
    express: express_1.default,
    fastify: fastify_1.default,
    hapi: hapi_1.default,
    loopback: loopback_1.default,
    koa: koa_1.default,
    awsLambda: awsLambda_1.default,
};
//# sourceMappingURL=index.js.map
