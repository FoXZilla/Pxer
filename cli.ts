import "process"
import PxerEngine from "./src/index"
import { writeFileSync, readFileSync } from "fs";

function onSIGINT(f: ()=>void) {
    if (process.platform === "win32") {
        var rl = require("readline").createInterface({
          input: process.stdin,
          output: process.stdout
        });
      
        rl.on("SIGINT", f);
      }
      
      process.on("SIGINT", f);
}

let eng = new PxerEngine
eng.on("progress", (cur, total)=>{
    console.log(`${cur}/${total} (${(cur/total).toFixed(2)}%)`)
})
eng.on("result", (res)=>{
    console.log(res)
})
eng.on("error", (err)=>{
    console.error(err)
})
eng.on("end", (reason)=>{
    console.log("Exiting... Reason: "+reason)
    if (reason=="complete")
        process.exit(0)
})

let exiting = false
onSIGINT(()=>{
    if (exiting) {
        process.exit(127)
    } else {
        console.log("Received SIGINT, stopping gracefully...")
        exiting = true
        eng.save().then((state)=>{
            console.log("Saving progress to progress.json")
            writeFileSync("./progress.json", JSON.stringify(JSON.parse(state), null, 4))
            console.log("Exiting...")
            process.exit(1)
        })
    }
})

let directive = process.argv[2]
if (directive=="resume") {
    // Resume previous progress
    eng.load(readFileSync("./progress.json").toString())
} else {
    // New task
    let payload = {}
    if (process.argv.length>=4) {
        payload = JSON.parse(process.argv[3])
    }
    eng.start({
        Directive: directive,
        Payload: payload,
    })
}

setTimeout(()=>{}, 86400)