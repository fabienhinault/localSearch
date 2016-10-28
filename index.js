
var tabs = require("sdk/tabs");
var self = require("sdk/self");
var simpleStorage = require('sdk/simple-storage');
var { indexedDB, IDBKeyRange } = require('sdk/indexed-db');
var data = require('sdk/self').data;
var pageMod = require("sdk/page-mod");
var buttons = require('sdk/ui/button/action');
var reHost = /^.*\:\/\/[^\/]*\//;
var database = {};

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


database.onerror = function(e) {
  console.error(e.value)
}


function handleClick(state) {
  tabs.open(data.url('page/search.html'));
}

function initLocalStorage() {
  if (!simpleStorage.storage.localSearchBlacklist) {
    simpleStorage.storage.localSearchBlacklist = {
      'https://www.google.fr/' : true,
      'resource://haystack/' : true
    };
  }
}

var database = {};

database.onerror = function(e) {
  console.error(e);
  console.error(e.value);
}

function open(version) {
  var request = indexedDB.open("stuff", version);

  request.onupgradeneeded = function(e) {
    var db = e.target.result;
    e.target.transaction.onerror = database.onerror;

    if(db.objectStoreNames.contains("words")) {
      db.deleteObjectStore("words");
    }

    var store = db.createObjectStore("words", {keyPath:'word'});
  };

  request.onsuccess = function(e) {
    database.db = e.target.result;
  };

  request.onerror = database.onerror;
}

open("1");
initLocalStorage();

var searchIsOn = true;

function toggleActivation() {
  searchIsOn = !searchIsOn;
  return searchIsOn;
}

var searchPageMod = pageMod.PageMod({
  include: [data.url('page/search.html')],
  contentScriptWhen: 'ready',
  contentScriptFile: [data.url('jquery-3.1.1.js'),
                      data.url('page/search.js')],
  onAttach: function(worker) {
    worker.port.on('search', function(word){
      // searchInStorage(word, worker);
      searchInDb(word, worker);
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

function searchInDb(word, worker) {
  var db = database.db;
  var trans = db.transaction(["words"], "readwrite");
  var store = trans.objectStore("words");
  var get = store.get(word);
  var result = [];
  
  get.onsuccess = function(e){
    try {
      var data = get.result;
      var urlCounts = data['urls'];
      var url;
      for (url in urlCounts) {
        result.push({url: url, number: urlCounts[url]});
      }
      //sort in reverse order
      result.sort(function(a, b){return b.number - a.number;});
      worker.postMessage(0, result);
    } catch (exception) {
      console.error("caught: " + exception);
    }
  };
  
  get.onerror = function(e){
    console.log("failure");
    console.log(word);
    worker.postMessage(0, {});
  };
}

function blacklisted(url) {
  // whether the url, truncated to <protocol>://<host>/, is in local storage
  return  !!simpleStorage.storage.localSearchBlacklist[
    url.match(reHost)];
}

tabs.on("ready", crawl);

function crawl(tab){
  if (searchIsOn &&
    !require("sdk/private-browsing").isPrivate(tab) &&
    !blacklisted(tab.url)){
      var worker = tab.attach({
        contentScriptFile: self.data.url("addUrl.js")
      });
      worker.port.on("innerHTML", storeDataDB);
  }
}

function storeDataDB(data){
  console.log('storeDataDB ' + data);
  var content = data.content;
  var url = data.url;
  var pageWords = content.split(/\W+/);
  var wordCounts = {};
  var addWord = function(word){
    console.log(word);
    if (!wordCounts[word]){
      wordCounts[word] = 1;
    }
    else{
      wordCounts[word] += 1;
    }
  };
  pageWords.map(addWord);

  var onWordGetSuccess = function (get, word, store, count) {
    try{
      var wordMap = get.result;
      console.log(wordMap);
      if (undefined !== wordMap){
        // word is already in DB: just add current URL with nb of occurences
        wordMap.urls[url] = wordCounts[word];
        var put = store.put(wordMap);
        put.onerror = database.onerror;
      } else {
        var data = {'word': word, 'urls': {}};
        data.urls[url] = count;
        var add = store.add(data);
        add.onerror = database.onerror;
      }
    } catch(exception) {
      console.log('caught: ' + exception);
    }
  };

  var addWord = function(word, store, count) {
    var get = store.get(word);
    get.onsuccess = function(event){
      onWordGetSuccess(get, word, store, count);
    }
    get.onerror = database.onerror;
  };

  var db = database.db;
  var trans = db.transaction(["words"], "readwrite");
  var store = trans.objectStore("words");
  // Store values in the newly created objectStore.
  for (var word in wordCounts){
    addWord(word, store, wordCounts[word]);
  }
}
