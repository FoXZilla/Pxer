import { ErrType } from "./common/common"

export type illustType = "illust" | "manga" | "ugoira"

export type Task = {
    Directive: string,
    Payload: TaskPayloadBase,
}

/**
 * TaskPayloadBase contains nothing. Resolvers can extend this interface to define their own payload type.
 * @interface
 */
export interface TaskPayloadBase {}

export interface Result {}

export interface CountResult extends Result {
    count: number,
    precise: boolean,
}

/**
 * Result data
 */
export interface WorkResult extends Result {
    illustID: string,
    illustType: illustType,
    URLs: {
        mini: string,
        thumb: string,
        small: string,
        regular: string,
        original: string,
    }
    UgoiraMeta?: UgoiraMeta,
}

export type UgoiraMeta = {
    src: string,
    originalSrc: string,
    mime_type: string,
    frames: {
        file: string,
        delay: number,
    }[]
}

export type ErrInfo = {
    // Whether is error is fatal to the whole task flow
    fatal: boolean,
    // Type of error
    type: ErrType,
    // Extra message to be delivered to the front end
    extraMsg: string,
    // Raw error info
    rawErr: Error|null,
}

export type ResolverFunctionCallback = {
    reportResult: (res: Result) => void,
    addTask: (task: Task) => void, // schedule a new task which will be executed in the future
    reportErr: (err: ErrInfo) => void, // report any errors occurred during the process
}

// ResolverFunction definition of a resolver function
export type ResolverFunction = (
    task: Task, // The task to resolve
    cbs: ResolverFunctionCallback,
) => Promise<void>
