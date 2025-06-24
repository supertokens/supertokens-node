import { BaseResponse } from "../../lib/build/framework";
import { BaseRequest } from "../../lib/build/framework/request";
import { HTTPMethod } from "../../lib/build/types";

export class DummyRequest extends BaseRequest {
    wrapperUsed = false;
    original = undefined;

    getJSONFromRequestBody(): Promise<any> {
        throw new Error("Function not implemented.");
    }

    getFormDataFromRequestBody(): Promise<any> {
        throw new Error("Function not implemented.");
    }

    getKeyValueFromQuery = (key: string) => {
        throw new Error("Function not implemented.");
    };

    getMethod = (): HTTPMethod => "get";

    getCookieValue = (key_: string): string | undefined => {
        throw new Error("Function not implemented.");
    };

    getHeaderValue = (key: string): string | undefined => {
        throw new Error("Function not implemented.");
    };

    getOriginalURL = (): string => "/auth/plugin1/hello";

    getFormData = async (): Promise<any> => {
        throw new Error("Function not implemented.");
    };

    getJSONBody = async (): Promise<any> => {
        throw new Error("Function not implemented.");
    };

    getBodyAsJSONOrFormData = async (): Promise<any> => {
        throw new Error("Function not implemented.");
    };
}

export class DummyResponse extends BaseResponse {
    data: any = undefined;
    setHeader: (key: string, value: string, allowDuplicateKey: boolean) => void;
    removeHeader: (key: string) => void;
    setCookie: (
        key: string,
        value: string,
        domain: string | undefined,
        secure: boolean,
        httpOnly: boolean,
        expires: number,
        path: string,
        sameSite: "strict" | "lax" | "none"
    ) => void;
    setStatusCode: (statusCode: number) => void;
    sendJSONResponse: (content: any) => void;
    sendHTMLResponse: (html: string) => void;
}
