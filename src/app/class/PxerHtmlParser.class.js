'use strict';

class PxerHtmlParser{
    constructor(){
        throw new Error('PxerHtmlParse could not construct');
    };
};


/**
 * 解析页码任务对象
 * @param {PxerPageRequest} task - 抓取后的页码任务对象
 * @param {boolean} batchMode - 是否允许批量请求
 * @return {PxerWorksRequest[]|false} - 解析得到的作品任务对象
 * */
PxerHtmlParser.parsePage = function (task, batchMode=false) {
    if (!(task instanceof PxerPageRequest)) {
        window['PXER_ERROR'] = 'PxerHtmlParser.parsePage: task is not PxerPageRequest';
        return false;
    }
    if (!task.url || !task.html) {
        window['PXER_ERROR'] = 'PxerHtmlParser.parsePage: task illegal';
        return false;
    }

    var taskList = [];
    switch (task.type) {
        case "bookmark_works":
        case "member_works":
            var dom = PxerHtmlParser.HTMLParser(task.html);
            var elts = dom.body.querySelectorAll('a.work._work');
            if (batchMode) {
                var pwr = new PxerBatchWorksRequest({
                    id :[],
                    html:{},
                });
                for (let elt of elts) {
                    pwr.id.push(elt.getAttribute("href").match(/illust_id=(\d+)/)[1]);
                }
                pwr.url = this.getUrlList(pwr);
                taskList.push(pwr);
            } else {
                for (let elt of elts) {
                    var task = new PxerWorksRequest({
                        html: {},
                        type: function(elt) {
                            switch (true) {
                                case elt.matches('.ugoku-illust'): return "ugoira";
                                case elt.matches('.manga'): return "manga";
                                default: return "illust";
                            }
                        }(elt),
                        isMultiple: elt.matches(".multiple"),
                        id: elt.getAttribute('href').match(/illust_id=(\d+)/)[1]
                    });
    
                    task.url = PxerHtmlParser.getUrlList(task);
    
                    taskList.push(task);
                };
            }
            break;
        case "rank":
            var data = JSON.parse(task.html);
            if (batchMode) {
                var pwr = new PxerBatchWorksRequest({
                    html: {},
                    id  : [],
                })
                for (var task of data['contents']) {
                    pwr.id.push(task['illust_id'].toString());
                }
                pwr.url = this.getUrlList(pwr);
                taskList.push(pwr);
            } else {
                for (var task of data['contents']) {

                    var pwr = new PxerWorksRequest({
                        html: {},
                        type: this.parseIllustType(task['illust_type']),
                        isMultiple: task['illust_page_count'] > 1,
                        id: task['illust_id'].toString(),
                    });
                    pwr.url = PxerHtmlParser.getUrlList(pwr);
                    taskList.push(pwr);
                };
            };
            break;
        case "discovery":
            var data =JSON.parse(task.html);
            if (batchMode) {
                for (var i=0;i<data.recommendations.length;i+=70) {
                    var pwr = new PxerBatchWorksRequest({
                        id  :[],
                        html:{},
                    });
                    pwr.id.push(...data.recommendations.slice(i,i+70));
                };
                pwr.url = this.getUrlList(pwr);
                taskList.push(pwr);
            } else {
                for (var id of data.recommendations) {
                    var task = new PxerWorksRequest({
                        html: {},
                        type: null,
                        isMultiple: null,
                        id  : id.toString(),
                    });
                    task.url = PxerHtmlParser.getUrlList(task);
                    
                    taskList.push(task);
                };
            };
            break;
        case "search":
            var dom = PxerHtmlParser.HTMLParser(task.html);
            var searchResult = dom.body.querySelector("input#js-mount-point-search-result-list");
            var searchData = JSON.parse(searchResult.getAttribute('data-items'));
            if (batchMode) {
                var pwr = new PxerBatchWorksRequest({
                    id  :[],
                    html:{},
                })
                for (var searchItem of searchData) {
                    pwr.id.push(searchItem.illustId);
                };
                pwr.url = this.getUrlList(pwr);
                taskList.push(pwr);
            } else {
                for (var searchItem of searchData) {
                    var task = new PxerWorksRequest({
                        html: {},
                        type: this.parseIllustType(searchItem.illustType),
                        isMultiple: searchItem.pageCount > 1,
                        id: searchItem.illustId
                    });
                    task.url = PxerHtmlParser.getUrlList(task);
                    taskList.push(task);
                };
            };
            break;
        case "bookmark_new":
            var elt = document.createElement("div");
            elt.innerHTML = task.html;
            var data = JSON.parse(elt.querySelector("div#js-mount-point-latest-following").getAttribute('data-items'));
            if (batchMode) {
                var pwr = new PxerBatchWorksRequest({
                    id  :[],
                    html:{},
                });
                for (var task of data) {
                    pwr.id.push(task['illustId']);
                }
                pwr.url = this.getUrlList(pwr);
                taskList.push(pwr);
            } else {
                for (var task of data) {
                
                    var task = new PxerWorksRequest({
                        html      : {},
                        type      : this.parseIllustType(task['illust_type']),
                        isMultiple: task['illust_page_count'] > 1,
                        id        : task['illustId'],
                    });
                    task.url = PxerHtmlParser.getUrlList(task);
    
                    taskList.push(task);
                };
            };
            break;
        default:
            throw new Error(`Unknown PageWorks type ${task.type}`);
    };
    
    if (taskList.length<1) {
        window['PXER_ERROR'] = 'PxerHtmlParser.parsePage: result empty';
        return false;
    };

    return taskList;

};

