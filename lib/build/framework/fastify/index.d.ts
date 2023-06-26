// @ts-nocheck
/// <reference types="node" />
export type { SessionRequest } from "./framework";
export declare const plugin: import("fastify").FastifyPluginCallback<Record<never, never>, import("http").Server>;
export declare const errorHandler: () => (
    err: any,
    req: import("fastify").FastifyRequest<
        import("fastify/types/route").RouteGenericInterface,
        import("http").Server,
        import("http").IncomingMessage
    >,
    res: import("fastify").FastifyReply<
        import("http").Server,
        import("http").IncomingMessage,
        import("http").ServerResponse,
        import("fastify/types/route").RouteGenericInterface,
        unknown
    >
) => Promise<void>;
export declare const wrapRequest: (unwrapped: any) => import("..").BaseRequest;
export declare const wrapResponse: (unwrapped: any) => import("..").BaseResponse;
