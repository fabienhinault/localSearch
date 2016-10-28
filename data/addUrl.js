var strPageContent = document.body.innerHTML;
var url = document.location.toString();
self.port.emit("innerHTML", {url: url, content: strPageContent});
