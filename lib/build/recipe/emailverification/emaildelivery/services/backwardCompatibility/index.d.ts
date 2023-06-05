import { TypeEmailVerificationEmailDeliveryInput } from "../../../types";
import { NormalisedAppinfo } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeEmailVerificationEmailDeliveryInput> {
    private appInfo;
    private isInServerlessEnv;
    private createAndSendCustomEmail;
    constructor(appInfo: NormalisedAppinfo, isInServerlessEnv: boolean);
    sendEmail: (
        input: TypeEmailVerificationEmailDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
