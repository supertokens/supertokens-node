// @ts-nocheck
/// <reference types="node" />
import { VerifySessionOptions } from "..";
import { SessionRequest } from "../../../framework/fastify/framework";
import { FastifyReply } from "fastify";
export declare function verifySession(
    options?: VerifySessionOptions
): (
    req: SessionRequest,
    res: FastifyReply<
        import("http").Server,
        import("http").IncomingMessage,
        import("http").ServerResponse,
        import("fastify/types/route").RouteGenericInterface,
        unknown
    >
) => Promise<void>;
