var strPageContent = document.body.innerHTML;
var url = document.location.toString();
//console.log(url);
self.port.emit("innerHTML", {url: url,
                             content: strPageContent});
