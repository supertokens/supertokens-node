// @ts-nocheck
import { TypePasswordlessEmailDeliveryTypeInput } from "../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
import { NormalisedAppinfo } from "../../../../../types";
export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypePasswordlessEmailDeliveryTypeInput> {
    private createAndSendCustomEmail;
    private appInfo;
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
        input: TypePasswordlessEmailDeliveryTypeInput & {
            userContext: any;
        }
    ) => Promise<void>;
}
