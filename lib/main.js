var widgets = require('sdk/widget');
var tabs = require("sdk/tabs");
var self = require("sdk/self");
var { indexedDB } = require('sdk/indexed-db');
var data = require('sdk/self').data;
var data = require('sdk/self').data;
var pageMod = require("sdk/page-mod");


var request = indexedDB.open('localSearch');
request.onupgradeneeded = function(event) {
  var db = event.target.result;
  var objectStore = db.createObjectStore("words", { keyPath: "word" });
};



var searchIsOn = true;

function toggleActivation() {
  searchIsOn = !searchIsOn;
  return searchIsOn;
}
exports.main = function() {
  var widget = widgets.Widget({
    id: 'toggle-switch',
    label: 'Annotator',
    contentURL: data.url('widget/pencil-on.png'),
    contentScriptWhen: 'ready',
    contentScriptFile: data.url('widget/widget.js')
  });

  widget.port.on('left-click', function() {
    tabs.open(data.url('page/search.html'));
  });

  widget.port.on('right-click', function() {
    widget.contentURL = toggleActivation() ?
              data.url('widget/pencil-on.png') :
              data.url('widget/pencil-off.png');
  });
}

var searchPageMod = pageMod.PageMod({
  include: [data.url('page/search.html')],
  contentScriptWhen: 'ready',
  contentScriptFile: [data.url('jquery-1.11.2.js'),
                      data.url('page/search.js')],
  onAttach: attachSearch
});

function attachSearch(worker){
  var getSearchResult = function(word){
    var wordsObjectStore =
      indexedDB.transaction(["words"], "read").objectStore("words");
    var get = wordsObjectStore.get(word)
    get.onsuccess = function(event){
      worker.postMessage(get.result);
    }
    get.onfailure = function(event){
      worker.postMessage("Object store get failure");
    }
  }
}



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
  var pageWords = content.split(/\W+/);
  var map = {};
  var addWord = function(word){
    if (!map[word]){
      map[word] = 1;
    }
    else{
      map[word] += 1;
    }
  };
  pageWords.map(addWord);

  // Store values in the newly created objectStore.
  var wordsObjectStore =
    indexedDB.transaction(["words"], "readwrite").objectStore("words");
  for (var word in map){
    var get = wordsObjectStore.get(word)
    get.onsuccess = function(event){
      var data = get.result;
      data.urls[url] = map[word];
      var put = wordsObjectStore.put(data);
      put.onerror = function(event){
          // log
      }
    }
    get.onerror = function(event){
      var data ={word: word, urls: {}};
      data.urls[url] = map[word];
      var put = wordsObjectStore.add(data);
      put.onerror = function(event){
        // log
      }
    }
  }
}