/**
 * 解析作品任务对象
 * @param {PxerWorksRequest} task - 抓取后的页码任务对象
 * @return {PxerWorks} - 解析得到的作品任务对象
 * */
PxerHtmlParser.parseWorks =function(task){
    if(!(task instanceof PxerWorksRequest)){
        window['PXER_ERROR'] ='PxerHtmlParser.parseWorks: task is not PxerWorksRequest';
        return false;
    }
    if(!task.url.every(item=>task.html[item])){
        window['PXER_ERROR'] ='PxerHtmlParser.parseWorks: task illegal';
        return false;
    }

    for(let url in task.html){
        let data ={
            dom :PxerHtmlParser.HTMLParser(task.html[url]),
            task: task,
        };
        try{
            switch (true){
                case url.indexOf('mode=medium')!==-1:
                    var pw=PxerHtmlParser.parseMediumHtml(data);
                    break;
                default:
                    throw new Error(`PxerHtmlParser.parsePage: count not parse task url "${url}"`);
            };
        }catch(e){
            window['PXER_ERROR'] =`${task.id}:${e.message}`;
            if(window['PXER_MODE']==='dev')console.error(task ,e);
            return false;
        }
    };
    return pw;

};

/**
 * 解析批量作品任务对象
 * @param {PxerBatchWorksRequest} task - 抓取后的批量页码任务对象
 * @return {PxerWorks[]} - 解析得到的作品任务对象
 * */
PxerHtmlParser.parseBatchWorks =function(task) {
    let resultList =[];
    var res=[];
    for (var url in task.html) {
        res.push(...JSON.parse(task.html[url]));
    }
    for (let workdata of res) {
        var pw;
        switch (true) {
            case (workdata["illust_type"]==="2"): pw = new PxerUgoiraWorks(); break;
            case (workdata["illust_page_count"]>"1"): pw = new PxerMultipleWorks(); break;
            default: pw = new PxerWorks(); break;
        }
        switch (workdata["illust_type"]) {
            case "0": pw.type = "illust"; break;
            case "1": pw.type = "manga"; break;
            case "2": pw.type = "ugoira"; break;
        }
        pw.id = workdata["illust_id"];
        pw.tagList = workdata["tags"];
        pw.viewCount = 1;
        pw.ratedCount = 0;
        if (pw instanceof PxerMultipleWorks) pw.multiple = parseInt(workdata["illust_page_count"]);
        
        switch (pw.type) {
            case "ugoira":this.setUgoiraMeta(pw, {width:workdata["illust_width"], height:workdata["illust_height"]}); break;
            default:
                let src = workdata['url'];
                let URLObj = parseURL(src);
                
                pw.domain = URLObj.domain;
                pw.date = src.match(PxerHtmlParser.REGEXP['getDate'])[1];
                pw.fileFormat =src.match(/\.(jpg|gif|png)$/)[1];  
                break; 
        }
        resultList.push(pw);
    }
    return resultList;
}



