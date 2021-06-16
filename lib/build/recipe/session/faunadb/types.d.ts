import { SessionContainer } from "../";
export declare type Session = SessionContainer & {
    getFaunadbToken: () => Promise<string>;
};
