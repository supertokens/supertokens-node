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
export { BaseRequest } from "./request";
export { BaseResponse } from "./response";

import * as expressFramework from "./express";
import * as fastifyFramework from "./fastify";
import * as hapiFramework from "./hapi";
import * as loopbackFramework from "./loopback";
import * as koaFramework from "./koa";
import * as awsLambdaFramework from "./awsLambda";
import * as h3Framework from "./h3";

export default {
    express: expressFramework,
    fastify: fastifyFramework,
    hapi: hapiFramework,
    loopback: loopbackFramework,
    koa: koaFramework,
    awsLambda: awsLambdaFramework,
    h3: h3Framework,
};

export let express = expressFramework;
export let fastify = fastifyFramework;
export let hapi = hapiFramework;
export let loopback = loopbackFramework;
export let koa = koaFramework;
export let awsLambda = awsLambdaFramework;
export let h3 = h3Framework;
