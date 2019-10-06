afterLoad(function(){
    // 寻找插入点
    let pxer_app = new PxerApp();
    let pxer_app_delayed_syncer = {
        pageType: pxer_app.pageType,
        taskOption: pxer_app.taskOption,
        worksNum: 0,
        completedTaskCount: 0,
        failCount: 0,
        ppConfig: pxer_app.ppConfig,
        pfConfig: pxer_app.pfConfig,
        ptmConfig: pxer_app.ptmConfig,
    };

    setInterval(function() {
        pxer_app_delayed_syncer.completedTaskCount = pxer_app.taskList.filter(pr=>pr.completed).length;
        pxer_app_delayed_syncer.failCount = pxer_app.failList.length;
    }, 500);
    setInterval(function() {
        pxer_app_delayed_syncer.worksNum = pxer_app.worksNum;
    }, 100);

    let pxer_analytics = new PxerAnalytics();
    var elt =document.createElement('div');
    var insetElt=(
        document.getElementById('pxer-app')
        || document.getElementById('wrapper')
        || document.getElementById('root').childNodes[1] //skip <header>
        || document.body
    );
    insetElt.insertBefore(elt,insetElt.firstChild);

    // 运行Vue实例
    new Vue({render:ce=>ce({
        template:PXER_TEMPLATE,
        data(){return {
            pxer: pxer_app_delayed_syncer,
            showAll:false,
            state:'standby',//[standby|init|ready|page|works|finish|re-ready|stop|error]
            stateMap:{
                standby:'待命',
                init  :'初始化',
                ready :'就绪',
                page  :'抓取页码中',
                works :'抓取作品中',
                finish:'完成',
                're-ready':'再抓取就绪',
                stop  :'用户手动停止',
                error :'出错',
            },
            pxerVersion:window['PXER_VERSION'],
            showPxerFailWindow:false,
            runTimeTimestamp:0,
            runTimeTimer:null,
            checkedFailWorksList:[],
            taskInfo:'',
            tryFailWroksList:[],
            showTaskOption:false,
            taskOption:{
                limit:'',
                stopId:'',
            },
            showLoadBtn:true,
            errmsg:'',
        }},
        created(){
            window['PXER_VM'] =this;
            window['PXER_ANALYTICS'] =pxer_analytics;
            pxer_analytics.postData("pxer.app.created", {});
            pxer_app.on('error',(err)=>{
                this.errmsg =err;
            });
            pxer_app.on('finishWorksTask',(result) =>{
                pxer_analytics.postData("pxer.app.finish", {
                    result_count:result.length,
                    ptm_config:this.pxer.ptmConfig,
                    task_option:pxer_app.taskOption,
                    error_count:pxer_app.failList.length,
                });
            })
        },
        mounted(){
            var getResultList=()=>[].concat.apply([], pxer_app.resultSet.map((res)=>res.tagList));
            new AutoSuggestControl("no_tag_any", getResultList);
            new AutoSuggestControl("no_tag_every", getResultList);
            new AutoSuggestControl("has_tag_some", getResultList);
            new AutoSuggestControl("has_tag_every", getResultList);
        },
        computed:{
            pageType(){
                var map ={
                    'member_works'     :'作品列表页',
                    'member_works_new' :'作品列表页_',
                    'search'           :'检索页',
                    'bookmark_works'   :'收藏列表页',
                    'rank'             :'排行榜',
                    'bookmark_new'     :'关注的新作品',
                    'discovery'        :'探索',
                    'unknown'          :'未知',
                };
                return map[this.pxer.pageType];
            },
            isRunning(){
                var runState =['page','works'];
                return runState.indexOf(this.state)!==-1;
            },
            worksNum(){
                return this.pxer.taskOption.limit ||this.pxer.worksNum;
            },
            taskCount(){
                var pageWorkCount = getOnePageWorkCount(this.pxer.pageType);
                return Math.ceil(this.worksNum/pageWorkCount)+ +this.worksNum;
            },
            finishCount(){
                if(this.state==='page'){
                    return this.pxer.completedTaskCount;
                }else if(this.state==='works'){
                    return (
                        this.pxer.completedTaskCount
                        +~~(this.worksNum/20)
                        +this.pxer.failCount
                    );
                }else{
                    return -1;
                };
            },
            forecastTime(){
                if(this.isRunning&&this.finishCount){
                    return Math.ceil(
                        (this.runTimeTimestamp/this.finishCount)*this.taskCount
                        -this.runTimeTimestamp
                    );
                }else{
                    return -1;
                };
            },
            printConfigUgoira:{
                get(){
                    return this.pxer.ppConfig.ugoira_zip+'-'+this.pxer.ppConfig.ugoira_frames;
                },
                set(value){
                    var arr =value.split('-');
                    this.pxer.ppConfig.ugoira_zip=arr[0];
                    this.pxer.ppConfig.ugoira_frames=arr[1];
                }
            },
            no_tag_any:{
                get(){
                    return this.pxer.pfConfig.no_tag_any.join(' ');
                },
                set(value){
                    this.pxer.pfConfig.no_tag_any = value ? value.split(' ') : [];
                },
            },
            no_tag_every:{
                get(){
                    return this.pxer.pfConfig.no_tag_every.join(' ');
                },
                set(value){
                    this.pxer.pfConfig.no_tag_every = value ? value.split(' ') : [];
                },
            },
            has_tag_some:{
                get(){
                    return this.pxer.pfConfig.has_tag_some.join(' ');
                },
                set(value){
                    this.pxer.pfConfig.has_tag_some = value ? value.split(' ') : [];
                },
            },
            has_tag_every:{
                get(){
                    return this.pxer.pfConfig.has_tag_every.join(' ');
                },
                set(value){
                    this.pxer.pfConfig.has_tag_every = value ? value.split(' ') : [];
                },
            },
            showFailTaskList(){
                return pxer_app.failList
                    .filter((pfi)=>{
                        return this.tryFailWroksList.indexOf(pfi)===-1;
                    })
                ;
            },
        },
        watch:{
            state(newValue,oldValue){
            },
            isRunning(value){
                if(value&&this.runTimeTimer===null){
                    this.runTimeTimer = setInterval(()=>this.runTimeTimestamp++ ,1000);
                }else{
                    clearInterval(this.runTimeTimer);
                    this.runTimeTimer =null;
                }
            },
        },
        methods:{
            load(){
                this.state='init';
                if(this.pxer.pageType==='works_medium'){
                    this.showLoadBtn=false;
                    pxer_app.one('finishWorksTask',()=>{
                        this.showLoadBtn=true;
                        this.state='standby';
                    });
                    pxer_app.getThis();
                }else{
                    pxer_app.init().then(()=>this.state='ready');
                    pxer_app.on('finishWorksTask',()=>{
                        window.blinkTitle();
                    });
                }
                pxer_analytics.postData("pxer.app.load", {
                    page_type:this.pxer.pageType,
                });
            },
            run(){
                pxer_analytics.postData("pxer.app.start", {
                    ptm_config:this.pxer.ptmConfig,
                    task_option:this.pxer.taskOption,
                    vm_state:this.state,
                });
                if(this.state==='ready'){
                    this.state='page';
                    pxer_app.initPageTask();
                    pxer_app.one('finishPageTask',()=>{
                        this.state='works';
                        pxer_app.switchPage2Works();
                        pxer_app.executeWroksTask();
                    });
                    pxer_app.one('finishWorksTask',()=>{
                        this.state='finish';
                    });
                    pxer_app.executePageTask();
                }else if(this.state==='re-ready'){
                    this.state='works';
                    pxer_app.one('finishWorksTask',()=>{
                        this.state='finish';
                    });
                    pxer_app.executeFailWroks(this.tryFailWroksList);
                    this.tryFailWroksList=[];
                }
            },
            stop(){
                this.state='stop';
                pxer_app.stop();
                pxer_analytics.postData("pxer.app.halt", {
                    task_count:this.taskCount,
                    finish_count:this.finishCount,
                });
            },
            count(){
                this.taskInfo =pxer_app.getWorksInfo()
            },
            printWorks(){
                pxer_app.printWorks();
                var sanitizedpfConfig = {};
                for (let key in this.pxer.pfConfig) {
                    sanitizedpfConfig[key] = this.pxer.pfConfig[key].length?this.pxer.pfConfig[key].length:this.pxer.pfConfig[key];
                }
                pxer_analytics.postData("pxer.app.print", {
                    pp_config:this.pxer.ppConfig,
                    pf_config:sanitizedpfConfig,
                    task_option:this.pxer.taskOption,
                });
            },
            useTaskOption(){
                this.showTaskOption=false;
                pxer_analytics.postData("pxer.app.taskoption", {
                    task_option: this.taskOption,
                });
                Object.assign(this.pxer.taskOption ,this.taskOption);
            },
            formatFailType(type){
                return{
                    'empty':'获取内容失败',
                    'timeout':'获取超时',
                    'r-18':'限制级作品（R-18）',
                    'r-18g':'怪诞作品（R-18G）',
                    'mypixiv':'仅好P友可见的作品',
                    'parse':'解析错误',
                }[type]||type;
            },
            formatFailSolution(type){
                return{
                    'empty':'点击左侧链接确认内容正确，再试一次~',
                    'timeout':'增加最大等待时间再试一次~',
                    'r-18':'开启账号R-18选项',
                    'r-18g':'开启账号R-18G选项',
                    'mypixiv':'添加画师好友再尝试',
                    'parse':'再试一次，若问题依旧，请<a href="https://github.com/pea3nut/Pxer/issues/5" target="_blank">反馈</a>给花生',
                }[type]||'要不。。。再试一次？';
            },
            tryCheckedPfi(){
                this.tryFailWroksList.push(...this.checkedFailWorksList);
                pxer_analytics.postData("pxer.app.reready", {
                    checked_works:this.checkedFailWorksList,
                });
                this.checkedFailWorksList=[];
                this.state='re-ready';
            },
            formatTime(s){
                return `${~~(s/60)}:${(s%60>=10)?s%60:'0'+s%60}`
            },
        },
    })}).$mount(elt);

});
