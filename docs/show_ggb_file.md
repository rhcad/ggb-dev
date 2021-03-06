# 在网页中选择并展示GGB文件

本例说明在网页上选择本地GGB文件并得到base64编码内容、在线展示的方法。

<input id="file-upload" type="file" accept=".ggb" />
<textarea readonly rows="3" style="width: 100%;">这里将显示选中文件的base64编码文本（ggbBase64 值）。</textarea>

点击上面的文件按钮，选择一个GGB文件，将显示`ggbBase64`内容和图形内容。

<div id="ggb-applet"></div>
<script src="js/show_ggb_file.js"></script>

```html
<input id="file-upload" type="file" accept=".ggb" />
<div id="ggb-applet"></div>
```

```js
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
```

代码说明：
1. 实现原理是先显示一个空的GGB图框，然后选择文件并将读取内容到图框。
2. `ggbApplet` 全局变量是由 `GGBApplet` 函数自动创建的，如果在创建图框时未指定`id`参数则默认使用 `ggbApplet`。
3. `reader.readAsDataURL` 将得到文件的base64编码串。

可查看在单独网页里选择并展示GGB课件的 <a href="https://rhcad.github.io/ggb-dev/show_ggb_file.html" target="_blank">完整例子</a>。
