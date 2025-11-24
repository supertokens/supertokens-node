// @ts-nocheck
import { TypeEmailVerificationEmailDeliveryInput } from "../../../types";
import { NormalisedAppinfo, UserContext } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeEmailVerificationEmailDeliveryInput>
{
    private appInfo;
    private isInServerlessEnv;
    constructor(appInfo: NormalisedAppinfo, isInServerlessEnv: boolean);
    sendEmail: (
        input: TypeEmailVerificationEmailDeliveryInput & {
            userContext: UserContext;
        }
    ) => Promise<void>;
}
