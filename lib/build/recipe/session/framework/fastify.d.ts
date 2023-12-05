// @ts-nocheck
import { VerifySessionOptions } from "..";
import { SessionRequest } from "../../../framework/fastify/framework";
import { FastifyReply, FastifyRequest as OriginalFastifyRequest } from "fastify";
export declare function verifySession<T extends OriginalFastifyRequest>(
    options?: VerifySessionOptions
): (req: SessionRequest<T>, res: FastifyReply) => Promise<void>;
