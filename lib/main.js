var widgets = require('sdk/widget');
var tabs = require("sdk/tabs");
var self = require("sdk/self");
var simpleStorage = require('sdk/simple-storage');
var data = require('sdk/self').data;
var data = require('sdk/self').data;
var pageMod = require("sdk/page-mod");


if (!simpleStorage.storage.localSearch){
  simpleStorage.storage.localSearch = {};
}
if (!simpleStorage.storage.localSearchUrls){
  simpleStorage.storage.localSearchUrls = [];
}

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
  onAttach: function(worker) {
    worker.port.on('search', function(word) {
      var storedResult = simpleStorage.storage.localSearch[word];
      var result = [];
      var index;
      for (index in storedResult){
        result.push({url:simpleStorage.storage.localSearchUrls[index],
                     number:storedResult[index]});
      }
      //sort in reverse order
      result.sort(function(a, b){return b.number - a.number;});
      worker.postMessage(simpleStorage.quotaUsage,
                         result);
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
  var index = simpleStorage.storage.localSearchUrls.push(url) - 1;
  var pageWords = content.split(/\W+/);
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
  pageWords.map(addWord);
  var storedMap = simpleStorage.storage.localSearch;
  for (var word in map){
      if(!storedMap[word]){
        storedMap[word] = {};
      }
      storedMap[word][index] = map[word][url];
  }
}
