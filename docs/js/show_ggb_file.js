var ggbApp = new GGBApplet({filename: 'images/2d2.ggb'});
ggbApp.setHTML5Codebase(window.ggbCodebase + 'web/');
ggbApp.inject('ggb-applet');

$('#file-upload').on('change', function () {
  var file = this.files[0];
  var reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = function(e) {
    var base64 = e.target.result.replace(/^data:;base64,/, '');
    $('textarea').val(base64);
    ggbApplet.setBase64(base64);
  };
});
