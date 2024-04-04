// @ts-nocheck
export declare class QuerierError extends Error {
    statusCode: number;
    errorMessageFromCore: string;
    constructor(message: string, statusCode: number, errorMessageFromCore: string);
}
