var box = document.getElementById('box');

var search = function(event){
  console.log('search');
  self.port.emit('search', box.value);
};

$('#erase').bind('click', function(){
  self.port.emit('erase');
});

$('#button').bind('click', search);
$('#box').keypress(function( event ) {
    if ( event.which == 13 ) {
        search(event);
    }
});

self.on('message', function(q, urls) {
  console.log('message');
  console.log(urls);
  var resultsHtml = $('#results');
  resultsHtml.empty();
  var obj;
  urls.forEach(function (obj) {
    var urlHtml = $('#template .result-item').clone();
    urlHtml.find('.url').text(obj.url).attr('href', obj.url);
    urlHtml.find('.number').text(obj.number);
    resultsHtml.append(urlHtml);
  });
  $('a.blacklist').bind('click', blacklist);
});

var blacklist = function(event) {
  console.log('blacklist');
  console.log($(this).prevAll('a.url').attr('href'));
  self.port.emit('blacklist', $(this).prevAll('a.url').attr('href'));
};
