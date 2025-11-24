// @ts-nocheck
import { VerifySessionOptions } from "..";
import { SessionRequest } from "../../../framework/fastify/framework";
import { FastifyReply, FastifyRequest as OriginalFastifyRequest } from "../../../framework/fastify/types";
export declare function verifySession<TRequest extends OriginalFastifyRequest = OriginalFastifyRequest>(
    options?: VerifySessionOptions
): (req: SessionRequest<TRequest>, res: FastifyReply) => Promise<void>;
