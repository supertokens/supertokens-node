/**
 * Define fastify types based on the parts that are used in the codebase.
 */

export interface FastifyRequest {
    body: any
    query: Record<string, string | string[] | undefined>
    headers: Record<string, string | string[] | undefined>
    method: string
    url: string
};

export interface FastifyReply {
    sent: boolean
    getHeaders(): Record<string, number | string | string[] | undefined>;
}
