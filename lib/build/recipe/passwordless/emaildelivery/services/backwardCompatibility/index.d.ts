// @ts-nocheck
import { TypePasswordlessEmailDeliveryTypeInput } from "../../../types";
import { EmailDeliveryInterface } from "../../../../../ingredients/emaildelivery/types";
export default class BackwardCompatibilityService
    implements EmailDeliveryInterface<TypePasswordlessEmailDeliveryTypeInput> {
    private isInServerlessEnv;
    private createAndSendCustomEmail;
    constructor(
        isInServerlessEnv: boolean,
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
