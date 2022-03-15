// @ts-nocheck
import { TypeEmailVerificationEmailDeliveryInput, User } from "../types";
import { NormalisedAppinfo } from "../../../types";
export declare function normaliseAndInvokeDefaultCreateAndSendCustomEmail(
    appInfo: NormalisedAppinfo,
    input: TypeEmailVerificationEmailDeliveryInput,
    isInServerlessEnv: boolean,
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string, userContext: any) => Promise<void>
): Promise<void>;
