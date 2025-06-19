// @ts-nocheck
export type { SessionRequest } from "./framework";
export declare const plugin: import("./types").FastifyPluginCallback<import("./types").FastifyInstance<
    unknown,
    import("./types").FastifyRequest,
    import("./types").FastifyReply
>>;
export declare const errorHandler: () => (
    err: any,
    req: import("./types").FastifyRequest,
    res: import("./types").FastifyReply
) => Promise<void>;
export declare const wrapRequest: (unwrapped: any) => import("..").BaseRequest;
export declare const wrapResponse: (unwrapped: any) => import("..").BaseResponse;
