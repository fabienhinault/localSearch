//var self = require('sdk/self');
//
//// a dummy function, to show how tests work.
//// to see how to test this function, look at test/test-index.js
//function dummy(text, callback) {
//  callback(text);
//}
//
//exports.dummy = dummy;

var tabs = require("sdk/tabs");
var self = require("sdk/self");
var simpleStorage = require('sdk/simple-storage');
var data = require('sdk/self').data;
var pageMod = require("sdk/page-mod");
var buttons = require('sdk/ui/button/action');


var button = buttons.ActionButton({
  id: "haystack",
  label: "open search tab",
  icon: {
    "16": "./v57983_16x16.png",
    "32": "./v57983_32x32.png",
    "64": "./v57983.png"
  },
  onClick: handleClick
});

function handleClick(state) {
  tabs.open(data.url('page/search.html'));
}

if (!simpleStorage.storage.localSearch){
  simpleStorage.storage.localSearch = {};
}
if (!simpleStorage.storage.localSearchUrls){
  simpleStorage.storage.localSearchUrls = {};
}
if (!simpleStorage.storage.localSearchCounter){
  simpleStorage.storage.localSearchCounter = 0;
}
if (!simpleStorage.storage.localSearchIndexes){
  simpleStorage.storage.localSearchIndexes = {};
}

var searchIsOn = true;

function toggleActivation() {
  searchIsOn = !searchIsOn;
  return searchIsOn;
}

var searchPageMod = pageMod.PageMod({
  include: [data.url('page/search.html')],
  contentScriptWhen: 'ready',
  contentScriptFile: [data.url('jquery-1.11.2.js'),
                      data.url('page/search.js')],
  onAttach: function(worker) {
    worker.port.on('search', function(word) {
      var storedResult = simpleStorage.storage.localSearch[word];
      var result = [];
      var index;
      for (index in storedResult){
        result.push({url:simpleStorage.storage.localSearchUrls[index] || index,
                     number:storedResult[index]});
      }
      //sort in reverse order
      result.sort(function(a, b){return b.number - a.number;});
      worker.postMessage(simpleStorage.quotaUsage,
                         result);
    });
    worker.port.on('erase', function() {
      simpleStorage.storage.localSearch = {};
      simpleStorage.storage.localSearchUrls = [];
    });
  }
});

tabs.on("ready", crawl);

function crawl(tab){
  if (searchIsOn && !require("sdk/private-browsing").isPrivate(tab)){
      var worker = tab.attach({
        contentScriptFile: self.data.url("addUrl.js")
      });
      worker.port.on("innerHTML", storeData);
  }
}

function storeData(data){
  var content = data.content;
  var url = data.url;
  var index = simpleStorage.storage.localSearchUrls[url];
  var pageWords = content.split(/\W+/); // / ,;\:!\?\./§%\* .../
  var map = {};
  var storedMap = simpleStorage.storage.localSearch;
  var addWord = function(word){
    if (!map[word]){
        map[word] = {};
    }
    if (map[word][url]){
        map[word][url] += 1;
    } else {
        map[word][url] = 1;
    }
  };
  var index;
  if (!(url in simpleStorage.storage.localSearchIndexes)) {
    simpleStorage.storage.localSearchIndexes[url] =
      simpleStorage.storage.localSearchcounter;
    simpleStorage.storage.localSearchIndexes[
      simpleStorage.storage.localSearchcounter] = url;
    index = simpleStorage.storage.localSearchcounter;
    simpleStorage.storage.localSearchcounter++;
  } else {
    index = simpleStorage.storage.localSearchIndexes[url];
  }
  pageWords.map(addWord);
  for (var word in map){
    if(!storedMap[word]){
      storedMap[word] = {};
    }
    storedMap[word][index] = map[word][url];
  }
}

