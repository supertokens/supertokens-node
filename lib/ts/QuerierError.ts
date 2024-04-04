export class QuerierError extends Error {
    statusCode: number;
    errorMessageFromCore: string;

    constructor(message: string, statusCode: number, errorMessageFromCore: string) {
        super(message);
        this.statusCode = statusCode;
        this.errorMessageFromCore = errorMessageFromCore;
        if (Error.captureStackTrace) {
            // This excludes QuerierError from the stack trace.
            // Ref: https://v8.dev/docs/stack-trace-api#stack-trace-collection-for-custom-exceptions
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
