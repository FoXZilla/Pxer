const Path =require('path');
const Fs =require('fs');
const PxerUtility =require('./pxer-utility.js');

const readerTpl =Fs.readFileSync('./support.jstpl.ejs').toString();
const renderData ={
    master:{
        appClass    :PxerUtility.path2URL('../dist/pxer-core.js'),
        viewTpl     :PxerUtility.path2URL('../dist/view/template.html'),
        viewStyles  :PxerUtility.path2URL('../dist/view/style.css'),
        viewScripts :[
            '../dist/view/vue.min.js',
            '../dist/view/vue-i18n.min.js',
            '../dist/view/vm.js',
        ].map(path=>PxerUtility.path2URL(path)),
        afterRun    :PxerUtility.path2URL('../dist/run.js'),
        linkResource:PxerUtility.getAllFile('../dist/public/')
            .filter(path=>/\.(css|ico)$/.test(path))
            .map(path=>PxerUtility.path2URL(path))
        ,
    },
    dev   :{
        appClass    :PxerUtility.groupFile(
            PxerUtility.getAllFile('../src/app/class/')
                .map(path=>PxerUtility.path2URL(path))
                .filter(fileName=>/\.js$/.test(fileName))
        ),
        viewTpl     :PxerUtility.path2URL('../src/view/template.html'),
        viewStyles  :PxerUtility.path2URL('../src/view/style.css'),
        viewScripts :[
            '../src/view/vue.dev.js',
            '../src/view/vue-i18n.js',
            '../src/view/vm.js',
        ].map(path=>PxerUtility.path2URL(path)),
        afterRun    :PxerUtility.getAllFile('../src/run/').map(path=>PxerUtility.path2URL(path)),
        linkResource:PxerUtility.getAllFile('../src/public/')
            .filter(path=>/\.(css|ico)$/.test(path))
            .map(path=>PxerUtility.path2URL(path))
        ,
    },
};



var devSave ='../src/app/support.js';
console.log('build '+Path.resolve(devSave));
Fs.writeFileSync(
    devSave,
    PxerUtility.automaticDoc(__filename)+
    PxerUtility.reader(readerTpl,renderData['dev'])
);
var masterSave ='../dist/support.js';
console.log('build '+Path.resolve(masterSave));
Fs.writeFileSync(
    masterSave,
    PxerUtility.babelTransform(
        PxerUtility.automaticDoc(__filename)+
        PxerUtility.reader(readerTpl,renderData['master'])
    )
);