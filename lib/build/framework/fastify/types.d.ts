// @ts-nocheck
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
export interface FastifyInstance<
    Instance = unknown,
    Request extends FastifyRequest = FastifyRequest,
    Reply extends FastifyReply = FastifyReply
> {
    addHook(this: Instance, name: string, hook: (req: Request, reply: Reply) => void): Instance;
}
export type FastifyPluginCallback<Instance = FastifyInstance> = (
    instance: Instance,
    opts: unknown,
    done: (err?: Error) => void
) => void;
