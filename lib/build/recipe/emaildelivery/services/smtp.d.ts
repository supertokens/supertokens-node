// @ts-nocheck
import { EmailService } from "../types";
import { Transporter } from "nodemailer";
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
    from: {
        name: string;
        email: string;
    };
    toEmail: string;
}
export declare type ServiceInterface<T> = {
    sendRawEmail: (input: GetContentResult, userContext: any) => Promise<void>;
    getContent: (input: T, userContext: any) => Promise<GetContentResult>;
};
export declare type SMTPInputConfig<T> = {
    smtpSettings: SMTPServiceConfig;
    override?: (oI: ServiceInterface<T>) => ServiceInterface<T>;
};
export declare type TypeGetDefaultEmailServiceImplementation<T> = (
    transporter: Transporter,
    from: {
        name: string;
        email: string;
    }
) => ServiceInterface<T>;
export declare function getSMTPProvider<T>(
    config: SMTPInputConfig<T>,
    getDefaultEmailServiceImplementation: TypeGetDefaultEmailServiceImplementation<T>
): EmailService<T>;
