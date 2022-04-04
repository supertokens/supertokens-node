// @ts-nocheck
import { Transporter } from "nodemailer";
import OverrideableBuilder from "supertokens-js-override";
export interface SMTPServiceConfig {
    host: string;
    from: {
        name: string;
        email: string;
    };
    port: number;
    secure?: boolean;
    auth?: {
        user: string;
        password: string;
    };
}
export interface GetContentResult {
    body: string;
    subject: string;
    toEmail: string;
}
export declare type TypeInputSendRawEmail = GetContentResult & {
    userContext: any;
} & {
    from: {
        name: string;
        email: string;
    };
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
export declare type TypeGetDefaultEmailServiceImplementation<T> = (
    transporter: Transporter,
    from: {
        name: string;
        email: string;
    }
) => ServiceInterface<T>;
