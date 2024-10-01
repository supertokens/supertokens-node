/**
 * Define fastify types based on the parts that are used in the codebase.
 */

export interface FastifyRequest {
    body: any;
    query: unknown;
    headers: Record<string, string | string[] | undefined>;
    method: string;
    url: string;
}

export interface FastifyReply {
    sent: boolean;
    statusCode: number;
    getHeaders(): Record<string, number | string | string[] | undefined>;
    send(payload?: any): FastifyReply;
    header(key: any, value: any): FastifyReply;
    removeHeader(key: string): void;
    getHeader(key: any): number | string | string[] | undefined;
    type(contentType: string): FastifyReply;
}

export interface FastifyInstance {
    addHook(name: string, hook: (req: FastifyRequest, reply: FastifyReply) => void): FastifyInstance;
}

export type FastifyPluginCallback = (instance: FastifyInstance, opts: any, done: (err?: Error) => void) => void;
