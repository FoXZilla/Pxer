import { ResolverFunction, Task, TaskPayloadBase} from "../types";
import { ErrType, parseJSONAPIBody } from "../common/common"
import NetworkAgent from "../common/network";

/*
 * Sugar resolvers
 * Sugar resolvers are designed for multi-step task resolving and are mainly composed of a switch..case statement.
 * A standard workflow of sugar resolvers:
 *   0: get the method name by splitting the task directive by a double colon
 *   1: switch (method)
 *   2: default: {Perform step one of the task. Call reportErr if errors occurred, call addTask to add tasks for future steps with step 1 results written in the Payload.}
 *   3: case {Step2MethodName}: {Perform step two of the task. ...}
 *   4: case {StepNMethodName}: {Works are ready. Call gotWork to report work data or append get_illust_data tasks with the work ID to acquire work details}
 */

function getTaskMethod(task: Task) :string{
    let x = task.Directive.split("::")
    switch (x.length) {
        case 1:
            return ""
        case 2:
            return x[1]
        default:
        throw new Error("Invalid directive")
    }
}

const sugarResolvers:{[name: string]: ResolverFunction} = {
    "get_user_works": async (task, {reportResult, addTask, reportErr}) => {

        let method = getTaskMethod(task);
        switch (method) {
            default:
                interface RequestPayload extends TaskPayloadBase {
                    user_id: string,
                    types?: ("illust"|"manga"|"ugoira")[],
                    count_only?: boolean,
                }
                let payload = <RequestPayload>task.Payload
                
                const requestWorkData = function(id: string) {
                    addTask({
                        Directive: "get_illust_data",
                        Payload: {illust_id: id, accept_type: payload.types},
                    })
                }
                
                let url = `https://www.pixiv.net/ajax/user/${payload.user_id}/profile/all`
                let res = await NetworkAgent.get(url, reportErr)
                let illustIDs: string[] = []
                let countIsPrecise = true
                if (res) {
                    let workList = parseJSONAPIBody(res, reportErr)
                    if (workList) {
                        if (payload.types===undefined||payload.types.includes("illust")||payload.types.includes("ugoira")) {
                            let onlyIllustOrUgoiraIsRequired = payload.types && payload.types.includes("illust")!=payload.types.includes("ugoira")
                            if (Object.keys(workList.illusts).length>0 && onlyIllustOrUgoiraIsRequired) {
                                countIsPrecise = false
                            }
                            for (let id in workList.illusts) {
                                illustIDs.push(id)
                            }
                        }
                        if (payload.types===undefined||payload.types.includes("manga")) {
                            for (let id in workList.manga) {
                                illustIDs.push(id)
                            }
                        }
                    }
                }
                if (payload.count_only)
                    reportResult({
                        count: illustIDs.length,
                        precise: countIsPrecise,
                    })

                if (!payload.count_only) {
                    illustIDs.forEach(requestWorkData)
                }
        }
    }
}


export default sugarResolvers