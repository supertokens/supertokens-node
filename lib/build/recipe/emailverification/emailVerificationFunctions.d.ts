// @ts-nocheck
import { UserEmailInfo } from "./types";
import { NormalisedAppinfo } from "../../types";
export declare function createAndSendEmailUsingSupertokensService(
    appInfo: NormalisedAppinfo,
    user: UserEmailInfo,
    emailVerifyURLWithToken: string
): Promise<void>;
