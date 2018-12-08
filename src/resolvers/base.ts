import { ResolverFunction, TaskPayloadBase, WorkResult } from "../types";
import NetworkAgent from "../common/network";
import { ErrType, parseJSONAPIBody, formatIllustType } from "../common/common";

/**
 * Base resolvers
 * Base resolvers are designed to perform tasks that could be completed in only one step.
 * A standard workflow of sugar resolvers:
 *   0: Unpack request payload
 *   1: Perform network request(s) to acquire all data needed
 *   2: Call gotWork with the work data you acquired or reportErr to report errors
 */
const baseResolvers: {[name: string]: ResolverFunction} = {
    "get_illust_data": async (task, {reportResult, reportErr}) => {
        interface RequestPayload extends TaskPayloadBase {
            illust_id: string,
            accept_type?: ("illust"|"manga"|"ugoira")[],
        }

        let Payload = <RequestPayload>(task.Payload)
        let id = Payload.illust_id
        let url = "https://www.pixiv.net/ajax/illust/" + id
        let res = await NetworkAgent.get(url, reportErr)
        if (res) {
            let data = parseJSONAPIBody(res, reportErr)
            if (data) {
                let type = formatIllustType(data.illustType)
                if (typeof Payload.accept_type!=="undefined" && !Payload.accept_type.includes(type)) {
                    return
                }
                let work: WorkResult = {
                    illustID: data.illustId,
                    illustType: type,
                    URLs: data.urls,
                }
                if (type=="ugoira") {
                    let res = await NetworkAgent.get(url+"/ugoira_meta", reportErr)
                    if (res) {
                        let ugoirameta = parseJSONAPIBody(res, reportErr)
                        if (ugoirameta) {
                            work.UgoiraMeta = ugoirameta
                        }
                    }
                }
                reportResult(work)
            }
        }

    }
}

export default baseResolvers