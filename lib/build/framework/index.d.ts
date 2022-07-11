// @ts-nocheck
export { BaseRequest } from "./request";
export { BaseResponse } from "./response";
import * as expressFramework from "./express";
import * as fastifyFramework from "./fastify";
import * as hapiFramework from "./hapi";
import * as loopbackFramework from "./loopback";
import * as koaFramework from "./koa";
import * as awsLambdaFramework from "./awsLambda";
import * as h3Framework from "./h3";
declare const _default: {
    express: typeof expressFramework;
    fastify: typeof fastifyFramework;
    hapi: typeof hapiFramework;
    loopback: typeof loopbackFramework;
    koa: typeof koaFramework;
    awsLambda: typeof awsLambdaFramework;
    h3: typeof h3Framework;
};
export default _default;
export declare let express: typeof expressFramework;
export declare let fastify: typeof fastifyFramework;
export declare let hapi: typeof hapiFramework;
export declare let loopback: typeof loopbackFramework;
export declare let koa: typeof koaFramework;
export declare let awsLambda: typeof awsLambdaFramework;
export declare let h3: typeof h3Framework;
