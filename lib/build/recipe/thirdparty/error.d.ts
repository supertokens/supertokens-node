// @ts-nocheck
import STError from "../../error";
export default class ThirdPartyError extends STError {
    constructor(options: { type: "BAD_INPUT_ERROR"; message: string });
}
export declare class ClientTypeNotFoundError extends STError {
    constructor(options: { type: "CLIENT_TYPE_NOT_FOUND_ERROR"; message: string });
}
