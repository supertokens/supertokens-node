// @ts-nocheck
import { NormalisedAppinfo } from "../../types";
export declare function createAndSendEmailUsingSupertokensService(
    appInfo: NormalisedAppinfo,
    user: {
        id: string;
        email: string;
    },
    passwordResetURLWithToken: string
): Promise<void>;
