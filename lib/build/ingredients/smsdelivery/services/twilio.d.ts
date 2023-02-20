// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
import { ClientOpts } from "twilio/lib/base/BaseTwilio";
/**
 * only one of "from" and "messagingServiceSid" should be passed.
 * if both are passed, we should throw error to the user
 * saying that only one of them should be set. this is because
 * both parameters can't be passed while calling twilio API.
 * if none of "from" and "messagingServiceSid" is passed, error
 * should be thrown.
 */
export declare type TwilioServiceConfig =
    | {
          accountSid: string;
          authToken: string;
          from: string;
          opts?: ClientOpts;
      }
    | {
          accountSid: string;
          authToken: string;
          messagingServiceSid: string;
          opts?: ClientOpts;
      };
export interface GetContentResult {
    body: string;
    toPhoneNumber: string;
}
export declare type TypeInputSendRawSms = GetContentResult & {
    userContext: any;
} & (
        | {
              from: string;
          }
        | {
              messagingServiceSid: string;
          }
    );
export declare type ServiceInterface<T> = {
    sendRawSms: (input: TypeInputSendRawSms) => Promise<void>;
    getContent: (
        input: T & {
            userContext: any;
        }
    ) => Promise<GetContentResult>;
};
export declare type TypeInput<T> = {
    twilioSettings: TwilioServiceConfig;
    override?: (oI: ServiceInterface<T>, builder: OverrideableBuilder<ServiceInterface<T>>) => ServiceInterface<T>;
};
export declare function normaliseUserInputConfig<T>(input: TypeInput<T>): TypeInput<T>;
