// @ts-nocheck
import { VerifySessionOptions } from "..";
import { SessionRequest } from "../../../framework/fastify/framework";
import { FastifyReply } from "fastify";
export declare function verifySession(
    options?: VerifySessionOptions
): (req: SessionRequest, res: FastifyReply) => Promise<void>;
