# 指定文件名加载GGB课件

本例说明通过filename参数加载GGB文件到网页。

<div id="applet"></div>
<script src="js/hello_ggb_from_file.js"></script>

## 在单独网页中加载

```html
<div id="applet"></div>
<script src="../GeoGebra/deployggb.js"></script>
<script>
  var applet = new GGBApplet({filename: 'images/2d.ggb'});
  applet.setHTML5Codebase('../GeoGebra/HTML5/5.0/web/', true);
  window.onload = function() {
    applet.inject('applet', 'html5');
  };
</script>
```

## 在本Markdown文中加载

- 在 `index.html` 中加载了 `external-script` 的 docsify 插件：`<script src="external-script.min.js"></script>`。
- 将加载GGB文件的代码写在js文件而不是嵌入在html中，可避免动态渲染引起的执行失效问题。

```html
这是Markdown文中的内容：
<div id="applet"></div>
<script src="js/hello_ggb_from_file.js"></script>
```

```js
// hello_ggb_from_file.js
var applet = new GGBApplet({filename: 'images/2d.ggb'});
applet.setHTML5Codebase(window.ggbCodebase + 'web/');
applet.inject('applet');
```
