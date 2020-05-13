/*
 @author: GeoGebra - Dynamic Mathematics for Everyone, http://www.geogebra.org
 @license: This file is subject to the GeoGebra Non-Commercial License Agreement, see http://www.geogebra.org/license. For questions please write us at office@geogebra.org.
 */
/*global renderGGBElement, XDomainRequest, ggbApplets, console */
var isRenderGGBElementEnabled = false;
var scriptLoadStarted = false;
var html5AppletsToProcess = null;
var ggbHTML5LoadedCodebaseIsWebSimple = false;
var ggbHTML5LoadedCodebaseVersion = null;
var ggbHTML5LoadedScript = null;
/**
 * @param ggbVersion GeoGebra version; deprecated
 * @param parameters An object containing parameters that are passed to the applet.
 * @param views An object containing information about which views are used in the GeoGebra worksheet. Each variable is boolean.
 *              E.g.: {"is3D":false,"AV":false,"SV":false,"CV":false,"EV2":false,"CP":false,"PC":false,"DA":false,"FI":false,"PV":false,"macro":false};
 * @param html5NoWebSimple Set to true to avoid using web Simple for simple html5 applets. In this case the full version is used always.
 */var GGBApplet = function() {
  "use strict";
  var applet = {};
  // Define the parameters
  var ggbVersion = "5.0";
  var parameters = {};
  var views = null;
  var html5NoWebSimple = false;
  var html5NoWebSimpleParamExists = false;
  var appletID = null;
  var initComplete = false;
  var html5OverwrittenCodebaseVersion = null;
  var html5OverwrittenCodebase = null;
  for (var i = 0; i < arguments.length; i++) {
    var p = arguments[i];
    if (p !== null) {
      switch (typeof p) {
        case"number":
          ggbVersion = p.toFixed(1);
          break;
        case"string":
          // Check for a version number
          if (p.match(new RegExp("^[0-9]\\.[0-9]+$"))) {
            ggbVersion = p
          } else {
            appletID = p
          }
          break;
        case"object":
          if (typeof p.is3D !== "undefined") {
            views = p
          } else {
            parameters = p
          }
          break;
        case"boolean":
          html5NoWebSimple = p;
          html5NoWebSimpleParamExists = true;
          break
      }
    }
  }
  if (views === null) {
    views = {
      is3D: false,
      AV: false,
      SV: false,
      CV: false,
      EV2: false,
      CP: false,
      PC: false,
      DA: false,
      FI: false,
      PV: false,
      macro: false
    };
    // don't use web simple when material is loaded from tube, because we don't know which views are used.
    if (parameters.material_id !== undefined && !html5NoWebSimpleParamExists) {
      html5NoWebSimple = true
    }
  }
  if (appletID !== null && parameters.id === undefined) {
    parameters.id = appletID
  }
  // Private members
  var jnlpFilePath = "";
  var html5Codebase = "";
  var isHTML5Offline = false;
  var loadedAppletType = null;
  var html5CodebaseVersion = null;
  var html5CodebaseScript = null;
  var html5CodebaseIsWebSimple = false;
  var previewImagePath = null;
  var previewLoadingPath = null;
  var previewPlayPath = null;
  var fonts_css_url = null;
  var jnlpBaseDir = null;
  if (parameters.height !== undefined) {
    parameters.height = Math.round(parameters.height)
  }
  if (parameters.width !== undefined) {
    parameters.width = Math.round(parameters.width)
  }
  var parseVersion = function(d) {
    return parseFloat(d) > 4 ? parseFloat(d) : 5
  };
  /**
   * Overrides the codebase for HTML5.
   * @param codebase Can be an URL or a local file path.
   * @param offline Set to true, if the codebase is a local URL and no web URL
   */applet.setHTML5Codebase = function(codebase, offline) {
    html5OverwrittenCodebase = codebase;
    setHTML5CodebaseInternal(codebase, offline)
  };
  /**
   * Java / Compiled codebase settings: not supported, empty implementation for compatibility
   */applet.setJavaCodebase = applet.setJavaCodebaseVersion = applet.isCompiledInstalled = applet.setPreCompiledScriptPath = applet.setPreCompiledResourcePath = function() {
  };
  /**
   * Overrides the codebase version for HTML5.
   * If another codebase than the default codebase should be used, this method has to be called before setHTML5Codebase.
   * @param version The version of the codebase that should be used for HTML5 applets.
   */applet.setHTML5CodebaseVersion = function(version, offline) {
    var numVersion = parseFloat(version);
    if (numVersion !== NaN && numVersion < 5) {
      console.log("The GeoGebra HTML5 codebase version " + numVersion + " is deprecated. Using version latest instead.");
      return
    }
    // Version 4.2 is not working properly
    html5OverwrittenCodebaseVersion = version;
    setDefaultHTML5CodebaseForVersion(version, offline)
  };
  applet.getHTML5CodebaseVersion = function() {
    return html5CodebaseVersion
  };
  applet.getParameters = function() {
    return parameters
  };
  applet.setFontsCSSURL = function(url) {
    fonts_css_url = url
  };
  /**
   * This function is not needed anymore. Keep it for downward compatibility of the API.
   */applet.setGiacJSURL = function(url) {
  };
  /**
   * Overrides the JNLP file to use.
   * By default (if this method is not called), the jnlp file in the codebase directory is used.
   * Cannot be used in combination with setJNLPBaseDir
   * @param newJnlpFilePath The absolute path to the JNLP file.
   */applet.setJNLPFile = function(newJnlpFilePath) {
    jnlpFilePath = newJnlpFilePath
  };
  /**
   * Sets an alternative base directory for the JNLP File. The path must not include the version number.
   * @param baseDir
   */applet.setJNLPBaseDir = function(baseDir) { //not needed, for comaptibility only
   };
  /**
   * Injects the applet;
   * @param containerID The id of the HTML element that is the parent of the new applet.
   * All other content (innerText) of the container will be overwritten with the new applet.
   * @param type Can be 'preferJava', 'preferHTML5', 'java', 'html5', 'auto' or 'screenshot'. Default='auto';
   * @param boolean noPreview. Set to true if no preview image should be shown
   * @return The type of the applet that was injected or null if the applet could not be injected.
   */applet.inject = function() {
    function isOwnIFrame() {
      return window.frameElement && window.frameElement.getAttribute("data-singleton")
    }

    var type = "auto";
    var container_ID = parameters.id;
    var container;
    var noPreview = false;
    for (var i = 0; i < arguments.length; i++) {
      var p = arguments[i];
      if (typeof p === "string") {
        p = p.toLowerCase();
        if (p.match(/^(prefer)?(java|html5|compiled|auto|screenshot)$/)) {
          type = p
        } else {
          container_ID = arguments[i]
        }
      } else if (typeof p === "boolean") {
        noPreview = p
      } else if (p instanceof HTMLElement) {
        container = p
      }
    }
    continueInject();
    function continueInject() {
      // Check if the initialization is complete
      if (!initComplete) {
        // Try again in 200 ms.
        setTimeout(continueInject, 200);
        return
      }
      // Use the container id as appletid, if it was not defined.
      type = detectAppletType(type);// Sets the type to either 'java' or 'html5'
      var appletElem = container || document.getElementById(container_ID);
      if (!appletElem) {
        console.log("possibly bug on ajax loading? ");
        return
      }
      // Remove an existing applet
      applet.removeExistingApplet(appletElem, false);
      // Read the applet dimensions from the container, if they were not defined in the params
      // it is okay, but sadly no height of the container, so we must take care of this too
      // - geogebraweb won't wet widht and height if one if it 0
      if (parameters.width === undefined && appletElem.clientWidth) {
        parameters.width = appletElem.clientWidth
      }
      if (parameters.height === undefined && appletElem.clientHeight) {
        parameters.height = appletElem.clientHeight
      }
      if (!(parameters.width && parameters.height) && type === "html5") {
        delete parameters.width;
        delete parameters.height
      }
      // Inject the new applet
      loadedAppletType = type;
      if (type === "screenshot") {
        injectScreenshot(appletElem, parameters)
      } else {
        // Check if applets should be loaded instantly or with a play button
        var playButton = false;
        if (parameters.hasOwnProperty("playButton") && parameters.playButton || parameters.hasOwnProperty("clickToLoad") && parameters.clickToLoad) {
          playButton = true
        } else if (parameters.hasOwnProperty("playButtonAutoDecide") && parameters.playButtonAutoDecide) {
          playButton = (!isInIframe() || isOwnIFrame()) && isMobileDevice()
        }
        if (playButton) {
          loadedAppletType = "screenshot";
          injectPlayButton(appletElem, parameters, noPreview, type)
        } else {
          injectHTML5Applet(appletElem, parameters, noPreview)
        }
      }
    }

    return
  };
  function isInIframe() {
    try {
      return window.self !== window.top
    } catch (e) {
      return true
    }
  }

  function isMobileDevice() {
    if (parameters.hasOwnProperty("screenshotGenerator") && parameters.screenshotGenerator) {
      return false
    }
    return Math.max(screen.width, screen.height) < 800
  }

  applet.getViews = function() {
    return views
  };
  /**
   * @returns boolean Whether the system is capable of showing the GeoGebra Java applet
   */applet.isJavaInstalled = function() {
    return false
  };
  function pluginEnabled(name) {
    var plugins = navigator.plugins, i = plugins.length, regExp = new RegExp(name, "i");
    while (i--) {
      if (regExp.test(plugins[i].name)) {
        return true
      }
    }
    return false
  }

  var getTubeURL = function() {
    var tubeurl, protocol;
    // Determine the url for the tube API
    if (parameters.tubeurl !== undefined) {
      // Url was specified in parameters
      tubeurl = parameters.tubeurl
    } else if (window.location.host.indexOf("www.geogebra.org") > -1 || window.location.host.indexOf("alpha.geogebra.org") > -1 || window.location.host.indexOf("groot.geogebra.org") > -1 || window.location.host.indexOf("beta.geogebra.org") > -1 || window.location.host.indexOf("stage.geogebra.org") > -1) {
      // if the script is used on a tube site, use this site for the api url.
      tubeurl = window.location.protocol + "//" + window.location.host
    } else {
      // Use main tube url
      tubeurl = "https://www.geogebra.org"
    }
    return tubeurl
  };
  var fetchParametersFromTube = function(successCallback, materialsApiURL) {
    var tubeurl = materialsApiURL ? materialsApiURL.substring(0, materialsApiURL.indexOf("/", 8)) : getTubeURL();
    // load ggbbase64 string and settings from API
    var api_request = {
        request: {
          "-api": "1.0.0", login: {"-type": "cookie", "-getuserinfo": "false"}, task: {
            "-type": "fetch",
            fields: {
              field: [{"-name": "id"}, {"-name": "geogebra_format"},
                // { "-name": "prefapplettype" },
                {"-name": "width"}, {"-name": "height"}, {"-name": "toolbar"}, {"-name": "menubar"}, {"-name": "inputbar"}, {"-name": "stylebar"}, {"-name": "reseticon"}, {"-name": "labeldrags"}, {"-name": "shiftdragzoom"}, {"-name": "rightclick"}, {"-name": "ggbbase64"}, {"-name": "preview_url"}, {"-name": "appname"}]
            },
            filters: {field: [{"-name": "id", "#text": "" + parameters.material_id + ""}]},
            order: {"-by": "id", "-type": "asc"},
            limit: {"-num": "1"}
          }
        }
      },
      // TODO: Read view settings from database
      success = function() {
        var text = xhr.responseText;
        var jsondata = JSON.parse(text);//retrieve result as an JSON object
        var item = null;
        for (i = 0; jsondata.responses && i < jsondata.responses.response.length; i++) {
          if (jsondata.responses.response[i].item !== undefined) {
            item = jsondata.responses.response[i].item
          }
        }
        if (item === null) {
          onError();
          return
        }
        if (item.geogebra_format !== "") {
          ggbVersion = item.geogebra_format
        }
        if (parameters.ggbBase64 === undefined) {
          parameters.ggbBase64 = item.ggbBase64
        }
        if (parameters.width === undefined) {
          parameters.width = item.width
        }
        if (parameters.height === undefined) {
          parameters.height = item.height
        }
        if (parameters.showToolBar === undefined) {
          parameters.showToolBar = item.toolbar === "true"
        }
        if (parameters.showMenuBar === undefined) {
          parameters.showMenuBar = item.menubar === "true"
        }
        if (parameters.showAlgebraInput === undefined) {
          parameters.showAlgebraInput = item.inputbar === "true"
        }
        if (parameters.allowStyleBar === undefined) {
          parameters.allowStyleBar = item.stylebar === "true"
        }
        if (parameters.showResetIcon === undefined) {
          parameters.showResetIcon = item.reseticon === "true"
        }
        if (parameters.enableLabelDrags === undefined) {
          parameters.enableLabelDrags = item.labeldrags === "true"
        }
        if (parameters.enableShiftDragZoom === undefined) {
          parameters.enableShiftDragZoom = item.shiftdragzoom === "true"
        }
        if (parameters.enableRightClick === undefined) {
          parameters.enableRightClick = item.rightclick === "true"
        }
        if (parameters.showToolBarHelp === undefined) {
          parameters.showToolBarHelp = parameters.showToolBar
        }
        if (parameters.appname === undefined) {
          parameters.appname = item.appname
        }
        if (parseFloat(item.geogebra_format) >= 5) {
          views.is3D = true
        }
        var previewUrl = item.previewUrl === undefined ? tubeurl + "/files/material-" + item.id + ".png" : item.previewUrl;
        // user setting of preview URL has precedence
        applet.setPreviewImage(previewImagePath || previewUrl, tubeurl + "/images/GeoGebra_loading.png", tubeurl + "/images/applet_play.png");
        successCallback()
      };
    var url = tubeurl + "/api/json.php";
    var xhr = createCORSRequest("POST", url);
    var onError = function() {
      parameters.onError && parameters.onError();
      log("Error: The request for fetching material_id " + parameters.material_id + " from tube was not successful.")
    };
    if (!xhr) {
      onError();
      return
    }
    // Response handlers.
    xhr.onload = success;
    xhr.onerror = onError;
    xhr.onprogress = function() {
    };// IE9 will abort the xhr.send without this
    // Send request
    if (xhr.setRequestHeader) {// IE9's XDomainRequest does not support this method
      xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
    }
    xhr.send(JSON.stringify(api_request))
  };
  // Create the XHR object.
  function createCORSRequest(method, url) {
    var xhr = new XMLHttpRequest;
    if ("withCredentials" in xhr) {
      // XHR for Chrome/Firefox/Opera/Safari.
      xhr.open(method, url, true)
    } else if (typeof XDomainRequest !== "undefined") {
      // XDomainRequest for IE.
      xhr = new XDomainRequest;
      xhr.open(method, url)
    } else {
      // CORS not supported.
      xhr = null
    }
    return xhr
  }

  /**
   * @returns boolean Whether the system is capable of showing the GeoGebra HTML5 applet
   */applet.isHTML5Installed = function() {
    if (isInternetExplorer()) {
      if ((views.is3D || html5CodebaseScript === "web3d.nocache.js") && getIEVersion() < 11) {// WebGL is supported since IE 11
        return false
      } else if (getIEVersion() < 10) {
        return false
      }
    }
    return true
  };
  /**
   * @returns The type of the loaded applet or null if no applet was loaded yet.
   */applet.getLoadedAppletType = function() {
    return loadedAppletType
  };
  applet.setPreviewImage = function(previewFilePath, loadingFilePath, playFilePath) {
    previewImagePath = previewFilePath;
    previewLoadingPath = loadingFilePath;
    previewPlayPath = playFilePath
  };
  applet.removeExistingApplet = function(appletParent, showScreenshot) {
    var i;
    if (typeof appletParent === "string") {
      appletParent = document.getElementById(appletParent)
    }
    loadedAppletType = null;
    var removedID = null;
    for (i = 0; i < appletParent.childNodes.length; i++) {
      var currentChild = appletParent.childNodes[i];
      var tag = currentChild.tagName;
      var className = currentChild.className;
      if (currentChild.className === "applet_screenshot") {
        if (showScreenshot) {
          // Show the screenshot instead of the removed applet
          currentChild.style.display = "block";
          loadedAppletType = "screenshot"
        } else {
          // Hide the screenshot
          currentChild.style.display = "none"
        }
      } else if ((tag === "ARTICLE" || tag === "DIV") && className !== "applet_scaler prerender") {
        // Remove the applet
        appletParent.removeChild(currentChild);
        removedID = tag === "ARTICLE" ? currentChild.id : null;
        i--
      }
    }
    var appName = parameters.id !== undefined ? parameters.id : removedID;
    var app = window[appName];
    if (typeof app === "object" && typeof app.getBase64 === "function") {
      // Check if the variable is a GeoGebra Applet and remove it
      app.remove();
      window[appName] = null
    }
  };
  applet.refreshHitPoints = function() {
    if (parseVersion(ggbHTML5LoadedCodebaseVersion) >= 5) {
      return true;// Not necessary anymore in 5.0
    }
    var app = applet.getAppletObject();
    if (app) {
      if (typeof app.recalculateEnvironments === "function") {
        app.recalculateEnvironments();
        return true
      }
    }
    return false
  };
  applet.startAnimation = function() {
    var app = applet.getAppletObject();
    if (app) {
      if (typeof app.startAnimation === "function") {
        app.startAnimation();
        return true
      }
    }
    return false
  };
  applet.stopAnimation = function() {
    var app = applet.getAppletObject();
    if (app) {
      if (typeof app.stopAnimation === "function") {
        app.stopAnimation();
        return true
      }
    }
    return false
  };
  applet.getAppletObject = function() {
    var appName = parameters.id !== undefined ? parameters.id : "ggbApplet";
    return window[appName]
  };
  applet.resize = function() {
  };
  var appendParam = function(applet, name, value) {
    var param = document.createElement("param");
    param.setAttribute("name", name);
    param.setAttribute("value", value);
    applet.appendChild(param)
  };
  var valBoolean = function(value) {
    return value && value !== "false"
  };
  var injectHTML5Applet = function(appletElem, parameters, noPreview) {
    if (parseVersion(html5CodebaseVersion) <= 4.2) {
      noPreview = true
    }
    // Decide if the script has to be (re)loaded or renderGGBElement can be used to load the applet
    var loadScript = !isRenderGGBElementEnabled && !scriptLoadStarted;
    // Reload the script when not loaded yet, or  currently the wrong version is loaded
    if (!isRenderGGBElementEnabled && !scriptLoadStarted || (ggbHTML5LoadedCodebaseVersion !== html5CodebaseVersion || ggbHTML5LoadedCodebaseIsWebSimple && !html5CodebaseIsWebSimple)) {
      loadScript = true;
      isRenderGGBElementEnabled = false;
      scriptLoadStarted = false
    }
    var article = document.createElement("article");
    var oriWidth = parameters.width;
    var oriHeight = parameters.height;
    parameters.disableAutoScale = parameters.disableAutoScale === undefined ? GGBAppletUtils.isFlexibleWorksheetEditor() : parameters.disableAutoScale;
    // The HTML5 version 4.4 changes the height depending on which bars are shown. So we have to correct it here.
    if (parameters.width !== undefined) {
      if (parseVersion(html5CodebaseVersion) <= 4.4) {
        if (valBoolean(parameters.showToolBar)) {
          parameters.height -= 7
        }
        if (valBoolean(parameters.showAlgebraInput)) {
          parameters.height -= 37
        }
        if (parameters.width < 605 && valBoolean(parameters.showToolBar)) {
          parameters.width = 605;
          oriWidth = 605
        }
      } else {
        // calculate the minWidth
        var minWidth = 100;
        if (valBoolean(parameters.showToolBar) || valBoolean(parameters.showMenuBar)) {
          if (parameters.hasOwnProperty("customToolBar")) {
            parameters.customToolbar = parameters.customToolBar
          }
          minWidth = valBoolean(parameters.showMenuBar) ? 245 : 155
        }
        if (oriWidth < minWidth) {
          parameters.width = minWidth;
          oriWidth = minWidth
        }
      }
    }
    article.className = "notranslate";//we remove geogebraweb here, as we don't want to parse it out of the box.
    article.style.border = "none";
    article.style.display = "inline-block";
    for (var key in parameters) {
      if (parameters.hasOwnProperty(key) && key !== "appletOnLoad") {
        article.setAttribute("data-param-" + key, parameters[key])
      }
    }
    if (fonts_css_url) {
      article.setAttribute("data-param-fontscssurl", fonts_css_url)
    }
    // Resize the applet when the window is resized
    applet.resize = function() {
      GGBAppletUtils.responsiveResize(appletElem, parameters)
    };
    if (typeof jQuery === "function") {
      jQuery(window).resize(function() {
        applet.resize()
      })
    } else {
      var oldOnResize = null;
      if (window.onresize !== undefined && typeof window.onresize === "function") {
        oldOnResize = window.onresize
      }
      window.onresize = function() {
        applet.resize();
        if (typeof oldOnResize === "function") {
          oldOnResize()
        }
      }
    }
    var oriAppletOnload = typeof parameters.appletOnLoad === "function" ? parameters.appletOnLoad : function() {
    };
    // Add the tag for the preview image
    if (!noPreview && parameters.width !== undefined) {
      // Prevent GeoGebraWeb from showing the splash
      if (!parameters.hasOwnProperty("showSplash")) {
        article.setAttribute("data-param-showSplash", "false")
      }
      // Check if the screenshot is already there
      var previewPositioner = appletElem.querySelector(".applet_scaler.prerender");
      var preRendered = previewPositioner !== null;
      if (!preRendered) {
        var previewContainer = createScreenShotDiv(oriWidth, oriHeight, parameters.borderColor, false);
        // This div is needed to have an element with position relative as origin for the absolute positioned image
        previewPositioner = document.createElement("div");
        previewPositioner.className = "applet_scaler";
        previewPositioner.style.position = "relative";
        previewPositioner.style.display = "block";
        previewPositioner.style.width = oriWidth + "px";
        previewPositioner.style.height = oriHeight + "px"
      } else {
        var previewContainer = previewPositioner.querySelector(".ggb_preview")
      }
      if (window.GGBT_spinner) {
        window.GGBT_spinner.attachSpinner(previewPositioner, "66%")
      }
      if (parseVersion(html5CodebaseVersion) >= 5) {
        // Workaround: Remove the preview image when the applet is fully loaded
        parameters.appletOnLoad = function(api) {
          var preview = appletElem.querySelector(".ggb_preview");
          if (preview) {
            preview.parentNode.removeChild(preview)
          }
          if (window.GGBT_spinner) {
            window.GGBT_spinner.removeSpinner(previewPositioner)
          }
          if (window.GGBT_wsf_view) {
            $(window).trigger("resize")
          } else {
            window.onresize()
          }
          oriAppletOnload(api)
        };
        if (!preRendered) {
          previewPositioner.appendChild(previewContainer)
        }
      } else {
        article.appendChild(previewContainer)
      }
      previewPositioner.appendChild(article);
      if (!preRendered) {
        appletElem.appendChild(previewPositioner)
      }
      // Redo resizing when screenshot is loaded to recalculate it after scrollbars are gone
      setTimeout(function() {
        applet.resize()
      }, 1)
    } else {
      var appletScaler = document.createElement("div");
      appletScaler.className = "applet_scaler";
      appletScaler.style.position = "relative";
      appletScaler.style.display = "block";
      appletScaler.appendChild(article);
      appletElem.appendChild(appletScaler);
      // Apply scaling
      parameters.appletOnLoad = function(api) {
        applet.resize();
        oriAppletOnload(api)
      }
    }
    function renderGGBElementWithParams(article, parameters) {
      if (parameters && typeof parameters.appletOnLoad === "function" && typeof renderGGBElement === "function") {
        renderGGBElement(article, parameters.appletOnLoad)
      } else {
        renderGGBElement(article)
      }
      log("GeoGebra HTML5 applet injected and rendered with previously loaded codebase.", parameters)
    }

    function renderGGBElementOnTube(a, parameters) {
      if (typeof renderGGBElement === "undefined") {
        //it is possible, that we get here many times, before script are loaded.
        // So best here to save the article element for later - otherwise only last article processed :-)
        if (html5AppletsToProcess === null) {
          html5AppletsToProcess = []
        }
        html5AppletsToProcess.push({article: a, params: parameters});
        window.renderGGBElementReady = function() {
          isRenderGGBElementEnabled = true;
          if (html5AppletsToProcess !== null && html5AppletsToProcess.length) {
            html5AppletsToProcess.forEach(function(obj) {
              renderGGBElementWithParams(obj.article, obj.params)
            });
            html5AppletsToProcess = null
          }
        };
        //TODO: remove this hack, because it is a hack!
        if (parseVersion(html5CodebaseVersion) < 5) {
          a.className += " geogebraweb"
        }
      } else {
        renderGGBElementWithParams(a, parameters)
      }
    }

    // Load the web script
    if (loadScript) {
      scriptLoadStarted = true;
      // Remove all table tags within an article tag if there are any
      for (var i = 0; i < article.childNodes.length; i++) {
        var tag = article.childNodes[i].tagName;
        if (tag === "TABLE") {
          article.removeChild(article.childNodes[i]);
          i--
        }
      }
      // Remove old script tags
      if (ggbHTML5LoadedScript !== null) {
        var el = document.querySelector('script[src="' + ggbHTML5LoadedScript + '"]');
        if (el !== undefined && el !== null) {
          el.parentNode.removeChild(el)
        }
      }
      var script = document.createElement("script");
      var scriptLoaded = function() {
        renderGGBElementOnTube(article, parameters)
      };
      script.src = html5Codebase + html5CodebaseScript;
      ggbHTML5LoadedCodebaseIsWebSimple = html5CodebaseIsWebSimple;
      ggbHTML5LoadedCodebaseVersion = html5CodebaseVersion;
      ggbHTML5LoadedScript = script.src;
      log("GeoGebra HTML5 codebase loaded: '" + html5Codebase + "'.", parameters);
      if (!html5OverwrittenCodebase && (!html5OverwrittenCodebaseVersion || html5OverwrittenCodebaseVersion == "5.0")) {
        if (html5CodebaseIsWebSimple) {
          webSimple.succeeded = webSimple.succeeded || webSimple()
        } else {
          web3d.succeeded = web3d.succeeded || web3d()
        }
        scriptLoaded()
      } else if (html5Codebase.requirejs) {
        require(["geogebra/runtime/js/web3d/web3d.nocache"], scriptLoaded)
      } else {
        script.onload = scriptLoaded;
        appletElem.appendChild(script)
      }
    } else {
      renderGGBElementOnTube(article, parameters)
    }
    parameters.height = oriHeight;
    parameters.width = oriWidth
  };
  var injectScreenshot = function(appletElem, parameters, showPlayButton) {
    // Add the tag for the preview image
    var previewContainer = createScreenShotDiv(parameters.width, parameters.height, parameters.borderColor, showPlayButton);
    // This div is needed to have an element with position relative as origin for the absolute positioned image
    var previewPositioner = document.createElement("div");
    previewPositioner.style.position = "relative";
    previewPositioner.style.display = "block";
    previewPositioner.style.width = parameters.width + "px";
    previewPositioner.style.height = parameters.height + "px";
    previewPositioner.className = "applet_screenshot applet_scaler" + (showPlayButton ? " applet_screenshot_play" : "");
    previewPositioner.appendChild(previewContainer);
    var scale = GGBAppletUtils.getScale(parameters, appletElem, showPlayButton);
    if (showPlayButton) {
      appletElem.appendChild(getPlayButton());
      if (!window.GGBT_wsf_view) {
        appletElem.style.position = "relative"
      }
    } else if (window.GGBT_spinner) {
      window.GGBT_spinner.attachSpinner(previewPositioner, "66%")
    }
    appletElem.appendChild(previewPositioner);
    // Set the scale for the preview image
    if (scale !== 1 && !isNaN(scale)) {
      // Set the scale factor for the preview image
      GGBAppletUtils.scaleElement(previewPositioner, scale);
      previewPositioner.style.width = parameters.width + "px";
      previewPositioner.style.height = parameters.height + "px";
      previewPositioner.parentNode.style.width = parameters.width * scale + "px";
      previewPositioner.parentNode.style.height = parameters.height * scale + "px"
    }
    applet.resize = function() {
      resizeScreenshot(appletElem, previewContainer, previewPositioner, showPlayButton)
    };
    if (typeof jQuery === "function") {
      jQuery(window).resize(function() {
        applet.resize()
      })
    } else {
      var oldOnResize = null;
      // Resize the preview when the window is resized
      if (window.onresize !== undefined && typeof window.onresize === "function") {
        oldOnResize = window.onresize
      }
      window.onresize = function() {
        applet.resize();
        if (typeof oldOnResize === "function") {
          oldOnResize()
        }
      }
    }
    applet.resize()
  };

  function resizeScreenshot(appletElem, previewContainer, previewPositioner, showPlayButton, oldOnResize) {
    if (!appletElem.contains(previewContainer)) {
      // Don't resize the screenshot if it is not visible (anymore)
      return
    }
    if (typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen()) {
      if (appletElem.id !== "fullscreencontent") {
        return
      }
      window.GGBT_wsf_view.setCloseBtnPosition(appletElem)
    }
    var scale = GGBAppletUtils.getScale(parameters, appletElem, showPlayButton);
    if (previewPositioner.parentNode !== null) {
      if (!isNaN(scale) && scale !== 1) {
        GGBAppletUtils.scaleElement(previewPositioner, scale);
        previewPositioner.parentNode.style.width = parameters.width * scale + "px";
        previewPositioner.parentNode.style.height = parameters.height * scale + "px"
      } else {
        GGBAppletUtils.scaleElement(previewPositioner, 1);
        previewPositioner.parentNode.style.width = parameters.width + "px";
        previewPositioner.parentNode.style.height = parameters.height + "px"
      }
    }
    // positions the applet in the center of the popup
    if (typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen()) {
      GGBAppletUtils.positionCenter(appletElem)
    }
    if (typeof window.GGBT_ws_header_footer === "object") {
      window.GGBT_ws_header_footer.setWsScrollerHeight()
    }
    if (typeof oldOnResize === "function") {
      oldOnResize()
    }
  }

  applet.onExitFullscreen = function(fullscreenContainer, appletElem) {
    appletElem.appendChild(fullscreenContainer)
  };
  var injectPlayButton = function(appletElem, parameters, noPreview, type) {
    injectScreenshot(appletElem, parameters, true);
    // Load applet on play button click
    var play = function() {
      // Remove the screenshot after the applet is injected
      var elems = [];
      for (i = 0; i < appletElem.childNodes.length; i++) {
        elems.push(appletElem.childNodes[i])
      }
      if (window.GGBT_wsf_view) {
        var content = window.GGBT_wsf_view.renderFullScreen(appletElem, parameters.id);
        var container = document.getElementById("fullscreencontainer");
        var oldcontent = jQuery(appletElem).find(".fullscreencontent");
        if (oldcontent.length > 0) {
          // Reuse the previously rendered applet
          content.remove();
          oldcontent.attr("id", "fullscreencontent").show();
          jQuery(container).append(oldcontent);
          window.onresize()
        } else {
          // Render a new applet
          injectHTML5Applet(content, parameters, false)
        }
        window.GGBT_wsf_view.launchFullScreen(container)
      } else {
        loadedAppletType = type;
        injectHTML5Applet(appletElem, parameters, false)
      }
      if (!window.GGBT_wsf_view) {
        for (i = 0; i < elems.length; i++) {
          appletElem.removeChild(elems[i])
        }
      }
    };
    // Find the play button and add the click handler
    var imgs = appletElem.getElementsByClassName("ggb_preview_play");
    for (var i = 0; i < imgs.length; i++) {
      imgs[i].addEventListener("click", play, false);
      imgs[i].addEventListener("ontouchstart", play, false)
    }
    // Call onload
    if (typeof window.ggbAppletPlayerOnload === "function") {
      window.ggbAppletPlayerOnload(appletElem)
    }
    //remove fullscreen button if not needed
    if (isMobileDevice() && window.GGBT_wsf_view) {
      $(".wsf-element-fullscreen-button").remove()
    }
  };
  var getPlayButton = function() {
    var playButtonContainer = document.createElement("div");
    playButtonContainer.className = "ggb_preview_play icon-applet-play";
    if (!window.GGBT_wsf_view) {// on tube, the play button image is defined in a css file
      var css = "" + ".icon-applet-play {" + "   width: 100%;" + "   height: 100%;box-sizing: border-box;position: absolute;z-index: 1001;cursor: pointer;border-width: 0px;" + "   background-color: transparent;background-repeat: no-repeat;left: 0;top: 0;background-position: center center;" + '   background-image: url("' + getTubeURL() + '/images/worksheet/icon-start-applet.png");' + "}" + ".icon-applet-play:hover {" + 'background-image: url("' + getTubeURL() + '/images/worksheet/icon-start-applet-hover.png");' + "}";
      var style = document.createElement("style");
      if (style.styleSheet) {
        style.styleSheet.cssText = css
      } else {
        style.appendChild(document.createTextNode(css))
      }
      document.getElementsByTagName("head")[0].appendChild(style)
    }
    return playButtonContainer
  };
  var createScreenShotDiv = function(oriWidth, oriHeight, borderColor, showPlayButton) {
    var previewContainer = document.createElement("div");
    previewContainer.className = "ggb_preview";
    previewContainer.style.position = "absolute";
    // previewContainer.style.zIndex = "1000001";
    // too high z-index causes various problems overlaps fixed header overlaps popups
    previewContainer.style.zIndex = "90";
    previewContainer.style.width = oriWidth - 2 + "px"; // Remove 2 pixel for the border
    previewContainer.style.height = oriHeight - 2 + "px"; // Remove 2 pixel for the border
    previewContainer.style.top = "0px";
    previewContainer.style.left = "0px";
    previewContainer.style.overflow = "hidden";
    previewContainer.style.backgroundColor = "white";
    var bc = "lightgrey";
    if (borderColor !== undefined) {
      if (borderColor === "none") {
        bc = "transparent"
      } else {
        bc = borderColor
      }
    }
    previewContainer.style.border = "1px solid " + bc;
    var preview = document.createElement("img");
    preview.style.position = "relative";
    preview.style.zIndex = "1000";
    preview.style.top = "-1px"; // Move up/left to hide the border on the image
    preview.style.left = "-1px";
    if (previewImagePath !== null) {
      preview.setAttribute("src", previewImagePath)
    }
    preview.style.opacity = .7;
    if (previewLoadingPath !== null) {
      var previewOverlay;
      var pWidth, pHeight;
      if (!showPlayButton) {
        previewOverlay = document.createElement("img");
        previewOverlay.style.position = "absolute";
        previewOverlay.style.zIndex = "1001";
        previewOverlay.style.opacity = 1;
        preview.style.opacity = .3;
        pWidth = 360;
        if (pWidth > oriWidth / 4 * 3) {
          pWidth = oriWidth / 4 * 3
        }
        pHeight = pWidth / 5.8;
        previewOverlay.setAttribute("src", previewLoadingPath);
        previewOverlay.setAttribute("width", pWidth);
        previewOverlay.setAttribute("height", pHeight);
        var pX = (oriWidth - pWidth) / 2;
        var pY = (oriHeight - pHeight) / 2;
        previewOverlay.style.left = pX + "px";
        previewOverlay.style.top = pY + "px";
        previewContainer.appendChild(previewOverlay)
      }
    }
    previewContainer.appendChild(preview);
    return previewContainer
  };
  /**
   * Detects the type of the applet (java or html5).
   * If a fixed type is passed in preferredType (java or html5), this type is forced.
   * Otherwise the method tries to find out which types are supported by the system.
   * If a preferredType is passed, this type is used if it is supported.
   * If auto is passed, the preferred type is html5 for versions >= 4.4 and java for all versions < 4.4.
   * @param preferredType can be 'preferJava', 'preferHTML5', 'java', 'html5', 'auto' or 'screenshot'. Default='auto'
   */var detectAppletType = function(preferredType) {
    preferredType = preferredType.toLowerCase();
    if (preferredType === "html5" || preferredType === "screenshot") {
      return preferredType
    }
    return "html5"
  };
  var getIEVersion = function() {
    var a = navigator.appVersion;
    if (a.indexOf("Trident/7.0") > 0) {
      return 11
    } else {
      return a.indexOf("MSIE") + 1 ? parseFloat(a.split("MSIE")[1]) : 999
    }
  };
  var isInternetExplorer = function() {
    return getIEVersion() !== 999
  };
  var modules = ["web", "webSimple", "web3d", "tablet", "tablet3d", "phone"];
  /**
   * @param version Can be: 3.2, 4.0, 4.2, 4.4, 5.0, test, test42, test44, test50
   */var setDefaultHTML5CodebaseForVersion = function(version, offline) {
    html5CodebaseVersion = version;
    if (offline) {
      setHTML5CodebaseInternal(html5CodebaseVersion, true);
      return
    }
    // Set the codebase URL for the version
    var hasWebSimple = !html5NoWebSimple;
    if (hasWebSimple) {
      var v = parseVersion(html5CodebaseVersion);
      if (!isNaN(v) && v < 4.4) {
        hasWebSimple = false
      }
    }
    var protocol, codebase;
    if (window.location.protocol.substr(0, 4) === "http") {
      protocol = window.location.protocol
    } else {
      protocol = "http:"
    }
    var index = html5CodebaseVersion.indexOf("//");
    if (index > 0) {
      codebase = html5CodebaseVersion
    } else if (index === 0) {
      codebase = protocol + html5CodebaseVersion
    } else {
      codebase = "https://www.geogebra.org/apps/latest/"
    }
    for (var key in modules) {
      if (html5CodebaseVersion.slice(modules[key].length * -1) === modules[key] || html5CodebaseVersion.slice((modules[key].length + 1) * -1) === modules[key] + "/") {
        setHTML5CodebaseInternal(codebase, false);
        return
      }
    }
    // Decide if web, websimple or web3d should be used
    if (!GGBAppletUtils.isFlexibleWorksheetEditor() && hasWebSimple && !views.is3D && !views.AV && !views.SV && !views.CV && !views.EV2 && !views.CP && !views.PC && !views.DA && !views.FI && !views.PV && !valBoolean(parameters.showToolBar) && !valBoolean(parameters.showMenuBar) && !valBoolean(parameters.showAlgebraInput) && !valBoolean(parameters.enableRightClick) && (!parameters.appName || parameters.appName == "classic")) {
      codebase += "webSimple/"
    } else {
      codebase += "web3d/"
    }
    setHTML5CodebaseInternal(codebase, false)
  };
  var setHTML5CodebaseInternal = function(codebase, offline) {
    if (codebase.requirejs) {
      html5Codebase = codebase;
      return
    }
    if (codebase.slice(-1) !== "/") {
      codebase += "/"
    }
    html5Codebase = codebase;
    if (offline === null) {
      offline = codebase.indexOf("http") === -1
    }
    isHTML5Offline = offline;
    // Set the scriptname (web or webSimple)
    html5CodebaseScript = "web.nocache.js";
    html5CodebaseIsWebSimple = false;
    var folders = html5Codebase.split("/");
    if (folders.length > 1) {
      if (!offline && folders[folders.length - 2] === "webSimple") {// Currently we don't use webSimple for offline worksheets
        html5CodebaseScript = "webSimple.nocache.js";
        html5CodebaseIsWebSimple = true
      } else if (modules.indexOf(folders[folders.length - 2]) >= 0) {
        html5CodebaseScript = folders[folders.length - 2] + ".nocache.js"
      }
    }
    // Extract the version from the codebase folder
    folders = codebase.split("/");
    html5CodebaseVersion = folders[folders.length - 3];
    if (html5CodebaseVersion.substr(0, 4) === "test") {
      html5CodebaseVersion = html5CodebaseVersion.substr(4, 1) + "." + html5CodebaseVersion.substr(5, 1)
    } else if (html5CodebaseVersion.substr(0, 3) === "war" || html5CodebaseVersion.substr(0, 4) === "beta") {
      html5CodebaseVersion = "5.0"
    }
    // Check if the codebase version is deprecated
    var numVersion = parseFloat(html5CodebaseVersion);
    if (numVersion !== NaN && numVersion < 5) {
      console.log("The GeoGebra HTML5 codebase version " + numVersion + " is deprecated. Using version latest instead.");
      setDefaultHTML5CodebaseForVersion("5.0", offline)
    }
  };
  var log = function(text, parameters) {
    if (window.console && window.console.log) {
      if (!parameters || typeof parameters.showLogging === "undefined" || parameters.showLogging && parameters.showLogging !== "false") {
        console.log(text)
      }
    }
  };
  // Read the material parameters from the tube API, if a material_id was passed
  if (parameters.material_id !== undefined) {
    fetchParametersFromTube(continueInit, parameters.materialsApi)
  } else {
    continueInit()
  }
  function continueInit() {
    var html5Version = ggbVersion;
    if (html5OverwrittenCodebaseVersion !== null) {
      html5Version = html5OverwrittenCodebaseVersion
    } else {
      if (parseFloat(html5Version) < 5) {// Use 5.0 as default for html5. Change the version number here, when a new stable version is released.
        html5Version = "5.0"
      }
    }
    // Initialize the codebase with the default URLs
    setDefaultHTML5CodebaseForVersion(html5Version, false);
    if (html5OverwrittenCodebase !== null) {
      setHTML5CodebaseInternal(html5OverwrittenCodebase, isHTML5Offline)
    }
    initComplete = true
  }

  return applet
};
var GGBAppletUtils = function() {
  "use strict";
  function isFlexibleWorksheetEditor() {
    return window.GGBT_wsf_edit !== undefined
  }

  function scaleElement(el, scale) {
    if (scale != 1) {
      el.style.transformOrigin = "0% 0% 0px";
      el.style.webkitTransformOrigin = "0% 0% 0px";
      el.style.transform = "scale(" + scale + "," + scale + ")";
      el.style.webkitTransform = "scale(" + scale + "," + scale + ")";
      el.style.maxWidth = "initial";
      // Remove the max width from the image and the div
      if (el.querySelector(".ggb_preview") !== null) {
        el.querySelector(".ggb_preview").style.maxWidth = "initial"
      }
      if (el.querySelectorAll(".ggb_preview img")[0] !== undefined) {
        el.querySelectorAll(".ggb_preview img")[0].style.maxWidth = "initial"
      }
      if (el.querySelectorAll(".ggb_preview img")[1] !== undefined) {
        el.querySelectorAll(".ggb_preview img")[1].style.maxWidth = "initial"
      }
    } else {
      el.style.transform = "none";
      el.style.webkitTransform = "none"
    }
  }

  function getWidthHeight(appletElem, appletWidth, allowUpscale, autoHeight, noBorder, scaleContainerClass) {
    // Find the container class
    var container = null;
    if (scaleContainerClass != undefined && scaleContainerClass != "") {
      var parent = appletElem.parentNode;
      while (parent != null) {
        if ((" " + parent.className + " ").indexOf(" " + scaleContainerClass + " ") > -1) {
          container = parent;
          break
        } else {
          parent = parent.parentNode
        }
      }
    }
    var myWidth = 0, myHeight = 0, windowWidth = 0, border = 0, borderRight = 0, borderLeft = 0, borderTop = 0;
    if (container) {
      myWidth = container.offsetWidth;
      myHeight = Math.max(autoHeight ? container.offsetWidth : 0, container.offsetHeight)
    } else {
      if (window.innerWidth && document.documentElement.clientWidth) {
        myWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);
        myHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);
        // Using mywith instead of innerWidth because after rotating a mobile device the innerWidth is sometimes wrong (e.g. on Galaxy Note III)
        // windowWidth = window.innerWidth
        windowWidth = myWidth
      } else if (typeof window.innerWidth === "number") {
        //Non-IE
        myWidth = window.innerWidth;
        myHeight = window.innerHeight;
        windowWidth = window.innerWidth
      } else if (document.documentElement && (document.documentElement.clientWidth || document.documentElement.clientHeight)) {
        //IE 6+ in 'standards compliant mode'
        myWidth = document.documentElement.clientWidth;
        myHeight = document.documentElement.clientHeight;
        windowWidth = document.documentElement.clientWidth
      } else if (document.body && (document.body.clientWidth || document.body.clientHeight)) {
        //IE 4 compatible
        myWidth = document.body.clientWidth;
        myHeight = document.body.clientHeight;
        windowWidth = document.documentElement.clientWidth
      }
      if (appletElem) {
        var rect = appletElem.getBoundingClientRect();
        if (rect.left > 0) {
          if (rect.left <= myWidth && (noBorder === undefined || !noBorder)) {
            if (document.dir === "rtl") {
              borderRight = myWidth - rect.width - rect.left;
              borderLeft = windowWidth <= 480 ? 10 : 30
            } else {
              borderLeft = rect.left;
              borderRight = windowWidth <= 480 ? 10 : 30
            }
            border = borderLeft + borderRight
          }
        }
      }
      // overwrite borders with other numbers if it is in fullscreen mode
      // make sure X is visible all the time
      if (appletElem && typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen()) {
        // APPLET IS DISPLAYED IN FULLSCREEN
        var appletRect = appletElem.getBoundingClientRect();
        // X is positioned to the right/left
        // set a border so it is visible
        if (window.GGBT_wsf_view.getCloseBtnPosition() === "closePositionRight") {
          // X is positioned to the right/left
          // 40 is the width of the X close button
          border = 40;
          borderTop = 0
        } else if (window.GGBT_wsf_view.getCloseBtnPosition() === "closePositionTop") {
          // X is positioned on top
          border = 0;
          borderTop = 40
        }
      }
    }
    if (appletElem) {
      if ((allowUpscale === undefined || !allowUpscale) && appletWidth > 0 && appletWidth + border < myWidth) {
        myWidth = appletWidth
      } else {
        myWidth -= border
      }
      if (typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen() && (allowUpscale === undefined || !allowUpscale)) {
        // applet is displayed in fullscreen
        myHeight -= borderTop
      }
    }
    //console.log('myWidth: ' + myWidth + ', myHeight: ' + myHeight);
    return {width: myWidth, height: myHeight}
  }

  function calcScale(parameters, appletElem, allowUpscale, showPlayButton, scaleContainerClass) {
    if (parameters.isScreenshoGenerator) {
      return 1
    }
    var ignoreHeight = showPlayButton !== undefined && showPlayButton;
    var noScaleMargin = parameters.noScaleMargin != undefined && parameters.noScaleMargin;
    var valBoolean = function(value) {
      return value && value !== "false"
    };
    var autoHeight = valBoolean(parameters.autoHeight);
    var windowSize = getWidthHeight(appletElem, parameters.width, allowUpscale, autoHeight, ignoreHeight && window.GGBT_wsf_view || noScaleMargin, scaleContainerClass);
    var windowWidth = parseInt(windowSize.width);
    var appletWidth = parameters.width;
    var appletHeight = parameters.height;
    if (appletWidth === undefined) {
      var articles = appletElem.getElementsByTagName("article");
      if (articles.length === 1) {
        appletWidth = articles[0].offsetWidth;
        appletHeight = articles[0].offsetHeight
      }
    }
    var xscale = windowWidth / appletWidth;
    var yscale = ignoreHeight ? 1 : windowSize.height / appletHeight;
    if (allowUpscale !== undefined && !allowUpscale) {
      xscale = Math.min(1, xscale);
      yscale = Math.min(1, yscale)
    }
    return Math.min(xscale, yscale)
  }

  function getScale(parameters, appletElem, showPlayButton) {
    var scale = 1, autoScale, allowUpscale = false;
    if (parameters.hasOwnProperty("allowUpscale")) {
      allowUpscale = parameters.allowUpscale
    }
    if (parameters.hasOwnProperty("scale")) {
      scale = parseFloat(parameters.scale);
      if (isNaN(scale) || scale === null || scale === 0) {
        scale = 1
      }
      if (scale > 1) {
        allowUpscale = true
      }
    }
    if (appletElem && typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen()) {
      allowUpscale = true
    }
    if (!(parameters.hasOwnProperty("disableAutoScale") && parameters.disableAutoScale)) {
      autoScale = calcScale(parameters, appletElem, allowUpscale, showPlayButton, parameters.scaleContainerClass)
    } else {
      return scale
    }
    if (allowUpscale && (!parameters.hasOwnProperty("scale") || scale === 1)) {
      return autoScale
    } else {
      return Math.min(scale, autoScale)
    }
  }

  /**
   * Positiones the applet in the center of the screen
   * Used for fullscreen popups
   * @param appletElem
   */function positionCenter(appletElem) {
    var windowWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);
    var windowHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);
    var appletRect = appletElem.getBoundingClientRect();
    var calcHorizontalBorder = (windowWidth - appletRect.width) / 2;
    var calcVerticalBorder = (windowHeight - appletRect.height) / 2;
    if (calcVerticalBorder < 0) {
      calcVerticalBorder = 0
    }
    appletElem.style.position = "relative";
    if (window.GGBT_wsf_view.getCloseBtnPosition() === "closePositionRight") {
      // X is positioned to the right/left
      if (calcHorizontalBorder < 40) {
        // if there is not enough space left for the X, don't position it in the center
        appletElem.style.left = "40px"
      } else {
        appletElem.style.left = calcHorizontalBorder + "px"
      }
      appletElem.style.top = calcVerticalBorder + "px"
    } else if (window.GGBT_wsf_view.getCloseBtnPosition() === "closePositionTop") {
      // X is positioned on top
      if (calcVerticalBorder < 40) {
        // if there is not enough space left for the X, don't position it in the center
        appletElem.style.top = "40px"
      } else {
        appletElem.style.top = calcVerticalBorder + "px"
      }
      appletElem.style.left = calcHorizontalBorder + "px"
    }
  }

  function responsiveResize(appletElem, parameters) {
    var article = appletElem.getElementsByTagName("article")[0];
    if (article) {
      if (typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen()) {
        var articles = appletElem.getElementsByTagName("article");
        if (articles.length > 0 && parameters.id !== articles[0].getAttribute("data-param-id")) {
          return
        }
        window.GGBT_wsf_view.setCloseBtnPosition(appletElem)
      }
      if (article.parentElement && /fullscreen/.test(article.parentElement.className)) {
        return;//fullscreen button inside applet pressed
      }
      var scale = getScale(parameters, appletElem);
      if (isFlexibleWorksheetEditor()) {
        article.setAttribute("data-param-scale", scale)
      }
      var scaleElem = null;
      for (var i = 0; i < appletElem.childNodes.length; i++) {
        if (appletElem.childNodes[i].className !== undefined && appletElem.childNodes[i].className.match(/^applet_scaler/)) {
          scaleElem = appletElem.childNodes[i];
          break
        }
      }
      if (scaleElem !== null && scaleElem.querySelector(".noscale") !== null) {
        return
      }
      var appName = parameters.id !== undefined ? parameters.id : "ggbApplet";
      var app = window[appName];
      if ((app == null || !app.recalculateEnvironments) && scaleElem !== null && !scaleElem.className.match(/fullscreen/)) {
        scaleElem.parentNode.style.transform = "";
        if (!isNaN(scale) && scale !== 1) {
          // Set the scale factor for the applet
          scaleElem.parentNode.style.width = parameters.width * scale + "px";
          scaleElem.parentNode.style.height = parameters.height * scale + "px";
          scaleElement(scaleElem, scale)
        } else {
          // Remove scaling
          scaleElement(scaleElem, 1);
          scaleElem.parentNode.style.width = parameters.width + "px";
          scaleElem.parentNode.style.height = parameters.height + "px"
        }
      }
      // positions the applet in the center of the popup
      if (typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen()) {
        positionCenter(appletElem)
      }
      if (window.GGBT_wsf_view && !window.GGBT_wsf_view.isFullscreen()) {
        window.GGBT_wsf_general.adjustContentToResize($(article).parents(".content-added-content"))
      }
    }
  }

  return {
    responsiveResize: responsiveResize,
    isFlexibleWorksheetEditor: isFlexibleWorksheetEditor,
    positionCenter: positionCenter,
    getScale: getScale,
    scaleElement: scaleElement
  }
}();
if (typeof define === "function" && define.amd) {
  define([], function() {
    return GGBApplet
  })
}
GGBAppletUtils.makeModule = function(name, permutation) {
  function webModule() {
    var I = "bootstrap", J = "begin", K = "gwt.codesvr." + name + "=", L = "gwt.codesvr=", M = name, N = "startup",
      O = "DUMMY", P = 0, Q = 1, R = "iframe", S = "position:absolute; width:0; height:0; border:none; left: -1000px;",
      T = " top: -1000px;", U = "CSS1Compat", V = "<!doctype html>", W = "",
      X = "<html><head></head><body></body></html>", Y = "undefined", Z = "readystatechange", $ = 10, _ = "Chrome",
      ab = 'eval("', bb = '");', cb = "script", db = "javascript", eb = "moduleStartup", fb = "moduleRequested",
      gb = "Failed to load ", hb = "head", ib = "meta", jb = "name", kb = name + "::", lb = "::", mb = "gwt:property",
      nb = "content", ob = "=", pb = "gwt:onPropertyErrorFn", qb = 'Bad handler "',
      rb = '" for "gwt:onPropertyErrorFn"', sb = "gwt:onLoadErrorFn", tb = '" for "gwt:onLoadErrorFn"', ub = "#",
      vb = "?", wb = "/", xb = "img", yb = "clear.cache.gif", zb = "baseUrl", Ab = name + ".nocache.js", Bb = "base",
      Cb = "//", Db = "user.agent", Eb = "webkit", Fb = "safari", Gb = "msie", Hb = 11, Ib = "ie10", Jb = 9, Kb = "ie9",
      Lb = 8, Mb = "ie8", Nb = "gecko", Ob = "gecko1_8", Pb = 2, Qb = 3, Rb = 4, Sb = "selectingPermutation",
      Tb = "" + name + ".devmode.js", Ub = permutation, Vb = ":1", Wb = ":2", Xb = ":3", Yb = ":", Zb = ".cache.js",
      $b = "loadExternalRefs", _b = "end";
    var o = window;
    var p = document;
    r(I, J);
    function q() {
      var a = o.location.search;
      return a.indexOf(K) != -1 || a.indexOf(L) != -1
    }

    function r(a, b) {
    }

    webModule.__sendStats = r;
    webModule.__moduleName = M;
    webModule.__errFn = null;
    webModule.__moduleBase = O;
    webModule.__softPermutationId = P;
    webModule.__computePropValue = null;
    webModule.__getPropMap = null;
    webModule.__installRunAsyncCode = function() {
    };
    webModule.__gwtStartLoadingFragment = function() {
      return null
    };
    webModule.__gwt_isKnownPropertyValue = function() {
      return false
    };
    webModule.__gwt_getMetaProperty = function() {
      return null
    };
    var s = null;
    var t = o.__gwt_activeModules = o.__gwt_activeModules || {};
    t[M] = {moduleName: M};
    webModule.__moduleStartupDone = function(e) {
      var f = t[M].bindings;
      t[M].bindings = function() {
        var a = f ? f() : {};
        var b = e[webModule.__softPermutationId];
        for (var c = P; c < b.length; c++) {
          var d = b[c];
          a[d[P]] = d[Q]
        }
        return a
      }
    };
    var u;

    function v() {
      w();
      return u
    }

    function w() {
      if (u) {
        return
      }
      var a = p.createElement(R);
      a.id = M;
      a.style.cssText = S + T;
      a.tabIndex = -1;
      p.body.appendChild(a);
      u = a.contentWindow.document;
      u.open();
      var b = document.compatMode == U ? V : W;
      u.write(b + X);
      u.close()
    }

    function A(k) {
      function l(a) {
        function b() {
          if (typeof p.readyState == Y) {
            return typeof p.body != Y && p.body != null
          }
          return /loaded|complete/.test(p.readyState)
        }

        var c = b();
        if (c) {
          a();
          return
        }
        function d() {
          if (!c) {
            if (!b()) {
              return
            }
            c = true;
            a();
            if (p.removeEventListener) {
              p.removeEventListener(Z, d, false)
            }
            if (e) {
              clearInterval(e)
            }
          }
        }

        if (p.addEventListener) {
          p.addEventListener(Z, d, false)
        }
        var e = setInterval(function() {
          d()
        }, $)
      }

      function m(c) {
        function d(a, b) {
          a.removeChild(b)
        }

        var e = v();
        var f = e.body;
        var g;
        if (navigator.userAgent.indexOf(_) > -1 && window.JSON) {
          var h = e.createDocumentFragment();
          h.appendChild(e.createTextNode(ab));
          for (var i = P; i < c.length; i++) {
            var j = window.JSON.stringify(c[i]);
            h.appendChild(e.createTextNode(j.substring(Q, j.length - Q)))
          }
          h.appendChild(e.createTextNode(bb));
          g = e.createElement(cb);
          g.language = db;
          g.appendChild(h);
          f.appendChild(g);
          d(f, g)
        } else {
          for (var i = P; i < c.length; i++) {
            g = e.createElement(cb);
            g.language = db;
            g.text = c[i];
            f.appendChild(g);
            d(f, g)
          }
        }
      }

      webModule.onScriptDownloaded = function(a) {
        l(function() {
          m(a)
        })
      };
      var n = p.createElement(cb);
      n.src = k;
      if (webModule.__errFn) {
        n.onerror = function() {
          webModule.__errFn(M, new Error(gb + code))
        }
      }
      p.getElementsByTagName(hb)[P].appendChild(n)
    }

    webModule.__startLoadingFragment = function(a) {
      return D(a)
    };
    webModule.__installRunAsyncCode = function(a) {
      var b = v();
      var c = b.body;
      var d = b.createElement(cb);
      d.language = db;
      d.text = a;
      c.appendChild(d);
      c.removeChild(d)
    };
    function B() {
      var c = {};
      var d;
      var e;
      var f = p.getElementsByTagName(ib);
      for (var g = P, h = f.length; g < h; ++g) {
        var i = f[g], j = i.getAttribute(jb), k;
        if (j) {
          j = j.replace(kb, W);
          if (j.indexOf(lb) >= P) {
            continue
          }
          if (j == mb) {
            k = i.getAttribute(nb);
            if (k) {
              var l, m = k.indexOf(ob);
              if (m >= P) {
                j = k.substring(P, m);
                l = k.substring(m + Q)
              } else {
                j = k;
                l = W
              }
              c[j] = l
            }
          } else if (j == pb) {
            k = i.getAttribute(nb);
            if (k) {
              try {
                d = eval(k)
              } catch (a) {
                alert(qb + k + rb)
              }
            }
          } else if (j == sb) {
            k = i.getAttribute(nb);
            if (k) {
              try {
                e = eval(k)
              } catch (a) {
                alert(qb + k + tb)
              }
            }
          }
        }
      }
      __gwt_getMetaProperty = function(a) {
        var b = c[a];
        return b == null ? null : b
      };
      s = d;
      webModule.__errFn = e
    }

    function C() {
      function e(a) {
        var b = a.lastIndexOf(ub);
        if (b == -1) {
          b = a.length
        }
        var c = a.indexOf(vb);
        if (c == -1) {
          c = a.length
        }
        var d = a.lastIndexOf(wb, Math.min(c, b));
        return d >= P ? a.substring(P, d + Q) : W
      }

      function f(a) {
        if (a.match(/^\w+:\/\//)) {
        } else {
          var b = p.createElement(xb);
          b.src = a + yb;
          a = e(b.src)
        }
        return a
      }

      function g() {
        var a = __gwt_getMetaProperty(zb);
        if (a != null) {
          return a
        }
        return W
      }

      function h() {
        var a = p.getElementsByTagName(cb);
        for (var b = P; b < a.length; ++b) {
          if (a[b].src.indexOf(Ab) != -1) {
            return e(a[b].src)
          }
        }
        return W
      }

      function i() {
        var a = p.getElementsByTagName(Bb);
        if (a.length > P) {
          return a[a.length - Q].href
        }
        return W
      }

      function j() {
        var a = p.location;
        return a.href == a.protocol + Cb + a.host + a.pathname + a.search + a.hash
      }

      var k = g();
      if (k == W) {
        k = h()
      }
      if (k == W) {
        k = i()
      }
      if (k == W && j()) {
        k = e(p.location.href)
      }
      k = f(k);
      return k
    }

    function D(a) {
      if (a.match(/^\//)) {
        return a
      }
      if (a.match(/^[a-zA-Z]+:\/\//)) {
        return a
      }
      return webModule.__moduleBase + a
    }

    function F() {
      var f = [];
      var g = P;

      function h(a, b) {
        var c = f;
        for (var d = P, e = a.length - Q; d < e; ++d) {
          c = c[a[d]] || (c[a[d]] = [])
        }
        c[a[e]] = b
      }

      var i = [];
      var j = [];

      function k(a) {
        var b = j[a](), c = i[a];
        if (b in c) {
          return b
        }
        var d = [];
        for (var e in c) {
          d[c[e]] = e
        }
        if (s) {
          s(a, d, b)
        }
        throw null
      }

      j[Db] = function() {
        var a = navigator.userAgent.toLowerCase();
        var b = p.documentMode;
        if (function() {
            return a.indexOf(Eb) != -1
          }())return Fb;
        if (function() {
            return a.indexOf(Gb) != -1 && (b >= $ && b < Hb)
          }())return Ib;
        if (function() {
            return a.indexOf(Gb) != -1 && (b >= Jb && b < Hb)
          }())return Kb;
        if (function() {
            return a.indexOf(Gb) != -1 && (b >= Lb && b < Hb)
          }())return Mb;
        if (function() {
            return a.indexOf(Nb) != -1 || b >= Hb
          }())return Ob;
        return Fb
      };
      i[Db] = {gecko1_8: P, ie10: Q, ie8: Pb, ie9: Qb, safari: Rb};
      __gwt_isKnownPropertyValue = function(a, b) {
        return b in i[a]
      };
      webModule.__getPropMap = function() {
        var a = {};
        for (var b in i) {
          if (i.hasOwnProperty(b)) {
            a[b] = k(b)
          }
        }
        return a
      };
      webModule.__computePropValue = k;
      o.__gwt_activeModules[M].bindings = webModule.__getPropMap;
      if (q()) {
        return D(Tb)
      }
      var l;
      try {
        h([Ob], Ub);
        h([Ib], Ub + Vb);
        h([Kb], Ub + Wb);
        h([Fb], Ub + Xb);
        l = f[k(Db)];
        var m = l.indexOf(Yb);
        if (m != -1) {
          g = parseInt(l.substring(m + Q), $);
          l = l.substring(P, m)
        }
      } catch (a) {
      }
      webModule.__softPermutationId = g;
      return D(l + Zb)
    }

    function G() {
      if (!o.__gwt_stylesLoaded) {
        o.__gwt_stylesLoaded = {}
      }
    }

    B();
    webModule.__moduleBase = "https://www.geogebra.org/apps/latest/" + name + "/";
    t[M].moduleBase = webModule.__moduleBase;
    var H = F();
    G();
    A(H);
    return true
  }

  return webModule
};
if (typeof window.web3d !== "function") {
  web3d = GGBAppletUtils.makeModule("web3d", "18EBAFF235EE31DFDA1EE52C35151A34")
}
if (typeof window.webSimple !== "function") {
  webSimple = GGBAppletUtils.makeModule("webSimple", "B40BE6C5825C60BF2C4C7AB12E4D5F61")
}
/*
 * Copyright 2013 Small Batch, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
(function(window, document, undefined) {
  var j = !0, k = null, l = !1;

  function p(a) {
    return function() {
      return this[a]
    }
  }

  var aa = this;

  function q(a, b) {
    var c = a.split("."), d = aa;
    !(c[0] in d) && d.execScript && d.execScript("var " + c[0]);
    for (var e; c.length && (e = c.shift());)!c.length && void 0 !== b ? d[e] = b : d = d[e] ? d[e] : d[e] = {}
  }

  function ba(a, b, c) {
    return a.call.apply(a.bind, arguments)
  }

  function ca(a, b, c) {
    if (!a)throw Error();
    if (2 < arguments.length) {
      var d = Array.prototype.slice.call(arguments, 2);
      return function() {
        var c = Array.prototype.slice.call(arguments);
        Array.prototype.unshift.apply(c, d);
        return a.apply(b, c)
      }
    }
    return function() {
      return a.apply(b, arguments)
    }
  }

  function s(a, b, c) {
    s = Function.prototype.bind && -1 != Function.prototype.bind.toString().indexOf("native code") ? ba : ca;
    return s.apply(k, arguments)
  }

  var da = Date.now || function() {
      return +new Date
    };

  function ea(a, b) {
    this.G = a;
    this.u = b || a;
    this.z = this.u.document
  }

  ea.prototype.createElement = function(a, b, c) {
    a = this.z.createElement(a);
    if (b)for (var d in b)b.hasOwnProperty(d) && ("style" == d ? a.style.cssText = b[d] : a.setAttribute(d, b[d]));
    c && a.appendChild(this.z.createTextNode(c));
    return a
  };
  function fa(a, b, c) {
    a = a.z.getElementsByTagName(b)[0];
    a || (a = document.documentElement);
    a && a.lastChild && a.insertBefore(c, a.lastChild)
  }

  function t(a, b) {
    for (var c = a.className.split(/\s+/), d = 0, e = c.length; d < e; d++)if (c[d] == b)return;
    c.push(b);
    a.className = c.join(" ").replace(/\s+/g, " ").replace(/^\s+|\s+$/, "")
  }

  function u(a, b) {
    for (var c = a.className.split(/\s+/), d = [], e = 0, f = c.length; e < f; e++)c[e] != b && d.push(c[e]);
    a.className = d.join(" ").replace(/\s+/g, " ").replace(/^\s+|\s+$/, "")
  }

  function ga(a, b) {
    for (var c = a.className.split(/\s+/), d = 0, e = c.length; d < e; d++)if (c[d] == b)return j;
    return l
  }

  function v(a) {
    var b = a.u.location.protocol;
    "about:" == b && (b = a.G.location.protocol);
    return "https:" == b ? "https:" : "http:"
  }

  function w(a, b) {
    var c = a.createElement("link", {rel: "stylesheet", href: b}), d = l;
    c.onload = function() {
      d || (d = j)
    };
    c.onerror = function() {
      d || (d = j)
    };
    fa(a, "head", c)
  }

  function x(a, b, c, d) {
    var e = a.z.getElementsByTagName("head")[0];
    if (e) {
      var f = a.createElement("script", {src: b}), g = l;
      f.onload = f.onreadystatechange = function() {
        if (!g && (!this.readyState || "loaded" == this.readyState || "complete" == this.readyState)) g = j, c && c(k), f.onload = f.onreadystatechange = k, "HEAD" == f.parentNode.tagName && e.removeChild(f)
      };
      e.appendChild(f);
      window.setTimeout(function() {
        g || (g = j, c && c(Error("Script load timeout")))
      }, d || 5e3);
      return f
    }
    return k
  }

  function y(a, b, c) {
    this.w = a;
    this.S = b;
    this.za = c
  }

  q("webfont.BrowserInfo", y);
  y.prototype.pa = p("w");
  y.prototype.hasWebFontSupport = y.prototype.pa;
  y.prototype.qa = p("S");
  y.prototype.hasWebKitFallbackBug = y.prototype.qa;
  y.prototype.ra = p("za");
  y.prototype.hasWebKitMetricsBug = y.prototype.ra;
  function z(a, b, c, d) {
    this.e = a != k ? a : k;
    this.o = b != k ? b : k;
    this.aa = c != k ? c : k;
    this.f = d != k ? d : k
  }

  var ha = /^([0-9]+)(?:[\._-]([0-9]+))?(?:[\._-]([0-9]+))?(?:[\._+-]?(.*))?$/;
  z.prototype.toString = function() {
    return [this.e, this.o || "", this.aa || "", this.f || ""].join("")
  };
  function A(a) {
    a = ha.exec(a);
    var b = k, c = k, d = k, e = k;
    a && (a[1] !== k && a[1] && (b = parseInt(a[1], 10)), a[2] !== k && a[2] && (c = parseInt(a[2], 10)), a[3] !== k && a[3] && (d = parseInt(a[3], 10)), a[4] !== k && a[4] && (e = /^[0-9]+$/.test(a[4]) ? parseInt(a[4], 10) : a[4]));
    return new z(b, c, d, e)
  }

  function B(a, b, c, d, e, f, g, h, m, n, r) {
    this.J = a;
    this.Fa = b;
    this.ya = c;
    this.fa = d;
    this.Da = e;
    this.ea = f;
    this.wa = g;
    this.Ea = h;
    this.va = m;
    this.da = n;
    this.k = r
  }

  q("webfont.UserAgent", B);
  B.prototype.getName = p("J");
  B.prototype.getName = B.prototype.getName;
  B.prototype.oa = p("ya");
  B.prototype.getVersion = B.prototype.oa;
  B.prototype.ka = p("fa");
  B.prototype.getEngine = B.prototype.ka;
  B.prototype.la = p("ea");
  B.prototype.getEngineVersion = B.prototype.la;
  B.prototype.ma = p("wa");
  B.prototype.getPlatform = B.prototype.ma;
  B.prototype.na = p("va");
  B.prototype.getPlatformVersion = B.prototype.na;
  B.prototype.ja = p("da");
  B.prototype.getDocumentMode = B.prototype.ja;
  B.prototype.ia = p("k");
  B.prototype.getBrowserInfo = B.prototype.ia;
  function C(a, b) {
    this.a = a;
    this.H = b
  }

  var ia = new B("Unknown", new z, "Unknown", "Unknown", new z, "Unknown", "Unknown", new z, "Unknown", void 0, new y(l, l, l));
  C.prototype.parse = function() {
    var a;
    if (-1 != this.a.indexOf("MSIE")) {
      a = D(this);
      var b = E(this), c = A(b), d = F(this.a, /MSIE ([\d\w\.]+)/, 1), e = A(d);
      a = new B("MSIE", e, d, "MSIE", e, d, a, c, b, G(this.H), new y("Windows" == a && 6 <= e.e || "Windows Phone" == a && 8 <= c.e, l, l))
    } else if (-1 != this.a.indexOf("Opera"))a:{
      a = "Unknown";
      var b = F(this.a, /Presto\/([\d\w\.]+)/, 1), c = A(b), d = E(this), e = A(d), f = G(this.H);
      c.e !== k ? a = "Presto" : (-1 != this.a.indexOf("Gecko") && (a = "Gecko"), b = F(this.a, /rv:([^\)]+)/, 1), c = A(b));
      if (-1 != this.a.indexOf("Opera Mini/")) {
        var g = F(this.a, /Opera Mini\/([\d\.]+)/, 1), h = A(g);
        a = new B("OperaMini", h, g, a, c, b, D(this), e, d, f, new y(l, l, l))
      } else {
        if (-1 != this.a.indexOf("Version/") && (g = F(this.a, /Version\/([\d\.]+)/, 1), h = A(g), h.e !== k)) {
          a = new B("Opera", h, g, a, c, b, D(this), e, d, f, new y(10 <= h.e, l, l));
          break a
        }
        g = F(this.a, /Opera[\/ ]([\d\.]+)/, 1);
        h = A(g);
        a = h.e !== k ? new B("Opera", h, g, a, c, b, D(this), e, d, f, new y(10 <= h.e, l, l)) : new B("Opera", new z, "Unknown", a, c, b, D(this), e, d, f, new y(l, l, l))
      }
    } else/OPR\/[\d.]+/.test(this.a) ? a = ja(this) : /AppleWeb(K|k)it/.test(this.a) ? a = ja(this) : -1 != this.a.indexOf("Gecko") ? (a = "Unknown", b = new z, c = "Unknown", d = E(this), e = A(d), f = l, -1 != this.a.indexOf("Firefox") ? (a = "Firefox", c = F(this.a, /Firefox\/([\d\w\.]+)/, 1), b = A(c), f = 3 <= b.e && 5 <= b.o) : -1 != this.a.indexOf("Mozilla") && (a = "Mozilla"), g = F(this.a, /rv:([^\)]+)/, 1), h = A(g), f || (f = 1 < h.e || 1 == h.e && 9 < h.o || 1 == h.e && 9 == h.o && 2 <= h.aa || g.match(/1\.9\.1b[123]/) != k || g.match(/1\.9\.1\.[\d\.]+/) != k), a = new B(a, b, c, "Gecko", h, g, D(this), e, d, G(this.H), new y(f, l, l))) : a = ia;
    return a
  };
  function D(a) {
    var b = F(a.a, /(iPod|iPad|iPhone|Android|Windows Phone|BB\d{2}|BlackBerry)/, 1);
    if ("" != b)return /BB\d{2}/.test(b) && (b = "BlackBerry"), b;
    a = F(a.a, /(Linux|Mac_PowerPC|Macintosh|Windows|CrOS)/, 1);
    return "" != a ? ("Mac_PowerPC" == a && (a = "Macintosh"), a) : "Unknown"
  }

  function E(a) {
    var b = F(a.a, /(OS X|Windows NT|Android) ([^;)]+)/, 2);
    if (b || (b = F(a.a, /Windows Phone( OS)? ([^;)]+)/, 2)) || (b = F(a.a, /(iPhone )?OS ([\d_]+)/, 2)))return b;
    if (b = F(a.a, /(?:Linux|CrOS) ([^;)]+)/, 1))for (var b = b.split(/\s/), c = 0; c < b.length; c += 1)if (/^[\d\._]+$/.test(b[c]))return b[c];
    return (a = F(a.a, /(BB\d{2}|BlackBerry).*?Version\/([^\s]*)/, 2)) ? a : "Unknown"
  }

  function ja(a) {
    var b = D(a), c = E(a), d = A(c), e = F(a.a, /AppleWeb(?:K|k)it\/([\d\.\+]+)/, 1), f = A(e), g = "Unknown",
      h = new z, m = "Unknown", n = l;
    /OPR\/[\d.]+/.test(a.a) ? g = "Opera" : -1 != a.a.indexOf("Chrome") || -1 != a.a.indexOf("CrMo") || -1 != a.a.indexOf("CriOS") ? g = "Chrome" : /Silk\/\d/.test(a.a) ? g = "Silk" : "BlackBerry" == b || "Android" == b ? g = "BuiltinBrowser" : -1 != a.a.indexOf("PhantomJS") ? g = "PhantomJS" : -1 != a.a.indexOf("Safari") ? g = "Safari" : -1 != a.a.indexOf("AdobeAIR") && (g = "AdobeAIR");
    "BuiltinBrowser" == g ? m = "Unknown" : "Silk" == g ? m = F(a.a, /Silk\/([\d\._]+)/, 1) : "Chrome" == g ? m = F(a.a, /(Chrome|CrMo|CriOS)\/([\d\.]+)/, 2) : -1 != a.a.indexOf("Version/") ? m = F(a.a, /Version\/([\d\.\w]+)/, 1) : "AdobeAIR" == g ? m = F(a.a, /AdobeAIR\/([\d\.]+)/, 1) : "Opera" == g ? m = F(a.a, /OPR\/([\d.]+)/, 1) : "PhantomJS" == g && (m = F(a.a, /PhantomJS\/([\d.]+)/, 1));
    h = A(m);
    n = "AdobeAIR" == g ? 2 < h.e || 2 == h.e && 5 <= h.o : "BlackBerry" == b ? 10 <= d.e : "Android" == b ? 2 < d.e || 2 == d.e && 1 < d.o : 526 <= f.e || 525 <= f.e && 13 <= f.o;
    return new B(g, h, m, "AppleWebKit", f, e, b, d, c, G(a.H), new y(n, 536 > f.e || 536 == f.e && 11 > f.o, "iPhone" == b || "iPad" == b || "iPod" == b || "Macintosh" == b))
  }

  function F(a, b, c) {
    return (a = a.match(b)) && a[c] ? a[c] : ""
  }

  function G(a) {
    if (a.documentMode)return a.documentMode
  }

  function ka(a) {
    this.ua = a || "-"
  }

  ka.prototype.f = function(a) {
    for (var b = [], c = 0; c < arguments.length; c++)b.push(arguments[c].replace(/[\W_]+/g, "").toLowerCase());
    return b.join(this.ua)
  };
  function H(a, b) {
    this.J = a;
    this.T = 4;
    this.K = "n";
    var c = (b || "n4").match(/^([nio])([1-9])$/i);
    c && (this.K = c[1], this.T = parseInt(c[2], 10))
  }

  H.prototype.getName = p("J");
  function I(a) {
    return a.K + a.T
  }

  function la(a) {
    var b = 4, c = "n", d = k;
    a && ((d = a.match(/(normal|oblique|italic)/i)) && d[1] && (c = d[1].substr(0, 1).toLowerCase()), (d = a.match(/([1-9]00|normal|bold)/i)) && d[1] && (/bold/i.test(d[1]) ? b = 7 : /[1-9]00/.test(d[1]) && (b = parseInt(d[1].substr(0, 1), 10))));
    return c + b
  }

  function ma(a, b, c) {
    this.c = a;
    this.h = b;
    this.M = c;
    this.j = "wf";
    this.g = new ka("-")
  }

  function na(a) {
    t(a.h, a.g.f(a.j, "loading"));
    J(a, "loading")
  }

  function K(a) {
    u(a.h, a.g.f(a.j, "loading"));
    ga(a.h, a.g.f(a.j, "active")) || t(a.h, a.g.f(a.j, "inactive"));
    J(a, "inactive")
  }

  function J(a, b, c) {
    if (a.M[b])if (c) a.M[b](c.getName(), I(c)); else a.M[b]()
  }

  function L(a, b) {
    this.c = a;
    this.C = b;
    this.s = this.c.createElement("span", {"aria-hidden": "true"}, this.C)
  }

  function M(a, b) {
    var c;
    c = [];
    for (var d = b.J.split(/,\s*/), e = 0; e < d.length; e++) {
      var f = d[e].replace(/['"]/g, "");
      -1 == f.indexOf(" ") ? c.push(f) : c.push("'" + f + "'")
    }
    c = c.join(",");
    d = "normal";
    e = b.T + "00";
    "o" === b.K ? d = "oblique" : "i" === b.K && (d = "italic");
    a.s.style.cssText = "position:absolute;top:-999px;left:-999px;font-size:300px;width:auto;height:auto;line-height:normal;margin:0;padding:0;font-variant:normal;white-space:nowrap;font-family:" + c + ";" + ("font-style:" + d + ";font-weight:" + e + ";")
  }

  function N(a) {
    fa(a.c, "body", a.s)
  }

  L.prototype.remove = function() {
    var a = this.s;
    a.parentNode && a.parentNode.removeChild(a)
  };
  function oa(a, b, c, d, e, f, g, h) {
    this.U = a;
    this.sa = b;
    this.c = c;
    this.q = d;
    this.C = h || "BESbswy";
    this.k = e;
    this.F = {};
    this.R = f || 5e3;
    this.Y = g || k;
    this.B = this.A = k;
    a = new L(this.c, this.C);
    N(a);
    for (var m in O)O.hasOwnProperty(m) && (M(a, new H(O[m], I(this.q))), this.F[O[m]] = a.s.offsetWidth);
    a.remove()
  }

  var O = {Ca: "serif", Ba: "sans-serif", Aa: "monospace"};
  oa.prototype.start = function() {
    this.A = new L(this.c, this.C);
    N(this.A);
    this.B = new L(this.c, this.C);
    N(this.B);
    this.xa = da();
    M(this.A, new H(this.q.getName() + ",serif", I(this.q)));
    M(this.B, new H(this.q.getName() + ",sans-serif", I(this.q)));
    qa(this)
  };
  function ra(a, b, c) {
    for (var d in O)if (O.hasOwnProperty(d) && b === a.F[O[d]] && c === a.F[O[d]])return j;
    return l
  }

  function qa(a) {
    var b = a.A.s.offsetWidth, c = a.B.s.offsetWidth;
    b === a.F.serif && c === a.F["sans-serif"] || a.k.S && ra(a, b, c) ? da() - a.xa >= a.R ? a.k.S && ra(a, b, c) && (a.Y === k || a.Y.hasOwnProperty(a.q.getName())) ? P(a, a.U) : P(a, a.sa) : setTimeout(s(function() {
      qa(this)
    }, a), 25) : P(a, a.U)
  }

  function P(a, b) {
    a.A.remove();
    a.B.remove();
    b(a.q)
  }

  function R(a, b, c, d) {
    this.c = b;
    this.t = c;
    this.N = 0;
    this.ba = this.X = l;
    this.R = d;
    this.k = a.k
  }

  function sa(a, b, c, d, e) {
    if (0 === b.length && e) K(a.t); else {
      a.N += b.length;
      e && (a.X = e);
      for (e = 0; e < b.length; e++) {
        var f = b[e], g = c[f.getName()], h = a.t, m = f;
        t(h.h, h.g.f(h.j, m.getName(), I(m).toString(), "loading"));
        J(h, "fontloading", m);
        new oa(s(a.ga, a), s(a.ha, a), a.c, f, a.k, a.R, d, g).start()
      }
    }
  }

  R.prototype.ga = function(a) {
    var b = this.t;
    u(b.h, b.g.f(b.j, a.getName(), I(a).toString(), "loading"));
    u(b.h, b.g.f(b.j, a.getName(), I(a).toString(), "inactive"));
    t(b.h, b.g.f(b.j, a.getName(), I(a).toString(), "active"));
    J(b, "fontactive", a);
    this.ba = j;
    ta(this)
  };
  R.prototype.ha = function(a) {
    var b = this.t;
    u(b.h, b.g.f(b.j, a.getName(), I(a).toString(), "loading"));
    ga(b.h, b.g.f(b.j, a.getName(), I(a).toString(), "active")) || t(b.h, b.g.f(b.j, a.getName(), I(a).toString(), "inactive"));
    J(b, "fontinactive", a);
    ta(this)
  };
  function ta(a) {
    0 == --a.N && a.X && (a.ba ? (a = a.t, u(a.h, a.g.f(a.j, "loading")), u(a.h, a.g.f(a.j, "inactive")), t(a.h, a.g.f(a.j, "active")), J(a, "active")) : K(a.t))
  }

  function S(a, b, c) {
    this.G = a;
    this.V = b;
    this.a = c;
    this.O = this.P = 0
  }

  function T(a, b) {
    U.V.Z[a] = b
  }

  S.prototype.load = function(a) {
    var b = a.context || this.G;
    this.c = new ea(this.G, b);
    b = new ma(this.c, b.document.documentElement, a);
    if (this.a.k.w) {
      var c = this.V, d = this.c, e = [], f;
      for (f in a)if (a.hasOwnProperty(f)) {
        var g = c.Z[f];
        g && e.push(g(a[f], d))
      }
      a = a.timeout;
      this.O = this.P = e.length;
      a = new R(this.a, this.c, b, a);
      f = 0;
      for (c = e.length; f < c; f++)d = e[f], d.v(this.a, s(this.ta, this, d, b, a))
    } else K(b)
  };
  S.prototype.ta = function(a, b, c, d) {
    var e = this;
    d ? a.load(function(a, d, h) {
      var m = 0 == --e.P;
      m && na(b);
      setTimeout(function() {
        sa(c, a, d || {}, h || k, m)
      }, 0)
    }) : (a = 0 == --this.P, this.O--, a && (0 == this.O ? K(b) : na(b)), sa(c, [], {}, k, a))
  };
  var ua = window, va = new C(navigator.userAgent, document).parse(), U = ua.WebFont = new S(window, new function() {
    this.Z = {}
  }, va);
  U.load = U.load;
  function V(a, b) {
    this.c = a;
    this.d = b
  }

  V.prototype.load = function(a) {
    var b, c, d = this.d.urls || [], e = this.d.families || [];
    b = 0;
    for (c = d.length; b < c; b++)w(this.c, d[b]);
    d = [];
    b = 0;
    for (c = e.length; b < c; b++) {
      var f = e[b].split(":");
      if (f[1])for (var g = f[1].split(","), h = 0; h < g.length; h += 1)d.push(new H(f[0], g[h])); else d.push(new H(f[0]))
    }
    a(d)
  };
  V.prototype.v = function(a, b) {
    return b(a.k.w)
  };
  T("custom", function(a, b) {
    return new V(b, a)
  });
  function W(a, b) {
    this.c = a;
    this.d = b;
    this.m = []
  }

  W.prototype.D = function(a) {
    return v(this.c) + (this.d.api || "//f.fontdeck.com/s/css/js/") + (this.c.u.location.hostname || this.c.G.location.hostname) + "/" + a + ".js"
  };
  W.prototype.v = function(a, b) {
    var c = this.d.id, d = this.c.u, e = this;
    c ? (d.__webfontfontdeckmodule__ || (d.__webfontfontdeckmodule__ = {}), d.__webfontfontdeckmodule__[c] = function(a, c) {
      for (var d = 0, m = c.fonts.length; d < m; ++d) {
        var n = c.fonts[d];
        e.m.push(new H(n.name, la("font-weight:" + n.weight + ";font-style:" + n.style)))
      }
      b(a)
    }, x(this.c, this.D(c), function(a) {
      a && b(l)
    })) : b(l)
  };
  W.prototype.load = function(a) {
    a(this.m)
  };
  T("fontdeck", function(a, b) {
    return new W(b, a)
  });
  function wa(a, b, c) {
    this.L = a ? a : b + xa;
    this.p = [];
    this.Q = [];
    this.ca = c || ""
  }

  var xa = "//fonts.googleapis.com/css";
  wa.prototype.f = function() {
    if (0 == this.p.length)throw Error("No fonts to load !");
    if (-1 != this.L.indexOf("kit="))return this.L;
    for (var a = this.p.length, b = [], c = 0; c < a; c++)b.push(this.p[c].replace(/ /g, "+"));
    a = this.L + "?family=" + b.join("%7C");
    0 < this.Q.length && (a += "&subset=" + this.Q.join(","));
    0 < this.ca.length && (a += "&text=" + encodeURIComponent(this.ca));
    return a
  };
  function ya(a) {
    this.p = a;
    this.$ = [];
    this.I = {}
  }

  var za = {
      latin: "BESbswy",
      cyrillic: "&#1081;&#1103;&#1046;",
      greek: "&#945;&#946;&#931;",
      khmer: "&#x1780;&#x1781;&#x1782;",
      Hanuman: "&#x1780;&#x1781;&#x1782;"
    }, Aa = {
      thin: "1",
      extralight: "2",
      "extra-light": "2",
      ultralight: "2",
      "ultra-light": "2",
      light: "3",
      regular: "4",
      book: "4",
      medium: "5",
      "semi-bold": "6",
      semibold: "6",
      "demi-bold": "6",
      demibold: "6",
      bold: "7",
      "extra-bold": "8",
      extrabold: "8",
      "ultra-bold": "8",
      ultrabold: "8",
      black: "9",
      heavy: "9",
      l: "3",
      r: "4",
      b: "7"
    }, Ba = {i: "i", italic: "i", n: "n", normal: "n"},
    Ca = RegExp("^(thin|(?:(?:extra|ultra)-?)?light|regular|book|medium|(?:(?:semi|demi|extra|ultra)-?)?bold|black|heavy|l|r|b|[1-9]00)?(n|i|normal|italic)?$");
  ya.prototype.parse = function() {
    for (var a = this.p.length, b = 0; b < a; b++) {
      var c = this.p[b].split(":"), d = c[0].replace(/\+/g, " "), e = ["n4"];
      if (2 <= c.length) {
        var f;
        var g = c[1];
        f = [];
        if (g)for (var g = g.split(","), h = g.length, m = 0; m < h; m++) {
          var n;
          n = g[m];
          if (n.match(/^[\w]+$/)) {
            n = Ca.exec(n.toLowerCase());
            var r = void 0;
            if (n == k) r = ""; else {
              r = void 0;
              r = n[1];
              if (r == k || "" == r) r = "4"; else var pa = Aa[r], r = pa ? pa : isNaN(r) ? "4" : r.substr(0, 1);
              r = [n[2] == k || "" == n[2] ? "n" : Ba[n[2]], r].join("")
            }
            n = r
          } else n = "";
          n && f.push(n)
        }
        0 < f.length && (e = f);
        3 == c.length && (c = c[2], f = [], c = !c ? f : c.split(","), 0 < c.length && (c = za[c[0]]) && (this.I[d] = c))
      }
      this.I[d] || (c = za[d]) && (this.I[d] = c);
      for (c = 0; c < e.length; c += 1)this.$.push(new H(d, e[c]))
    }
  };
  function X(a, b, c) {
    this.a = a;
    this.c = b;
    this.d = c
  }

  var Da = {Arimo: j, Cousine: j, Tinos: j};
  X.prototype.v = function(a, b) {
    b(a.k.w)
  };
  X.prototype.load = function(a) {
    var b = this.c;
    if ("MSIE" == this.a.getName() && this.d.blocking != j) {
      var c = s(this.W, this, a), d = function() {
        b.z.body ? c() : setTimeout(d, 0)
      };
      d()
    } else this.W(a)
  };
  X.prototype.W = function(a) {
    for (var b = this.c, c = new wa(this.d.api, v(b), this.d.text), d = this.d.families, e = d.length, f = 0; f < e; f++) {
      var g = d[f].split(":");
      3 == g.length && c.Q.push(g.pop());
      var h = "";
      2 == g.length && "" != g[1] && (h = ":");
      c.p.push(g.join(h))
    }
    d = new ya(d);
    d.parse();
    w(b, c.f());
    a(d.$, d.I, Da)
  };
  T("google", function(a, b) {
    var c = new C(navigator.userAgent, document).parse();
    return new X(c, b, a)
  });
  function Y(a, b) {
    this.c = a;
    this.d = b
  }

  var Ea = {regular: "n4", bold: "n7", italic: "i4", bolditalic: "i7", r: "n4", b: "n7", i: "i4", bi: "i7"};
  Y.prototype.v = function(a, b) {
    return b(a.k.w)
  };
  Y.prototype.load = function(a) {
    w(this.c, v(this.c) + "//webfonts.fontslive.com/css/" + this.d.key + ".css");
    for (var b = this.d.families, c = [], d = 0, e = b.length; d < e; d++)c.push.apply(c, Fa(b[d]));
    a(c)
  };
  function Fa(a) {
    var b = a.split(":");
    a = b[0];
    if (b[1]) {
      for (var c = b[1].split(","), b = [], d = 0, e = c.length; d < e; d++) {
        var f = c[d];
        if (f) {
          var g = Ea[f];
          b.push(g ? g : f)
        }
      }
      c = [];
      for (d = 0; d < b.length; d += 1)c.push(new H(a, b[d]));
      return c
    }
    return [new H(a)]
  }

  T("ascender", function(a, b) {
    return new Y(b, a)
  });
  function Z(a, b, c) {
    this.a = a;
    this.c = b;
    this.d = c;
    this.m = []
  }

  Z.prototype.v = function(a, b) {
    var c = this, d = c.d.projectId, e = c.d.version;
    if (d) {
      var f = c.c.u;
      x(this.c, c.D(d, e), function(e) {
        if (e) b(l); else {
          if (f["__mti_fntLst" + d] && (e = f["__mti_fntLst" + d]()))for (var h = 0; h < e.length; h++)c.m.push(new H(e[h].fontfamily));
          b(a.k.w)
        }
      }).id = "__MonotypeAPIScript__" + d
    } else b(l)
  };
  Z.prototype.D = function(a, b) {
    var c = v(this.c), d = (this.d.api || "fast.fonts.com/jsapi").replace(/^.*http(s?):(\/\/)?/, "");
    return c + "//" + d + "/" + a + ".js" + (b ? "?v=" + b : "")
  };
  Z.prototype.load = function(a) {
    a(this.m)
  };
  T("monotype", function(a, b) {
    var c = new C(navigator.userAgent, document).parse();
    return new Z(c, b, a)
  });
  function $(a, b) {
    this.c = a;
    this.d = b;
    this.m = []
  }

  $.prototype.D = function(a) {
    var b = v(this.c);
    return (this.d.api || b + "//use.typekit.net") + "/" + a + ".js"
  };
  $.prototype.v = function(a, b) {
    var c = this.d.id, d = this.d, e = this.c.u, f = this;
    c ? (e.__webfonttypekitmodule__ || (e.__webfonttypekitmodule__ = {}), e.__webfonttypekitmodule__[c] = function(c) {
      c(a, d, function(a, c, d) {
        for (var e = 0; e < c.length; e += 1) {
          var g = d[c[e]];
          if (g)for (var Q = 0; Q < g.length; Q += 1)f.m.push(new H(c[e], g[Q])); else f.m.push(new H(c[e]))
        }
        b(a)
      })
    }, x(this.c, this.D(c), function(a) {
      a && b(l)
    }, 2e3)) : b(l)
  };
  $.prototype.load = function(a) {
    a(this.m)
  };
  T("typekit", function(a, b) {
    return new $(b, a)
  });
  window.WebFontConfig && U.load(window.WebFontConfig)
})(this, document);