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
  $('#quota').text(q);
  var resultsHtml = $('#results');
  resultsHtml.empty();
  var obj;
  for (obj in urls) {
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
