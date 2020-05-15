# 在线展示GGB的基本范例

本页说明在网页上展示 GeoGebra 课件的基本方法，以此可在自己网站或博客中在线展示GGB课件。

<div id="ggb-applet"></div>
<script src="js/hello_ggb.js"></script>

1. 在网页中加一个GGB课件的 div 占位容器元素：
```html
<div id="ggb-applet"></div> 
```

2. 引用核心脚本文件`deployggb.js`，其中有 `GGBApplet` 函数：
```js
<script src="https://www.geogebra.org/apps/deployggb.js"></script>
```
在docsify等动态渲染的Markdown正文中使用时，将此脚本引用加到 `index.html` 中提前引用，避免 `GGBApplet` 函数找不到。

3. 向占位容器元素注入GGB图形：
```js
<script>
  var ggbApp = new GGBApplet({
    width: 600, height: 245,
    ggbBase64: 'UEsDBBQACAAI......APl5=='
  }, 'ggb-applet');
  ggbApp.setHTML5Codebase('https://www.geogebra.org/apps/latest/webSimple/');
  window.onload = function() { ggbApp.inject('html5'); }
</script>
```

- 其中的 `width` 和 `height` 为课件的期望显示宽高，整数像素值。如果不指定则使用GGB文件中的默认宽高显示。

- `ggbBase64` 为GGB文件的base64编码内容，可用下面一种方法获得：
  - 使用“Base64Anywhere”等工具，从ggb文件得到base64编码文本
  - 在GeoGebra官方软件中打开课件，按下组合键 Ctrl + Shift + B (Windows) 或 Cmd + Shift + B (Mac) 得到base64文本
  - 编写js或py代码从GGB文件得到，后续再介绍此方法

- 'ggb-applet' 参数值为容器元素ID。既可以在GGBApplet函数中传入此参数（参数顺序无所谓），也可以在注入时传入：
  ```js
  ggbApp.inject('ggb-applet', 'html5');
  ggbApp.inject('ggb-applet');
  ```
  `window.onload` 表示在网页加载完成后就自动执行注入。如果是在动态渲染的博客文章中就直接 inject，因为已经加载完成了，
  并且建议将注入的代码放在 js 文件中，避免因动态渲染错过执行时机，参见本文所用的 <a href="/js/hello_ggb.js" target="_blank">hello_ggb.js</a>。

- 如果要离线使用，可 [下载][bundle] apps-bundle 到本地，引用本地的 `deployggb.js` 地址，同时设置`setHTML5Codebase`：
  ```js
  ggbApp.setHTML5Codebase('GeoGebra/HTML5/5.0/webSimple/', true); // offline=true
  ```

可查看在单独网页里展示GGB课件的 <a href="/hello_ggb.html" target="_blank">完整例子</a>。

## 参考资料

- [GeoGebra Apps Embedding](https://wiki.geogebra.org/en/Reference:GeoGebra_Apps_Embedding)

[bundle]: https://download.geogebra.org/package/geogebra-math-apps-bundle
