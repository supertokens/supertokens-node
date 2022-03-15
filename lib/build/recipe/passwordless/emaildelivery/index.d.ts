// @ts-nocheck
import { TypePasswordlessEmailDeliveryTypeInput } from "../types";
export declare function normaliseAndInvokeDefaultCreateAndSendCustomEmail(
    input: TypePasswordlessEmailDeliveryTypeInput,
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
): Promise<void>;
