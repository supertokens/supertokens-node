import UserRoleRecipe from "./recipe";
import { PrimitiveArrayClaim } from "../session/claimBaseClasses/primitiveArrayClaim";

/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export class UserRoleClaimClass extends PrimitiveArrayClaim<string> {
    constructor() {
        super({
            key: "st-role",
            async fetchValue(userId, _recipeUserId, tenantId, _currentPayload, userContext) {
                const recipe = UserRoleRecipe.getInstanceOrThrowError();
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

export const UserRoleClaim = new UserRoleClaimClass();
