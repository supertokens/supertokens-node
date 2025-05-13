// @ts-nocheck
import { TypeWebauthnEmailDeliveryInput } from "../../../types";
import { NormalisedAppinfo, UserContext } from "../../../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class BackwardCompatibilityService implements EmailDeliveryInterface<TypeWebauthnEmailDeliveryInput> {
    private isInServerlessEnv;
    private appInfo;
    constructor(appInfo: NormalisedAppinfo, isInServerlessEnv: boolean);
    sendEmail: (
        input: TypeWebauthnEmailDeliveryInput & {
            userContext: UserContext;
        }
    ) => Promise<void>;
}
