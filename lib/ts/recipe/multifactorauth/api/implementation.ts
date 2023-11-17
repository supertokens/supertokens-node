import { APIInterface } from "../";
import { getUser } from "../../..";

export default function getAPIInterface(): APIInterface {
    return {
        mfaInfoGET: async ({ options, session, userContext }) => {
            const userId = session.getUserId();
            const tenantId = session.getTenantId();
            const user = await getUser(userId, userContext);

            if (user === undefined) {
                throw new Error("Unknown User ID provided");
            }

            const alreadySetup = await options.recipeImplementation.getFactorsSetupForUser({
                tenantId,
                user,
                userContext,
            });

            const availableFactors = await options.recipeImplementation.getAllAvailableFactorIds({ userContext });

            return {
                status: "OK",
                factors: {
                    isAllowedToSetup: availableFactors,
                    isAlreadySetup: alreadySetup,
                },
            };
        },
    };
}