/**
 * @param {PxerWorksRequest} task
 * @return {Array}
 * */
PxerHtmlParser.getUrlList =function(task){
    switch (true) {
        case (task instanceof PxerWorksRequest):return ["https://www.pixiv.net/member_illust.php?mode=medium&illust_id="+task.id];
        case (task instanceof PxerBatchWorksRequest):return [`https://www.pixiv.net/rpc/illust_list.php?illust_ids=${task.id.join("%2C")}&page=discover&exclude_muted_illusts=1`];
        default:throw new Error("PxerHtmlParser.GetUrlList: Unknown task type");
    }
};


PxerHtmlParser.parseMediumHtml =function({task,dom}){
    var illustData = dom.head.innerHTML.match(this.REGEXP['getInitData'])[0];
    illustData = this.getKeyFromStringObjectLiteral(illustData, "preload");
    illustData = this.getKeyFromStringObjectLiteral(illustData, 'illust');
    illustData = this.getKeyFromStringObjectLiteral(illustData, task.id);
    illustData = JSON.parse(illustData);

    var pw;
    switch (true) {
        case illustData.illustType===2: pw = new PxerUgoiraWorks(); break;
        case illustData.pageCount>1: pw = new PxerMultipleWorks(); break;
        default: pw = new PxerWorks(); break;
    }

    pw.id = task.id;
    pw.type = this.parseIllustType(illustData.illustType);
    pw.tagList = illustData.tags.tags.map(e=>e.tag);
    pw.viewCount = illustData.viewCount;
    pw.ratedCount = illustData.bookmarkCount;
    if (pw instanceof PxerMultipleWorks) {
        pw.multiple = illustData.pageCount;
    }
    
    
    if (pw.type ==="ugoira"){
            this.setUgoiraMeta(pw, illustData);
    } else {
            let src = illustData.urls.original;
            let URLObj = parseURL(src);

            pw.domain = URLObj.domain;
            pw.date = src.match(PxerHtmlParser.REGEXP['getDate'])[1];
            pw.fileFormat =src.match(/\.(jpg|gif|png)$/)[1];    
    };
    return pw;
};
PxerHtmlParser.setUgoiraMeta =function(pw, illustData) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://www.pixiv.net/ajax/illust/"+ pw.id + "/ugoira_meta", false);
    xhr.send();
    var meta = JSON.parse(xhr.responseText);
    let src = meta['body']['originalSrc'];
    let URLObj = parseURL(src);

    pw.domain = URLObj.domain;
    pw.date   =src.match(PxerHtmlParser.REGEXP['getDate'])[1];
    pw.frames ={
        framedef:meta['body']['frames'],
        height:illustData.height,
        width:illustData.width,
    };
};

PxerHtmlParser.parseIllustType =function(type){
    switch (type.toString()) {
        case "0":
        case "illust":
            return "illust";
        case "1":
        case "manga":
            return "manga";
        case "2":
        case "ugoira":
            return "ugoira";
    }
    return null;
}

PxerHtmlParser.REGEXP ={
    'getDate':/img\/((?:\d+\/){5}\d+)/,
    'getInitData':/\{token:.*\}(?=\);)/
};

PxerHtmlParser.HTMLParser =function(aHTMLString){
    var dom =document.implementation.createHTMLDocument('');
    dom.documentElement.innerHTML =aHTMLString;
    return dom;
};

/**@param {Element} img*/
PxerHtmlParser.getImageUrl =function(img){
    return img.getAttribute('src')||img.getAttribute('data-src');
};

