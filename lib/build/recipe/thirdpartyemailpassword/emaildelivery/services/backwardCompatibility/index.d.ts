// @ts-nocheck
import { TypeThirdPartyEmailPasswordEmailDeliveryInput } from "../../../types";
import { NormalisedAppinfo, UserContext } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeThirdPartyEmailPasswordEmailDeliveryInput> {
    private emailPasswordBackwardCompatibilityService;
    constructor(appInfo: NormalisedAppinfo, isInServerlessEnv: boolean);
    sendEmail: (
        input: TypeThirdPartyEmailPasswordEmailDeliveryInput & {
            userContext: UserContext;
        }
    ) => Promise<void>;
}
