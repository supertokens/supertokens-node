"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const recipe_1 = require("./recipe");
const primitiveArrayClaim_1 = require("../session/claimBaseClasses/primitiveArrayClaim");
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
class PermissionClaimClass extends primitiveArrayClaim_1.PrimitiveArrayClaim {
    constructor() {
        super({
            key: "st-perm",
            fetchValue(userId, userContext) {
                return __awaiter(this, void 0, void 0, function* () {
                    const recipe = recipe_1.default.getInstanceOrThrowError();
                    // We fetch the roles because the rolesClaim may not be present in the payload
                    const userRoles = yield recipe.recipeInterfaceImpl.getRolesForUser({
                        userId,
                        userContext,
                    });
                    // We use a set to filter out duplicates
                    const userPermissions = new Set();
                    for (const role of userRoles.roles) {
                        const rolePermissions = yield recipe.recipeInterfaceImpl.getPermissionsForRole({
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
                });
            },
            defaultMaxAgeInSeconds: 300,
        });
    }
}
exports.PermissionClaimClass = PermissionClaimClass;
exports.PermissionClaim = new PermissionClaimClass();
