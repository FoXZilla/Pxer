import { URL } from "url";
import { ErrInfo } from "../types";
import { ErrType } from "./common";

// @ts-ignore
const inBrowser: boolean =  typeof window !== "undefined"

/**
 * Networking encapsulation layer
 * @class
 */
export default class NetworkAgent {
    static get(url: string|URL, onError: (e: ErrInfo)=>void) :Promise<string|null> {
        if (inBrowser) {
            return async function(url: string|URL) :Promise<string|null>{
                let req = null
                try {
                    // @ts-ignore
                    req = await fetch(url, {credentials: "include"})
                } catch {
                    onError({
                        fatal: true,
                        type: ErrType.NetworkTimeout,
                        extraMsg: `Network error for URL ${url.toString()}`,
                        rawErr: null,
                    })
                    return null
                }
                if (req.status===200) {
                    return await req.text()
                } else {
                    onError({
                        fatal: true,
                        type: ErrType.HTTPCode,
                        extraMsg: `Remote returned ${req.status} for URL ${url.toString()}`,
                        rawErr: null,
                    })
                    return null
                }
            }(url)
        } else {
            return new Promise<string|null>((resolve, reject)=>{
                const request = require("request");
                request({
                    method: "GET",
                    url,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:62.0) Gecko/20100101 Firefox/62.0',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
                        'Cookie': process.env.cookie || process.env.COOKIE,
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        'Cache-Control': 'max-age=0',
                        'TE': 'Trailers',
                    },
                    gzip: true,
                }, function(error: Error|null, response: any, body: any){
                    if (error) {
                        onError({
                            fatal: true,
                            type: ErrType.NetworkTimeout,
                            extraMsg: `Network error for URL ${url.toString()}`,
                            rawErr: error,
                        })
                        resolve(null)
                    } else {
                        if (response.statusCode===200) {
                            resolve(body.toString())
                        } else {
                            onError({
                                fatal: true,
                                type: ErrType.HTTPCode,
                                extraMsg: `Remote returned ${response.statusCode} for URL ${url.toString()}`,
                                rawErr: null,
                            })
                            resolve(null)
                        }
                    }
                })
            })
        }
    }
}