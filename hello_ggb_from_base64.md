# 指定base64编码加载GGB课件

本例说明通过base64编码加载GGB图形到网页。

<div id="applet"></div>
<script src="js/hello_ggb_from_base64.js"></script>

如果先显示了其它页面的二维图形（用`web`引擎渲染），而本页使用`web3d`引擎渲染，则上图将提示“不能打开文件”，
因为同一个页面中只支持一种渲染引擎。遇到此问题，强制刷新本页即可。

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
