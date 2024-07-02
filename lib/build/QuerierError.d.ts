// @ts-nocheck
export declare class QuerierError extends Error {
    statusCodeFromCore: number;
    errorMessageFromCore: string;
    constructor(message: string, statusCode: number, errorMessageFromCore: string);
}
