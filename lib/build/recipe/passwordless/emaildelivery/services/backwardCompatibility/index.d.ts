// @ts-nocheck
import { TypePasswordlessEmailDeliveryInput } from "../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
import { NormalisedAppinfo } from "../../../../../types";
export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypePasswordlessEmailDeliveryInput> {
    private createAndSendCustomEmail;
    constructor(
        appInfo: NormalisedAppinfo,
        createAndSendCustomEmail?: (
            input: {
                email: string;
                userInputCode?: string;
                urlWithLinkCode?: string;
                codeLifetime: number;
                preAuthSessionId: string;
            },
            userContext: any
        ) => Promise<void>
    );
    sendEmail: (
        input: TypePasswordlessEmailDeliveryInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
