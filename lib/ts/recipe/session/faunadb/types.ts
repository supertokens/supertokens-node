import { SessionContainer } from "../";
export type Session = SessionContainer & {
    getFaunadbToken: () => Promise<string>;
};
