"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoleClaim = exports.UserRoleClaimClass = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const primitiveArrayClaim_1 = require("../session/claimBaseClasses/primitiveArrayClaim");
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
class UserRoleClaimClass extends primitiveArrayClaim_1.PrimitiveArrayClaim {
    constructor() {
        super({
            key: "st-role",
            async fetchValue(userId, _recipeUserId, tenantId, _currentPayload, userContext) {
                const recipe = recipe_1.default.getInstanceOrThrowError();
                const res = await recipe.recipeInterfaceImpl.getRolesForUser({
                    userId,
                    tenantId,
                    userContext,
                });
                return res.roles;
            },
        });
    }
}
exports.UserRoleClaimClass = UserRoleClaimClass;
exports.UserRoleClaim = new UserRoleClaimClass();
