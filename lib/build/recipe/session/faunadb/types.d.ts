import { SessionContainer } from "../";
export declare type Session = SessionContainer & {
    getFaunadbToken: (userContext?: any) => Promise<string>;
};
