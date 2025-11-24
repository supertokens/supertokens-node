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
exports.default = createTenant;
const multitenancy_1 = __importDefault(require("../../../multitenancy"));
const error_1 = __importDefault(require("../../../../error"));
async function createTenant(_, __, options, userContext) {
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
        const errMsg = err.message;
        if (errMsg.includes("SuperTokens core threw an error for a ")) {
            if (errMsg.includes("with status code: 402")) {
                return {
                    status: "MULTITENANCY_NOT_ENABLED_IN_CORE_ERROR",
                };
            }
            if (errMsg.includes("with status code: 400")) {
                return {
                    status: "INVALID_TENANT_ID_ERROR",
                    message: errMsg.split(" and message: ")[1],
                };
            }
        }
        throw err;
    }
    if (tenantRes.createdNew === false) {
        return {
            status: "TENANT_ID_ALREADY_EXISTS_ERROR",
        };
    }
    return tenantRes;
}
