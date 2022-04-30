/// <reference types="node" />
import { ServerResponse, IncomingMessage } from 'http';
export interface Event {
    res: ServerResponse;
    req: IncomingMessage;
}
