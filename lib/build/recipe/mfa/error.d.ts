// @ts-nocheck
import STError from "../../error";
export default class MfaError extends STError {
    constructor(options: { type: "BAD_INPUT_ERROR"; message: string });
}
