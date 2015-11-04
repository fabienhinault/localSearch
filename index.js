
var tabs = require("sdk/tabs");
var self = require("sdk/self");
var simpleStorage = require('sdk/simple-storage');
var data = require('sdk/self').data;
var pageMod = require("sdk/page-mod");
var buttons = require('sdk/ui/button/action');
var reHost = /^.*\:\/\/[^\/]*\//;

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

function initLocalStorage() {
  if (!simpleStorage.storage.localSearch){
    simpleStorage.storage.localSearch = {};
  }
  if (!simpleStorage.storage.localSearchUrls){
    simpleStorage.storage.localSearchUrls = {};
  }
  var index = 0;
  if (Array.isArray(simpleStorage.storage.localSearchUrls)){
    var urlsArray = simpleStorage.storage.localSearchUrls;
    var urls = {};
    for(index = 0;
        index < urlsArray.length;
        index++){
      var url = urlsArray[index];
      urls[index] = url;
    }
    simpleStorage.storage.localSearchUrls = urls;
    simpleStorage.storage.localSearchIndex = index;
  }
  if (!simpleStorage.storage.localSearchIndexes){
    simpleStorage.storage.localSearchIndexes = {};
    for(index in Object.keys(simpleStorage.storage.localSearchUrls)) {
      var url = simpleStorage.storage.localSearchUrls[index];
      simpleStorage.storage.localSearchIndexes[url] = index;
    }
  }
  if (!simpleStorage.storage.localSearchIndex) {
    simpleStorage.storage.localSearchIndex = index;
  }
  if (!simpleStorage.storage.localSearchBlacklist) {
    simpleStorage.storage.localSearchBlacklist = {
      'https://www.google.fr/' : true,
    };
  }
}

initLocalStorage();

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
        var url = simpleStorage.storage.localSearchUrls[index] || index;
        if (blacklisted(url)) {
          delete simpleStorage.storage.localSearch[word][url];
        } else {
          result.push({url: url, number: storedResult[index]});
        }
      }
      //sort in reverse order
      result.sort(function(a, b){return b.number - a.number;});
      worker.postMessage(simpleStorage.quotaUsage, result);
    });
    worker.port.on('erase', function() {
      simpleStorage.storage.localSearch = {};
      simpleStorage.storage.localSearchUrls = {};
      simpleStorage.storage.localSearchIndexes = {};
      simpleStorage.storage.localSearchIndex = 0;
    });
    worker.port.on('blacklist', function(url) {
      simpleStorage.storage.localSearchBlacklist[url.match(reHost)] = true;
    });
  }
});

function blacklisted(url) {
  return  !!simpleStorage.storage.localSearchBlacklist[
    url.match(reHost)];
}

tabs.on("ready", crawl);

function crawl(tab){
  if (searchIsOn && !require("sdk/private-browsing").isPrivate(tab) && !blacklisted(tab.url)){
      var worker = tab.attach({
        contentScriptFile: self.data.url("addUrl.js")
      });
      worker.port.on("innerHTML", storeData);
  }
}

function storeData(data){
  var content = data.content;
  var url = data.url;
  var index = simpleStorage.storage.localSearchIndex;
  if (undefined === simpleStorage.storage.localSearchIndexes[url])
  {
    simpleStorage.storage.localSearchIndexes[url] = index;
    simpleStorage.storage.localSearchUrls[index] = url;
    simpleStorage.storage.localSearchIndex++;
  } else {
    index = simpleStorage.storage.localSearchIndexes[url];
  }
  var pageWords = content.split(/\W+/); // / ,;\:!\?\./§%\* .../
  var map = {};
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
  pageWords.map(function(str){return str.toLowerCase();}).map(addWord);
  var storedMap = simpleStorage.storage.localSearch;
  for (var word in map){
      if(!storedMap[word]){
        storedMap[word] = {};
      }
      storedMap[word][index] = map[word][url];
  }
}

