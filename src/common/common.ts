import { ErrInfo, illustType } from "../types";

/**
 * @param n Number|string representation of illustType
 * @returns illustType
 */
export function formatIllustType(n :any): illustType {
    switch(n) {
        case 0:
        case "0":
        case "illust":
            return "illust"
        case 1:
        case "1":
        case "manga":
            return "manga"
        case 2:
        case "2":
        case "ugoira":
            return "ugoira"
    }
    throw new Error("Unknown illust type")
}

export enum ErrType {
    NetworkTimeout,
    HTTPCode,
    AccountRestriction,
    ResolverNotFound,
    MethodNotFound,
    NotWellFormedJSON,
    RemoteAPIError,
    Unknown,
}


export function parseJSONAPIBody(data: string, onError: (err: ErrInfo)=>void) :any|null {
    const errNotWellFormed = function(e:Error|null) {
        onError({
            fatal: true,
            type: ErrType.NotWellFormedJSON,
            extraMsg: "JSON is not well formed",
            rawErr: e,
        })
    }
    const errAPIError = function(msg: string) {
        onError({
            fatal: true,
            type: ErrType.RemoteAPIError,
            extraMsg: `API returned an error: ${msg}`,
            rawErr: null,
        })
    }
    
    let res = null
    try {
        res = JSON.parse(data)
    } catch(e) {
        errNotWellFormed(e)
        return null
    }
    if ("error" in res && res.error) {
        errAPIError(res.message)
        return null
    }
    if ("body" in res) {
        return res.body
    }
    errNotWellFormed(new Error("API body does not exist"))
    return null
}