PxerHtmlParser.parseObjectLiteral = function() {
    // Javascript object literal parser
    // Splits an object literal string into a set of top-level key-value pairs
    // (c) Michael Best (https://github.com/mbest)
    // License: MIT (http://www.opensource.org/licenses/mit-license.php)
    // Version 2.1.0
    // https://github.com/mbest/js-object-literal-parse
    // This parser is inspired by json-sans-eval by Mike Samuel (http://code.google.com/p/json-sans-eval/)

    // These two match strings, either with double quotes or single quotes
    var stringDouble = '"(?:[^"\\\\]|\\\\.)*"',
        stringSingle = "'(?:[^'\\\\]|\\\\.)*'",
        // Matches a regular expression (text enclosed by slashes), but will also match sets of divisions
        // as a regular expression (this is handled by the parsing loop below).
        stringRegexp = '/(?:[^/\\\\]|\\\\.)*/\w*',
        // These characters have special meaning to the parser and must not appear in the middle of a
        // token, except as part of a string.
        specials = ',"\'{}()/:[\\]',
        // Match text (at least two characters) that does not contain any of the above special characters,
        // although some of the special characters are allowed to start it (all but the colon and comma).
        // The text can contain spaces, but leading or trailing spaces are skipped.
        everyThingElse = '[^\\s:,/][^' + specials + ']*[^\\s' + specials + ']',
        // Match any non-space character not matched already. This will match colons and commas, since they're
        // not matched by "everyThingElse", but will also match any other single character that wasn't already
        // matched (for example: in "a: 1, b: 2", each of the non-space characters will be matched by oneNotSpace).
        oneNotSpace = '[^\\s]',

        // Create the actual regular expression by or-ing the above strings. The order is important.
        token = RegExp(stringDouble + '|' + stringSingle + '|' + stringRegexp + '|' + everyThingElse + '|' + oneNotSpace, 'g'),

        // Match end of previous token to determine whether a slash is a division or regex.
        divisionLookBehind = /[\])"'A-Za-z0-9_$]+$/,
        keywordRegexLookBehind = {'in':1,'return':1,'typeof':1};

    function trim(string) {
        return string == null ? '' :
            string.trim ?
                string.trim() :
                string.toString().replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
    }

    return function(objectLiteralString) {
        // Trim leading and trailing spaces from the string
        var str = trim(objectLiteralString);

        // Trim braces '{' surrounding the whole object literal
        if (str.charCodeAt(0) === 123)
            str = str.slice(1, -1);

        // Split into tokens
        var result = [],
            toks = str.match(token),
            key, values = [], depth = 0;

        if (toks) {
            // Append a comma so that we don't need a separate code block to deal with the last item
            toks.push(',');

            for (var i = 0, tok; tok = toks[i]; ++i) {
                var c = tok.charCodeAt(0);
                // A comma signals the end of a key/value pair if depth is zero
                if (c === 44) { // ","
                    if (depth <= 0) {
                        if (!key && values.length === 1) {
                            key = values.pop();
                        }
                        result.push([key, values.length ? values.join('') : undefined]);
                        key = undefined;
                        values = [];
                        depth = 0;
                        continue;
                    }
                // Simply skip the colon that separates the name and value
                } else if (c === 58) { // ":"
                    if (!depth && !key && values.length === 1) {
                        key = values.pop();
                        continue;
                    }
                // A set of slashes is initially matched as a regular expression, but could be division
                } else if (c === 47 && i && tok.length > 1) {  // "/"
                    // Look at the end of the previous token to determine if the slash is actually division
                    var match = toks[i-1].match(divisionLookBehind);
                    if (match && !keywordRegexLookBehind[match[0]]) {
                        // The slash is actually a division punctuator; re-parse the remainder of the string (not including the slash)
                        str = str.substr(str.indexOf(tok) + 1);
                        toks = str.match(token);
                        toks.push(',');
                        i = -1;
                        // Continue with just the slash
                        tok = '/';
                    }
                // Increment depth for parentheses, braces, and brackets so that interior commas are ignored
                } else if (c === 40 || c === 123 || c === 91) { // '(', '{', '['
                    ++depth;
                } else if (c === 41 || c === 125 || c === 93) { // ')', '}', ']'
                    --depth;
                // The key will be the first token; if it's a string, trim the quotes
                } else if (!key && !values.length && (c === 34 || c === 39)) { // '"', "'"
                    tok = tok.slice(1, -1);
                }
                values.push(tok);
            }
        }
        return result;
    }
}()

PxerHtmlParser.getKeyFromStringObjectLiteral =function(s, key) {
    var resolvedpairs = this.parseObjectLiteral(s);
    for (var pair of resolvedpairs) {
        if (pair[0] ===key) return pair[1];
    }
    throw new Error("Key not found.");
};
