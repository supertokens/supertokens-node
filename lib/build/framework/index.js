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
const expressFramework = require("./express");
const fastifyFramework = require("./fastify");
const hapiFramework = require("./hapi");
const loopbackFramework = require("./loopback");
const koaFramework = require("./koa");
const awsLambdaFramework = require("./awsLambda");
exports.default = {
    express: expressFramework,
    fastify: fastifyFramework,
    hapi: hapiFramework,
    loopback: loopbackFramework,
    koa: koaFramework,
    awsLambda: awsLambdaFramework,
};
exports.express = expressFramework;
exports.fastify = fastifyFramework;
exports.hapi = hapiFramework;
exports.loopback = loopbackFramework;
exports.koa = koaFramework;
exports.awsLambda = awsLambdaFramework;
