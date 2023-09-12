// @ts-nocheck
import STError from "../../error";
export default class DashboardError extends STError {
    static OPERATION_NOT_ALLOWED: "OPERATION_NOT_ALLOWED";
    constructor(message?: string);
}
