// @ts-nocheck
import { TypePasswordlessEmailDeliveryInput } from "../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
import { NormalisedAppinfo, UserContext } from "../../../../../types";
export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypePasswordlessEmailDeliveryInput>
{
    private appInfo;
    constructor(appInfo: NormalisedAppinfo);
    sendEmail: (
        input: TypePasswordlessEmailDeliveryInput & {
            userContext: UserContext;
        }
    ) => Promise<void>;
}
