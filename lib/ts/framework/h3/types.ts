import {ServerResponse, IncomingMessage} from 'http'

export interface Response {
    res: ServerResponse
}

export interface Request {
    req: IncomingMessage
}