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
<div id="applet1"></div> | `{ggbBase64: base64, id: 'applet1', enableRightClick: false}` |
<div id="applet2"></div> | `{id: 'applet2', enableShiftDragZoom: false}` |
<div id="applet3"></div> | `{id: 'applet3', borderColor: 'none', enableRightClick: false}` |
<div id="applet4"></div> | `{enableShiftDragZoom: false, borderColor: 'none'}` |
<div id="applet5"></div> | `{id: 'applet5', enableRightClick: true}` |

图样 | 参数 |
-|-|
<div id="applet7"></div> | `{showToolBar: true, enableRightClick: false}` |
<div id="applet8"></div> | `{showMenuBar: true, enableFileFeatures: false}` |
<div id="applet9"></div> | `{showAlgebraInput: true, width: 600, height: 200}` |

<script src="js/hello_ggb_params.js"></script>

## 参考资料

- [GeoGebra Apps Embedding](https://wiki.geogebra.org/en/Reference:GeoGebra_Apps_Embedding)
