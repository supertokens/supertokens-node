import { PrimitiveClaim } from "../session/claims";
import { SessionContainerInterface } from "../session/types";
import AccountLinking from "./";

class AccountLinkingClaimClass extends PrimitiveClaim<string> {
    constructor() {
        super({
            key: "st-linking",
            fetchValue(_, __, ___) {
                // We return undefined here cause we have no way of knowing which recipeId
                // this primary user will need to be linked with. We know this value only
                // when we want to set this claim in the actual API, and we can use
                // session.setClaimValue(..) for that.
                return undefined;
            },
        });
    }

    // this is a utility function which should be used for this claim instead of the get claim
    // value cause this checks with the db before returning the value, and we always want an
    // up to date value.
    resyncAndGetValue = async (session: SessionContainerInterface, userContext: any): Promise<string | undefined> => {
        let fromSession = await session.getClaimValue(AccountLinkingClaim, userContext);
        if (fromSession === undefined) {
            return undefined;
        }

        let primaryUserToLinkTo = await AccountLinking.fetchFromAccountToLinkTable(fromSession, userContext);
        if (primaryUserToLinkTo === undefined || primaryUserToLinkTo !== session.getUserId()) {
            // this means that this session has stale data about which account to
            // link to. So we remove the claim
            await session.removeClaim(AccountLinkingClaim);
            return undefined;
        }

        // we return the actual value from the claim since we know it is up to date with the db.
        return fromSession;
    };
}

export const AccountLinkingClaim = new AccountLinkingClaimClass();
