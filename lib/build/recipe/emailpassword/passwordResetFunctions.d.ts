// @ts-nocheck
import { NormalisedAppinfo } from "../../types";
export declare function createAndSendCustomEmail(
    appInfo: NormalisedAppinfo
): (
    user: {
        id: string;
        email: string;
    },
    passwordResetURLWithToken: string
) => Promise<void>;
