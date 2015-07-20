var strPageContent = document.body.innerHTML;
var url = document.location.toString();
//console.log(url);
if (!(url.match("google"))) {
  self.port.emit("innerHTML", {url: url, content: strPageContent});
}
