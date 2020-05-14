# GGBApplet 常见的图框参数

本页说明在网页上展示 GeoGebra 课件时 `GGBApplet` 函数的常用参数，也说明了一页展示多个课件的方法。
例如：
```js
var applet1 = GGBApplet({ggbBase64: base64, id: 'applet1', enableRightClick: false});
applet1.setHTML5Codebase(window.ggbCodebase + 'web/');
applet1.inject();
```

图样 | 参数 |
-|-|
<div id="applet1"></div> | `{ggbBase64: base64, id: 'applet1', enableRightClick: false}` <br> **enableRightClick**： 是否允许鼠标右键弹出上下文菜单。 |
<div id="applet2"></div> | `{id: 'applet2', enableShiftDragZoom: false}` <br> **enableShiftDragZoom**：是否允许用鼠标拖放和滚轮放缩显示。  |
<div id="applet3"></div> | `{id: 'applet3', borderColor: 'none', enableRightClick: false}` <br> **borderColor**：图框颜色，`none`表示无边框。  |
<div id="applet4"></div> | `{enableShiftDragZoom: false, borderColor: 'none'}` |
<div id="applet5"></div> | `{id: 'applet5', enableLabelDrags: false}` <br> **enableLabelDrags**：是否允许拖动标签。 |

图样 | 参数 |
-|-|
<div id="applet7"></div> | `{showToolBar: true, enableRightClick: false}` <br> **showToolBar**：是否允许工具栏。  |
<div id="applet8"></div> | `{showMenuBar: true, enableFileFeatures: false}` <br> **showMenuBar**：是否允许菜单栏。<br> **enableFileFeatures**：是否允许文件菜单。  |
<div id="applet9"></div> | `{showAlgebraInput: true, width: 600, height: 200}` <br> **showAlgebraInput**：是否允许命令输入框。<br>**algebraInputPosition**：输入框的位置。 |

<script src="js/hello_ggb_params.js"></script>

## 说明

- `setHTML5Codebase(window.ggbCodebase + 'web/');` 设置使用哪种渲染引擎，有下列三种引擎可选：
  - `webSimple`: 轻量级简单版，单一视图，没有工具栏、菜单栏、命令框，不支持CAS、3D等其它视图。
  - `web`: 二维完整版，支持工具栏、菜单栏、多视图等。
  - `web3d`: 基于WebGL的真3D完整版，在低版本IE浏览器中[不支持](https://caniuse.com/#feat=webgl)。
  
  注意：同一个页面中只支持一种渲染引擎，在SPA应用中需要留意此限制。

- 更多参数，见下 GeoGebra App Parameters 的说明。

## 参考资料

- [GeoGebra Apps Embedding](https://wiki.geogebra.org/en/Reference:GeoGebra_Apps_Embedding)
- [GeoGebra App Parameters](https://wiki.geogebra.org/en/Reference:GeoGebra_App_Parameters)
