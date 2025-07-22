"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionClaim = exports.PermissionClaimClass = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const primitiveArrayClaim_1 = require("../session/claimBaseClasses/primitiveArrayClaim");
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
class PermissionClaimClass extends primitiveArrayClaim_1.PrimitiveArrayClaim {
    constructor() {
        super({
            key: "st-perm",
            async fetchValue(userId, _recipeUserId, tenantId, _currentPayload, userContext) {
                const recipe = recipe_1.default.getInstanceOrThrowError();
                // We fetch the roles because the rolesClaim may not be present in the payload
                const userRoles = await recipe.recipeInterfaceImpl.getRolesForUser({
                    userId,
                    tenantId,
                    userContext,
                });
                // We use a set to filter out duplicates
                const userPermissions = new Set();
                for (const role of userRoles.roles) {
                    const rolePermissions = await recipe.recipeInterfaceImpl.getPermissionsForRole({
                        role,
                        userContext,
                    });
                    if (rolePermissions.status === "OK") {
                        for (const perm of rolePermissions.permissions) {
                            userPermissions.add(perm);
                        }
                    }
                }
                return Array.from(userPermissions);
            },
        });
    }
}
exports.PermissionClaimClass = PermissionClaimClass;
exports.PermissionClaim = new PermissionClaimClass();
