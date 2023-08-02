// @ts-nocheck
import { TypeThirdPartyEmailPasswordEmailDeliveryInput } from "../../../types";
import { NormalisedAppinfo } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeThirdPartyEmailPasswordEmailDeliveryInput> {
    private emailPasswordBackwardCompatibilityService;
    constructor(appInfo: NormalisedAppinfo, isInServerlessEnv: boolean);
    sendEmail: (
        input: TypeThirdPartyEmailPasswordEmailDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
