// @ts-nocheck
import STError from "../../error";
export default class TotpError extends STError {
    static TOTP_NOT_ENABLED_ERROR: "TOTP_NOT_ENABLED_ERROR";
    constructor(options: { type: "BAD_INPUT_ERROR" | "TOTP_NOT_ENABLED_ERROR"; message: string });
}
