// @ts-nocheck
import { TypeThirdPartyPasswordlessEmailDeliveryInput } from "../../../types";
import { NormalisedAppinfo, UserContext } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeThirdPartyPasswordlessEmailDeliveryInput> {
    private passwordlessBackwardCompatibilityService;
    constructor(appInfo: NormalisedAppinfo);
    sendEmail: (
        input: TypeThirdPartyPasswordlessEmailDeliveryInput & {
            userContext: UserContext;
        }
    ) => Promise<void>;
}
