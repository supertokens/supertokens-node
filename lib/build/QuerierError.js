"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuerierError = void 0;
class QuerierError extends Error {
    constructor(message, statusCode, errorMessageFromCore) {
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
exports.QuerierError = QuerierError;
