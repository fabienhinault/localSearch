var box = document.getElementById('box');

var search = function(event){
    self.port.emit('search', box.value);
};

$('#button').bind('click', search);
$('#box').keypress(function( event ) {
    if ( event.which == 13 ) {
        search(event);
    }
});

self.on('message', function(q, urls) {
  $('#quota').text(q);
  var resultsHtml = $('#results');
  resultsHtml.empty();
  urls.forEach(function(obj){
    var urlHtml = $('#template .result-item').clone();
    urlHtml.find('.url').text(obj.url).attr('href', obj.url);
    urlHtml.find('.number').text(obj.number);
    resultsHtml.append(urlHtml);
  });
});
