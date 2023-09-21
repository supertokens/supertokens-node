// @ts-nocheck
import { TypeEmailPasswordEmailDeliveryInput } from "../../../types";
import { NormalisedAppinfo } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypeEmailPasswordEmailDeliveryInput> {
    private isInServerlessEnv;
    private appInfo;
    constructor(appInfo: NormalisedAppinfo, isInServerlessEnv: boolean);
    sendEmail: (
        input: TypeEmailPasswordEmailDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
