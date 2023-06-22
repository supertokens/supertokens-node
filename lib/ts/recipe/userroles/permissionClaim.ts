import UserRoleRecipe from "./recipe";
import { PrimitiveArrayClaim } from "../session/claimBaseClasses/primitiveArrayClaim";

/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export class PermissionClaimClass extends PrimitiveArrayClaim<string> {
    constructor() {
        super({
            key: "st-perm",
            async fetchValue(userId, _, userContext) {
                const recipe = UserRoleRecipe.getInstanceOrThrowError();

                // We fetch the roles because the rolesClaim may not be present in the payload
                const userRoles = await recipe.recipeInterfaceImpl.getRolesForUser({
                    userId,
                    userContext,
                });

                // We use a set to filter out duplicates
                const userPermissions = new Set<string>();
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
            defaultMaxAgeInSeconds: 300,
        });
    }
}

export const PermissionClaim = new PermissionClaimClass();
