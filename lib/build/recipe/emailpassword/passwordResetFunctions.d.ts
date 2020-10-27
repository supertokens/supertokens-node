import { User } from "./types";
import { NormalisedAppinfo } from "../../types";
export declare function getResetPasswordURL(appInfo: NormalisedAppinfo): (ignored: User) => Promise<string>;
export declare function createAndSendCustomEmail(user: User, passwordResetURLWithToken: string): Promise<void>;
