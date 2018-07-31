afterLoad(async function(){
    // 寻找插入点
    var elt =document.createElement('div');
    var insetElt=(
        document.getElementById('wrapper')
        || document.getElementById('root').childNodes[1] //skip <header>
        || document.body
    );
    insetElt.insertBefore(elt,insetElt.firstChild);

    // 国际化，加载默认语言
    Vue.use(VueI18n);
    var messages = {};
    var fallbackLocale = 'en-US';
    var locale = fallbackLocale;
    var languageMap = await window.loadI18nResource('map');
    messages[fallbackLocale] = await window.loadI18nResource(fallbackLocale);
    var i18n = new VueI18n({locale, fallbackLocale, messages});

    // 运行Vue实例
    new Vue({render:ce=>ce({
        i18n,
        template:PXER_TEMPLATE,
        data(){return {
            pxer:new PxerApp(),
            showAll:false,
            state:'standby',
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
            this.$nextTick(() => {
                this.setLocale(
                    document.documentElement.lang,
                    window.navigator.language,
                )
            });
            window['PXER_VM'] =this;
            this.pxer.on('error',(err)=>{
                this.errmsg =err;
            });
        },
        computed:{
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
                    return this.pxer.taskList.filter(pr=>pr.completed).length;
                }else if(this.state==='works'){
                    return (
                        this.pxer.taskList.filter(pr=>pr.completed).length
                        +~~(this.worksNum/20)
                        +this.pxer.failList.length
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
                    this.pxer.pfConfig.no_tag_any =value.split(' ');
                },
            },
            no_tag_every:{
                get(){
                    return this.pxer.pfConfig.no_tag_every.join(' ');
                },
                set(value){
                    this.pxer.pfConfig.no_tag_every =value.split(' ');
                },
            },
            has_tag_some:{
                get(){
                    return this.pxer.pfConfig.has_tag_some.join(' ');
                },
                set(value){
                    this.pxer.pfConfig.has_tag_some =value.split(' ');
                },
            },
            has_tag_every:{
                get(){
                    return this.pxer.pfConfig.has_tag_every.join(' ');
                },
                set(value){
                    this.pxer.pfConfig.has_tag_every =value.split(' ');
                },
            },
            showFailTaskList(){
                return this.pxer.failList
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
                if(this.pxer.pageType==='works_medium'){
                    this.pxer.getThis();
                    this.showLoadBtn=false;
                    this.pxer.one('finishWorksTask',()=>this.showLoadBtn=true);
                }else{
                    this.state='init';
                    this.pxer.init().then(()=>this.state='ready');
                    this.pxer.on('finishWorksTask',()=>{
                        window.blinkTitle();
                    });
                }
            },
            run(){
                if(this.state==='ready'){
                    this.state='page';
                    this.pxer.initPageTask();
                    this.pxer.one('finishPageTask',()=>{
                        this.state='works';
                        this.pxer.switchPage2Works();
                        this.pxer.executeWroksTask();
                    });
                    this.pxer.one('finishWorksTask',()=>{
                        this.state='finish';
                    });
                    this.pxer.executePageTask();
                }else if(this.state==='re-ready'){
                    this.state='works';
                    this.pxer.one('finishWorksTask',()=>{
                        this.state='finish';
                    });
                    this.pxer.executeFailWroks(this.tryFailWroksList);
                    this.tryFailWroksList=[];
                }
            },
            stop(){
                this.state='stop';
                this.pxer.stop();
            },
            count(){
                this.taskInfo =this.pxer.getWorksInfo()
            },
            useTaskOption(){
                this.showTaskOption=false;
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
                this.checkedFailWorksList=[];
                this.state='re-ready';
            },
            formatTime(s){
                return `${~~(s/60)}:${(s%60>=10)?s%60:'0'+s%60}`
            },
            setLocale(...languages) {
                for (var language of languages) {
                    var locale = languageMap[language];
                    if (!locale) continue;
                    if (locale in this.$i18n.messages) {
                        this.$i18n.locale = locale;
                    } else {
                        window.loadI18nResource(locale).then((data) => {
                            this.$i18n.setLocaleMessage(locale, data);
                            this.$i18n.locale = locale;
                        }, (error) => console.error(error));
                    }
                    break;
                }
            },
        },
    })}).$mount(elt);

});