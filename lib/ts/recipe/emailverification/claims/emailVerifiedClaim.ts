import { BooleanClaim } from "../../session";
import Recipe from "../recipe";

export class EmailVerifiedClaim extends BooleanClaim {
    constructor(recipeInstance: Recipe) {
        super({
            key: "st-ev",
            fetch: async (userId, userContext) => {
                // TODO: support multiple auth recipes & split out EmailVerified recipe
                try {
                    const email = await recipeInstance.config.getEmailForUserId(userId, userContext);
                    return recipeInstance.recipeInterfaceImpl.isEmailVerified({ userId, email, userContext });
                } catch {
                    return undefined;
                }
            },
        });
    }
}
