"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const userroles_1 = __importDefault(require("../../../../userroles"));
const error_1 = __importDefault(require("../../../../../error"));
const recipe_1 = __importDefault(require("../../../../userroles/recipe"));
const getAllRoles = async (_, __, options, ____) => {
    try {
        recipe_1.default.getInstanceOrThrowError();
    } catch (_) {
        return {
            status: "FEATURE_NOT_ENABLED_ERROR",
        };
    }
    //results with pagination and permissions assoicated with a role.
    if (
        options.req.getKeyValueFromQuery("limit") !== undefined &&
        options.req.getKeyValueFromQuery("page") !== undefined
    ) {
        const limit = Number(options.req.getKeyValueFromQuery("limit"));
        let page = Number(options.req.getKeyValueFromQuery("page"));
        if (isNaN(limit) === true) {
            throw new error_1.default({
                message: "Missing required parameter 'limit' or invalid type",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        if (isNaN(page) === true) {
            throw new error_1.default({
                message: "Missing required parameter 'page' or invalid type",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        //set default page number to 1 if the page number is negitive or zero
        if (page <= 0) {
            page = 1;
        }
        const skip = limit * (page - 1);
        const response = await userroles_1.default.getAllRoles();
        const totalPages = Math.ceil(response.roles.length / limit);
        const totalRolesCount = response.roles.length;
        //reversing the roles to show latest created roles at first.
        const paginatedRoles = response.roles.reverse().slice(skip, skip + limit);
        let roles = [];
        for (let i = 0; i < paginatedRoles.length; i++) {
            const role = paginatedRoles[i];
            try {
                const res = await userroles_1.default.getPermissionsForRole(role);
                if (res.status === "OK") {
                    roles.push({
                        role,
                        permissions: res.permissions,
                    });
                } else {
                    //this case should never happen.
                    throw new Error("Should never come here.");
                }
            } catch (_) {}
        }
        return {
            roles,
            totalPages,
            totalRolesCount,
            status: "OK",
        };
    } else {
        const response = await userroles_1.default.getAllRoles();
        //reversing the roles to show latest created roles at first.
        return {
            status: "OK",
            roles: response.roles.reverse(),
        };
    }
};
exports.default = getAllRoles;
