"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const userroles_1 = __importDefault(require("../../../../userroles"));
const getAllRoles = async (_, __, ___, ____) => {
    const response = await userroles_1.default.getAllRoles();
    let roles = [];
    for (let i = 0; i < response.roles.length; i++) {
        const role = response.roles[i];
        try {
            const res = await userroles_1.default.getPermissionsForRole(role);
            if (res.status === "OK") {
                roles.push({
                    role,
                    permissions: res.permissions,
                });
            }
        } catch (_) {}
    }
    return {
        roles,
        status: "OK",
    };
};
exports.default = getAllRoles;
