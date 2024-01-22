"use strict";
var __rest =
    (this && this.__rest) ||
    function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
            }
        return t;
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
const error_1 = __importDefault(require("../../../../error"));
async function createOrUpdateTenant(_, __, options, userContext) {
    const requestBody = await options.req.getJSONBody();
    const { tenantId } = requestBody,
        config = __rest(requestBody, ["tenantId"]);
    if (typeof tenantId !== "string" || tenantId === "") {
        throw new error_1.default({
            message: "Missing required parameter 'tenantId'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    let tenantRes;
    try {
        tenantRes = await multitenancy_1.default.createOrUpdateTenant(tenantId, config, userContext);
    } catch (err) {
        const errMessage = err.message;
        if (
            errMessage.includes("tenantId can only contain letters, numbers and hyphens") ||
            errMessage.includes("tenantId must not start with 'appid-'") ||
            errMessage.includes(`Cannot use '${tenantId}' as a tenantId`)
        ) {
            return {
                status: "INVALID_TENANT_ID",
                message: errMessage,
            };
        }
        return {
            status: "UNKNOWN_TENANT_ERROR",
            message: errMessage,
        };
    }
    return tenantRes;
}
exports.default = createOrUpdateTenant;