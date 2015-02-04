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
//    console.log('attach');
    worker.port.on('search', function(word) {
//      console.log('search');
//      console.log(word);
      worker.postMessage(simpleStorage.storage.localSearch[word]);
    });
  }
});


tabs.on("ready", crawl);

function crawl(tab){
  if (searchIsOn){
      var worker = tab.attach({
        contentScriptFile: self.data.url("addUrl.js")
      });
      worker.port.on("innerHTML", storeData);
  }
}
  
function storeData(data){
  var content = data.content;
  var url = data.url;
//  console.log(url);
  var pageWords = content.split(/\W+/);
  var map = {};
  var addWord = function(word){
    if (map[word]){
        if (map[word][url]){
            map[word][url] += 1;
        } else {
            map[word][url] = 1;
        }
    } else {
        map[word] = {};
        map[word][url] = 1;
    }
  };
  pageWords.map(addWord);
  var storedMap = simpleStorage.storage.localSearch;
  for (var word in map){
      if(!storedMap[word]){
          storedMap[word] = {};
      }
      storedMap[word][url] = map[word][url];
  }
//  console.log(map);
}
