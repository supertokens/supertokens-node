// @ts-nocheck
/// <reference types="node" />
export type { SessionRequest } from "./framework";
export declare const plugin: import("fastify").FastifyPluginCallback<
    Record<never, never>,
    import("fastify").RawServerDefault
>;
export declare const errorHandler: () => (
    err: any,
    req: import("fastify").FastifyRequest<
        import("fastify/types/route").RouteGenericInterface,
        import("fastify").RawServerDefault,
        import("http").IncomingMessage
    >,
    res: import("fastify").FastifyReply<
        import("fastify").RawServerDefault,
        import("http").IncomingMessage,
        import("http").ServerResponse<import("http").IncomingMessage>,
        import("fastify/types/route").RouteGenericInterface,
        unknown
    >
) => Promise<void>;
export declare const wrapRequest: (unwrapped: any) => import("..").BaseRequest;
export declare const wrapResponse: (unwrapped: any) => import("..").BaseResponse;
