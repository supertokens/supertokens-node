"use strict";
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              Object.defineProperty(o, k2, {
                  enumerable: true,
                  get: function () {
                      return m[k];
                  },
              });
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
          });
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, "default", { enumerable: true, value: v });
          }
        : function (o, v) {
              o["default"] = v;
          });
var __importStar =
    (this && this.__importStar) ||
    function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.awsLambda = exports.koa = exports.loopback = exports.hapi = exports.fastify = exports.express = exports.BaseResponse = exports.BaseRequest = void 0;
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
Object.defineProperty(exports, "BaseRequest", {
    enumerable: true,
    get: function () {
        return request_1.BaseRequest;
    },
});
var response_1 = require("./response");
Object.defineProperty(exports, "BaseResponse", {
    enumerable: true,
    get: function () {
        return response_1.BaseResponse;
    },
});
const expressFramework = __importStar(require("./express"));
const fastifyFramework = __importStar(require("./fastify"));
const hapiFramework = __importStar(require("./hapi"));
const loopbackFramework = __importStar(require("./loopback"));
const koaFramework = __importStar(require("./koa"));
const awsLambdaFramework = __importStar(require("./awsLambda"));
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
