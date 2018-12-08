/**
 * Multitasking manager
 * @class
 */
export default class ThreadManager{
    // Active thread count
    private counter: number = 0;
    // Active thread limit
    private limit: number;
    // Current task pointer
    private pointer: number = -1;
    // Task list
    private tasks: ((done: ()=>void)=>void)[] = [];
    // sync mutex for _check
    private checking: boolean = false;
    private started: boolean = false;
    private stopping: boolean = false;
    
    constructor(count: number) {
        this.limit = count
    }

    /**
     * Change the active thread count
     * @param count 
     */
    public changeThreadCount(count: number) {
        if (count < (count = this.limit) && this.started) {
            // We are increasing the thread count. So try to initiate new tasks.
            this._check()
        }
    }

    /**
     * Register new task
     * @param fn New task func to execute. Call done after completion.
     */
    public register(fn: (done: ()=>void)=>void) :number{
        let res = this.tasks.push(fn) -1
        if (this.started) {
            this._check()
        }
        return res
    }

    /**
     * Starts the flow
     */
    public run() :void {
        this.started = true
        this._check()
    }

    private endListeners: ((reason: "complete"|"halt")=>any)[] = [];
    private progressListeners: ((current: number, total: number)=>any)[] = [];
    public notify(evt: "end", cb: (reason: "complete"|"halt")=>any) :void;
    public notify(evt: "progress", cb:(current: number, total: number)=>any) :void;
    public notify(evt: string, cb: (...data: any[])=>any) :void {
        switch (evt) {
        case "end":
            this.endListeners.push(cb)
        case "progress":
            this.progressListeners.push(cb)
        }
    }

    private emit(evt: "end", reason: "complete"|"halt" ) :void;
    private emit(evt: "progress", current: number, total: number) :void;
    private emit(evt: string, ...data: any[]) :void{
        const notifyListeners = function(cbs: ((...data: any[])=>any)[], ...data: any[]) {
            cbs.forEach(cb=>setTimeout(()=>cb(...data), 0))
        }
        switch (evt) {
        case "end":
            notifyListeners(this.endListeners, ...data)
        case "progress":
            notifyListeners(this.progressListeners, ...data)
        }
    }

    public stop() :Promise<void>{
        return new Promise<void>((resolve, reject)=>{
            this.notify("end", (reason)=>{resolve()})
            this.stopping = true
        })
    }

    private _check() :void {
        if (this.checking) {
            return
        }

        if (this.counter==0 && (this.stopping || this.pointer == this.tasks.length - 1)) {
            // All tasks completed
            this.emit("end", this.stopping?"halt":"complete")
            return
        }
        
        this.checking = true
        
        while (!this.stopping && this.counter<this.limit && this.pointer < this.tasks.length-1) {
            let task = this.tasks[++this.pointer];
            
            this.counter++
            (async ()=>{
                task(()=>{
                    this.counter--
                    this._check()
                    this.emit("progress", this.pointer, this.tasks.length)
                })
            })()
        
        }
        
        this.checking = false
    }
}