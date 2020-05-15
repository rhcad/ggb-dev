var ggbApp = new GGBApplet({});
ggbApp.setHTML5Codebase(window.ggbCodebase + 'web/');
ggbApp.inject('ggb-applet');

$('#file-upload').on('change', function () {
  var file = this.files[0];
  var reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = function(e) {
    ggbApplet.setBase64(e.target.result);
  };
});
