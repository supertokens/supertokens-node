// @ts-nocheck
import * as expressFramework from "./express";
import * as fastifyFramework from "./fastify";
import * as hapiFramework from "./hapi";
import * as loopbackFramework from "./loopback";
import * as koaFramework from "./koa";
import * as awsLambdaFramework from "./awsLambda";
declare const _default: {
    express: typeof expressFramework;
    fastify: typeof fastifyFramework;
    hapi: typeof hapiFramework;
    loopback: typeof loopbackFramework;
    koa: typeof koaFramework;
    awsLambda: typeof awsLambdaFramework;
};
export default _default;
export declare let express: typeof expressFramework;
export declare let fastify: typeof fastifyFramework;
export declare let hapi: typeof hapiFramework;
export declare let loopback: typeof loopbackFramework;
export declare let koa: typeof koaFramework;
export declare let awsLambda: typeof awsLambdaFramework;
