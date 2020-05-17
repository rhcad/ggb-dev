# 指定base64编码加载GGB课件

本例说明通过base64编码加载GGB图形到网页。

<div id="applet" style="display: inline-block"></div>
<div id="applet2" style="display: inline-block"></div>
<script src="js/hello_ggb_from_base64.js"></script>

如果先显示了其它页面的二维图形（用`web`引擎渲染），而本页使用`web3d`引擎渲染，则上图将提示“不能打开文件”，
因为同一个页面中只支持一种渲染引擎。遇到此问题，强制刷新本页即可。

如果要在一行显示两个GGB图块，可将这两个容器DIV设置为`display: inline-block`样式。

## 在本Markdown文中加载

```html
<div id="applet"></div>
<script src="js/hello_ggb_from_base64.js"></script>
```

```js
// hello_ggb_from_base64.js
var applet = new GGBApplet({ggbBase64: 'UEsDBBQACAgIAGOydU.....AAA=='});
applet.setHTML5Codebase(window.ggbCodebase + 'web3d/');
applet.inject('applet');
```

## 在单独网页中加载

```html
<div id="applet"></div>
<script src="../GeoGebra/deployggb.js"></script>
<script>
  var applet = new GGBApplet({
    ggbBase64: 'UEsDBBQACAgIAGOydUkAA.....AAQACAEAADgQAAAAAA=='
  });
  applet.setHTML5Codebase('../GeoGebra/HTML5/5.0/web3d/', true);
  window.onload = function() {
    applet.inject('applet');
  };
</script>
```

`ggbBase64` 为GGB文件的base64编码内容，可用下面一种方法获得：
  - 使用“Base64Anywhere”等工具，从ggb文件得到base64编码文本
  - 在GeoGebra官方软件中打开课件，按下组合键 Ctrl + Shift + B (Windows) 或 Cmd + Shift + B (Mac) 得到base64文本
  - 编写js或py代码从GGB文件得到，见“平台开发”的 [选择并展示GGB文件](show_ggb_file)
