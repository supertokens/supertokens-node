// @ts-nocheck
import { VerifySessionOptions } from "..";
import { SessionRequest } from "../../../framework/fastify/framework";
import { FastifyReply, FastifyRequest as OriginalFastifyRequest } from "fastify";
export declare function verifySession<TRequest extends OriginalFastifyRequest = OriginalFastifyRequest>(
    options?: VerifySessionOptions
): (req: SessionRequest<TRequest>, res: FastifyReply) => Promise<void>;
