// @ts-nocheck
import { NormalisedAppinfo } from "../../types";
export declare function createAndSendCustomEmail(
    appInfo: NormalisedAppinfo
): (
    user: {
        id: string;
        recipeUserId?: string | undefined;
        email: string;
        timeJoined: number;
    },
    passwordResetURLWithToken: string
) => Promise<void>;
