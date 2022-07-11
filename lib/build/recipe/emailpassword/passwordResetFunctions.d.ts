// @ts-nocheck
import { User } from "./types";
import { NormalisedAppinfo } from "../../types";
export declare function getResetPasswordURL(appInfo: NormalisedAppinfo): (_: User) => Promise<string>;
export declare function createAndSendCustomEmail(
    appInfo: NormalisedAppinfo
): (user: User, passwordResetURLWithToken: string) => Promise<void>;
