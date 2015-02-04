var box = document.getElementById('box');

$('#button').bind('click', function(event){
    console.log('click');
    console.log(box.value);
    self.port.emit('search', box.value);
});

self.on('message', function(urls) {
  console.log('message');
  console.log(urls);
  var resultsHtml = $('#results');
  resultsHtml.empty();
  for (var url in urls){
      var urlHtml = $('#template .result-item').clone();
      urlHtml.find('.url').text(url).attr('href', url);
      resultsHtml.append(urlHtml);
  }
});
