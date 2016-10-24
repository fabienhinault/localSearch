
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







var database = {};

database.onerror = function(e) {
  console.error(e.value)
}

function open(version) {
  var request = indexedDB.open("stuff", version);

  request.onupgradeneeded = function(e) {
    var db = e.target.result;
    e.target.transaction.onerror = database.onerror;

    if(db.objectStoreNames.contains("words")) {
      db.deleteObjectStore("words");
    }

    var store = db.createObjectStore("words",
                                     {keyPath:'word'});
  };

  request.onsuccess = function(e) {
    database.db = e.target.result;
  };

  request.onerror = database.onerror;
};



function listItems(itemList) {
  console.log(itemList);
}

open("1");

var add = require("sdk/ui/button/action").ActionButton({
  id: "add",
  label: "Add",
  icon: "./add.png",
  onClick: function() {
    addItem(require("sdk/tabs").activeTab.title);
  }
});

var list = require("sdk/ui/button/action").ActionButton({
  id: "list",
  label: "List",
  icon: "./list.png",
  onClick: function() {
    getItems(listItems);
  }
});









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

function searchInStorage(word, worker) {
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
}

function searchInDb(word, worker) {
  var db = database.db;
  var trans = db.transaction(["words"], "readwrite");
  var store = trans.objectStore("words");
  var get = store.get(word);
  var result = [];
  get.onsuccess = function(e){
    var data = get.result;
    console.log("success");
    console.log(e);
    console.log(word);
    console.log(data);
    var urlCounts = data['urls'];
    var url;
    for (url in urlCounts) {
      result.push({url: url, number: urlCounts[url]});
    }
    //sort in reverse order
    result.sort(function(a, b){return b.number - a.number;});
    worker.postMessage(0, result);
  };
  get.onerror = function(e){
    console.log("failure");
    console.log(word);
    worker.postMessage(0, {});
  };
}



function blacklisted(url) {
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
      worker.port.on("innerHTML", storeData);
      worker.port.on("innerHTML", storeDataDB);
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
  
  // TODO replace map[word][url] with map[word]
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

function storeDataDB(data){ 
  var content = data.content;
  var url = data.url;
  var pageWords = content.split(/\W+/);
  var wordCounts = {};
  var addWord = function(word){
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
      console.log(word + " success");
      var wordMap = get.result;
      console.log(wordMap);
      if (undefined !== wordMap){
        // word is already in DB: just add current URL with nb of occurences
        console.log(word + " found");
        wordMap.urls[url] = wordCounts[word];
        var put = store.put(wordMap);
        put.onerror = database.onerror;
      } else {
        console.log(word + " not found");
        var data = {'word': word, 'urls': {}};
        data.urls[url] = count;
        var add = store.add(data);
        add.onerror = database.onerror;
        add.onsuccess = function (e) {
          var get = store.get(word);
          get.onerror = database.onerror;
          get.onsuccess = function (e) {console.log(get.result);};
        };
      }
    } catch(exception) {
      console.log('caught: ' + exception);
    }
  };
  
  var onWordGetError = function (word) {
    //console.log(word + " not found");

  };
  var addWord = function(word, store, count) {
    console.log(word);
    var get = store.get(word);
    get.onsuccess = function(event){
      console.log(event);
      console.log(word + " onsuccess");
      onWordGetSuccess(get, word, store, count);
      // try{
      //   var wordMap = get.result;
      //   console.log(wordMap);
      // } catch(exception) {
      //   console.log("catched " + exception);
      // }

    }
    // get.onerror = function(event){
    //   //console.log(event);
    //   onWordGetError(word, store);
    // }
    get.onerror = database.onerror;
  };
  
  var db = database.db;
  var trans = db.transaction(["words"], "readwrite");
  var store = trans.objectStore("words");
  // Store values in the newly created objectStore.

  var iWord;
  // for (iWord = 0; iWord < 5; iWord++){
    // var key = Object.keys(wordCounts)[iWord];
    // addWord(key, store, wordCounts[key]);
  // }
  for (var word in wordCounts){
    addWord(word, store, wordCounts[word]);
  }
}
