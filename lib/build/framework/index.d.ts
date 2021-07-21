export { BaseRequest } from "./request";
export { BaseResponse } from "./response";
declare const _default: {
    express: import("./express/framework").ExpressFramework;
    fastify: import("./fastify/framework").FasitfyFramework;
    hapi: import("./hapi/framework").HapiFramework;
    loopback: import("./loopback/framework").LoopbackFramework;
    koa: import("./koa/framework").KoaFramework;
    awsLambda: import("./awsLambda/framework").AWSFramework;
};
export default _default;
export declare let express: import("./express/framework").ExpressFramework;
export declare let fastify: import("./fastify/framework").FasitfyFramework;
export declare let hapi: import("./hapi/framework").HapiFramework;
export declare let loopback: import("./loopback/framework").LoopbackFramework;
export declare let koa: import("./koa/framework").KoaFramework;
export declare let awsLambda: import("./awsLambda/framework").AWSFramework;
