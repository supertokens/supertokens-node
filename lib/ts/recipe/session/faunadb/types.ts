import { SessionContainer } from "../";
export type Session = SessionContainer & {
    getFaunadbToken: (userContext?: any) => Promise<string>;
};
