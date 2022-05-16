// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
export interface SMTPServiceConfig {
    host: string;
    from: {
        name: string;
        email: string;
    };
    port: number;
    secure?: boolean;
    password: string;
}
export interface GetContentResult {
    body: string;
    isHtml: boolean;
    subject: string;
    toEmail: string;
}
export declare type TypeInputSendRawEmail = GetContentResult & {
    userContext: any;
};
export declare type ServiceInterface<T> = {
    sendRawEmail: (input: TypeInputSendRawEmail) => Promise<void>;
    getContent: (
        input: T & {
            userContext: any;
        }
    ) => Promise<GetContentResult>;
};
export declare type TypeInput<T> = {
    smtpSettings: SMTPServiceConfig;
    override?: (oI: ServiceInterface<T>, builder: OverrideableBuilder<ServiceInterface<T>>) => ServiceInterface<T>;
};
