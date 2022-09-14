// @ts-nocheck
import { User } from "./types";
import { NormalisedAppinfo } from "../../types";
export declare function createAndSendCustomEmail(
    appInfo: NormalisedAppinfo
): (user: User, emailVerifyURLWithToken: string) => Promise<void>;
