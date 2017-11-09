/* See license.txt for terms of usage */
/*global window:false, alert, getFireTVPluginInstance, Components */
try {
	(function () {
		if (this.UI) {
			return;
		}
		
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cr = Components.results;
		
		var _this = this;
		
		var FBTrace = this.FBTrace;

		var ui = {};

		ui.CAT = "[ftv.ui] ";

		ui.TOPBAR_HEIGHT = 57;

		ui.TV_FORMATS = [ {
			label : "RAW",
			ratioX : 1,
			ratioY : 1
		}, {
			label : "4:3",
			ratioX : 4,
			ratioY : 3
		}, {
			label : "3:2",
			ratioX : 3,
			ratioY : 2
		}, {
			label : "16:9",
			ratioX : 16,
			ratioY : 9
		}
		];
		
		ui.getTVFormatById = function (id) {
			var i;
			for (i = 0; i < ui.TV_FORMATS.length; i++) {
				if (ui.TV_FORMATS[i].label === id) {
					return ui.TV_FORMATS[i];
				}	
			}
			return null;
		};

		var stylesheetService = Cc["@mozilla.org/content/style-sheet-service;1"]
				.getService(Ci.nsIStyleSheetService);

		var appContent = document.getElementById("appcontent");

		var getFireTVFontCss = function () {
			var style = "@font-face {\n";
			style += "   font-family: FireTV;\n";
			style += "   src: url('" + _this.FileUtils.getResourceAsDataURI("chrome://firetv-fonts/content/Brie/brie-medium.otf",
							"application/x-font-otf") + "');\n";
			style += "}\n";
			var data = "data:text/css;charset=firetv," + encodeURIComponent(style);
			var ios = Cc["@mozilla.org/network/io-service;1"]
					.getService(Ci.nsIIOService);
			return ios.newURI(data, null, null);
		};
		
		var getUIStyle = function () {
			var style = "";
			var hosts = _this.PreferenceManager.getConfiguredHosts();
			var selector, selectorProxy, selectorFullscreen;
			if (hosts.length > 0) {
				style += "@namespace html url(http://www.w3.org/1999/xhtml);\n";
				style += "@namespace xul url(http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul);\n";
				style += "@-moz-document \n";
				var i, l = hosts.length, profileName, profileDefinition;
				for (i = 0; i < l; i++) {
					style += " \turl-prefix(" + hosts[i] + ")";
					if (i < l - 1) {
						style += ",";
					}
					style += "\n";
				}
				style += "{\n";

				// -- General layout
				style += "\n/* general rules */\n";
				style += "html[firetv-profile]  {margin:0 !important; padding:0 !important; overflow:hidden !important}\n";
				style += "html[firetv-profile] body {margin:0 !important; padding:0 !important;}\n";

				style += "html[firetv-profile] embed:-moz-type-unsupported, html[firetv-profile] applet:-moz-type-unsupported, html[firetv-profile] object:-moz-type-unsupported, html[firetv-profile] embed:-moz-type-unsupported-platform, html[firetv-profile] applet:-moz-type-unsupported-platform, html[firetv-profile] object:-moz-type-unsupported-platform {-moz-binding: none !important}"
				
				style += "\n/* top-container */\n";
				style += "html[firetv-class=\"firetv\"] { overflow:-moz-hidden-unscrollable !important; position:absolute !important; top:0px !important; padding-top:" + ui.TOPBAR_HEIGHT + "px !important; left:0 !important; right:0 !important; bottom:0 !important; background-image:url(chrome://firetv-images/content/background.svg) !important; background-repeat: repeat !important; width: auto !important; height: auto !important}\n";
				style += "html[firetv-class=\"firetv\"] { -moz-binding: url('chrome://firetv-ui/content/bindings/bindings.xml#firetv-overlay')}\n";
				style += "html[firetv-class=\"firetv\"] body {position:absolute !important; overflow: visible !important; -moz-binding: url('chrome://firetv-ui/content/bindings/bindings.xml#firetv-body-behaviour')}\n";
//				style += "html[firetv-class=\"firetv\"] body .firebugResetStyles {position: absolute !important}\n";
//				style += "html[firetv-class=\"firetv\"] body .firebugLayoutBoxOffset {position: absolute !important}\n";
//				style += "html[firetv-class=\"firetv\"] body .firebugLayoutBoxParent {position: absolute !important}\n";
//				style += "html[firetv-class=\"firetv\"] body .fbProxyElement {position: absolute !important}\n";
				
				style += "html[firetv-class=\"firetv\"] body textarea, html[firetv-class=\"firetv\"] body input:not([type]), html[firetv-class=\"firetv\"] body input[type=text], html[firetv-class=\"firetv\"] body input[type=password] { cursor: default !important;  -moz-binding: url('chrome://firetv-ui/content/bindings/bindings.xml#firetv-input-mode')}\n";
				
				selector = "";
				selectorProxy = "";
				selectorFullscreen = "";
				for (i = 0; i < _this.Constants.AV_MIME_TYPES.length; i++) {
					selector += "object[type=\"" + _this.Constants.AV_MIME_TYPES[i] + "\"]";
					selectorProxy += "object[type=\"" + _this.Constants.AV_MIME_TYPES[i] + "+firetv\"]";
					selectorFullscreen += "object[type=\"" + _this.Constants.AV_MIME_TYPES[i] + "+firetv\"][firetv-fullscreen=\"true\"]";
					if (i < _this.Constants.AV_MIME_TYPES.length - 1) {
						selector += ",";
						selectorProxy += ",";
						selectorFullscreen += ",";
					}
				}
				style += selectorProxy + "{min-width:1px !important; min-height:1px !important; background-clip: padding-box !important; display:inline-block !important}\n";
				style += selectorFullscreen + "{border:none !important}\n";
				
				
				// -- Margin display -- sits here because mishandled in binding
				// related css
				style += "\n/* margin-display */\n";
				style += "html[firetv-margin-display=true] .firetv-margin {border-color: rgba(240, 240, 240, 1) !important; background-color: rgba(0, 0, 0, 0.4) !important; transition-property: background-color, border-color; transition-property: background-color, border-color; transition-duration: 0.3s; transition-duration: 0.3s; visibility: visible !important; z-index: 1000000 !important; }\n";
				style += "html[firetv-margin-display=false] .firetv-margin {border-color: transparent !important;background-color: transparent !important; transition-property: background-color, border-color; transition-property: background-color, border-color; transition-duration: 0.5s; transition-duration: 0.5s; visibility: visible !important; z-index: 1000000 !important;}\n\n";
				style += "html[firetv-margin-display=true][firetv-fullscreen=true] .firetv-margin {visibility: hidden !important}\n";
				
				var profileCss, j, k, file, sheet, m, tvFormat, targetScaledWidth, targetScaledHeight, scaleX, scaleY, autoscalingFactor, autoscalingFactorX, autoscalingFactorY, centeringRules, sizeInfos;

				for (i = 0; i < _this.ProfileManager.profilesNames.length; i++) {
					profileName = _this.ProfileManager.profilesNames[i];
					profileDefinition = _this.ProfileManager.getProfileDefinition(profileName);

					// -- profile TV resolution
					style += "\n\n/* --- " + profileName + " profile resolution rule --- */\n";
					style += "html[firetv-class=\"firetv\"][firetv-profile=\"" + profileDefinition.name + "\"] body,\n";
					style += "html[firetv-class=\"firetv\"][firetv-profile=\"" + profileDefinition.name + "\"] #firetv-osd,\n";
					style += "html[firetv-class=\"firetv\"][firetv-profile=\"" + profileDefinition.name + "\"] #firetv-background-tv ";
					style += "{width:" + profileDefinition.resolution.width + "px !important; height:" + 
						profileDefinition.resolution.height + "px !important; position: absolute !important; top: " + 
						(ui.TOPBAR_HEIGHT - 1) + "px !important; border-width: 0 !important; overflow:hidden !important;}\n\n";
					
					// -- in fullscreen mode, tv is set at top
					style += "html[firetv-class=\"firetv\"][firetv-profile=\"" + profileDefinition.name + "\"][firetv-fullscreen=\"true\"] body,\n";
					style += "html[firetv-class=\"firetv\"][firetv-profile=\"" + profileDefinition.name + "\"][firetv-fullscreen=\"true\"] #firetv-osd,\n";
					style += "html[firetv-class=\"firetv\"][firetv-profile=\"" + profileDefinition.name + "\"][firetv-fullscreen=\"true\"] #firetv-background-tv ";
					style += "{top:0 !important;}\n\n";
					
					// -- profile TV formats
					style += "/* --- " + profileName + " profile tv format rules --- */\n";

					for (j = 0; j < ui.TV_FORMATS.length; j++) {
						tvFormat = ui.TV_FORMATS[j];
						if (tvFormat.label === "RAW") {
							targetScaledWidth = profileDefinition.resolution.width;
							targetScaledHeight = profileDefinition.resolution.height;
						} else {
							targetScaledWidth = profileDefinition.resolution.height * tvFormat.ratioX / tvFormat.ratioY;
							targetScaledHeight = profileDefinition.resolution.height; //profileDefinition.resolution.width * tvFormat.ratioY / tvFormat.ratioX;
						}
						
						var scalings = ["noscale", "auto-downscale-only", "auto-upscale-only", "auto-scale"];
						for (k = 0; k < scalings.length; k++) {
							switch (scalings[k]) {
							case "noscale":
								autoscalingFactor = 1;
								break;
							case "auto-downscale-only":
								autoscalingFactorX = Math.min(1, ui.viewportWidth / targetScaledWidth);
								autoscalingFactorY = Math.min(1, ui.viewportHeight / targetScaledHeight);
								autoscalingFactor = Math.min(autoscalingFactorX, autoscalingFactorY);
								break;
							case "auto-upscale-only":
								autoscalingFactorX = Math.max(1, ui.viewportWidth / targetScaledWidth);
								autoscalingFactorY = Math.max(1, ui.viewportHeight / targetScaledHeight);
								autoscalingFactor = Math.min(autoscalingFactorX, autoscalingFactorY);
								break;
							case "auto-scale":
								autoscalingFactorX = ui.viewportWidth / targetScaledWidth;
								autoscalingFactorY = ui.viewportHeight / targetScaledHeight;
								autoscalingFactor = Math.min(autoscalingFactorX, autoscalingFactorY);
								break;
							}
//							if (FBTrace.DBG_FIRETV_UI) {
//								FBTrace.sysout(ui.CAT + "[getUIStyle] " + profileName + ", " + tvFormat.label + ", " + scalings[k] + " | " + autoscalingFactor + " | v.w=" + ui.viewportWidth + ", v.h=" + ui.viewportHeight + ", w=" + targetScaledWidth + ", h=" + targetScaledHeight + ", v.w/w=" + (ui.viewportWidth / targetScaledWidth) + ", v.h/h=" + (ui.viewportHeight / targetScaledHeight));
//							}
							 
							scaleX = autoscalingFactor * targetScaledWidth / profileDefinition.resolution.width;
							scaleY = autoscalingFactor * 1;
							
							centeringRules = "transform-origin: 0% 0%;";
							if (((ui.viewportWidth - (scaleX * profileDefinition.resolution.width)) / 2) >= 0) {
								centeringRules += "left: " + ((ui.viewportWidth - (scaleX * profileDefinition.resolution.width)) / 2) + "px !important";
							}

							style += "html[firetv-class=\"firetv\"][firetv-profile=\"" + profileDefinition.name + "\"][firetv-scaling=\"" + scalings[k] + "\"][firetv-tv-format=\"" + tvFormat.label + "\"] body,\n";
							style += "html[firetv-class=\"firetv\"][firetv-profile=\"" + profileDefinition.name + "\"][firetv-scaling=\"" + scalings[k] + "\"][firetv-tv-format=\"" + tvFormat.label + "\"] #firetv-osd,\n";
							style += "html[firetv-class=\"firetv\"][firetv-profile=\"" + profileDefinition.name + "\"][firetv-scaling=\"" + scalings[k] + "\"][firetv-tv-format=\"" + tvFormat.label + "\"] #firetv-background-tv ";
							style += "{transition-property: transform, left !important;  transition-duration: 0.3s !important; transform: scale(" + scaleX + "," + scaleY + "); " + centeringRules + "}\n";
							
							sizeInfos = "[" + profileDefinition.resolution.width + "x" + profileDefinition.resolution.height + "]";
							if (scaleX !== 1 || scaleY !== 1) {
								sizeInfos += " Pixel: " + (("" + scaleX).substr(0, 4)) + "x" + (("" + scaleY).substr(0, 4));
								sizeInfos += " - Scaled: " + (Math.ceil(scaleX * profileDefinition.resolution.width)) + "x" + (Math.ceil(scaleY * profileDefinition.resolution.height)) + "px";
							}
							style += "html[firetv-class=\"firetv\"][firetv-profile=\"" + profileDefinition.name + 
								"\"][firetv-scaling=\"" + scalings[k] + "\"][firetv-tv-format=\"" + tvFormat.label + 
								"\"] [anonid=\"firetv-additional-infos\"]:after {content:\"" + sizeInfos + "\"}\n";
							
							if (scaleX * profileDefinition.resolution.width > ui.viewportWidth) {
								style += "html[firetv-class=\"firetv\"][firetv-profile=\"" + profileDefinition.name + "\"][firetv-scaling=\"" + scalings[k] + "\"][firetv-tv-format=\"" + tvFormat.label + "\"] {overflow-x: scroll !important}\n";
							}
							if (scaleY * profileDefinition.resolution.height > ui.viewportHeight) {
								style += "html[firetv-class=\"firetv\"][firetv-profile=\"" + profileDefinition.name + "\"][firetv-scaling=\"" + scalings[k] + "\"][firetv-tv-format=\"" + tvFormat.label + "\"] {overflow-y: scroll !important}\n";
							}
						}
					}
					
					// -- special fullscreen mode scaling
					scaleX = window.innerWidth / profileDefinition.resolution.width;
					scaleY = window.innerHeight / profileDefinition.resolution.height;
					style += "html[firetv-class=\"firetv\"][firetv-profile=\"" + profileDefinition.name + "\"][firetv-scaling][firetv-tv-format][firetv-fullscreen=\"true\"] body,\n";
					style += "html[firetv-class=\"firetv\"][firetv-profile=\"" + profileDefinition.name + "\"][firetv-scaling][firetv-tv-format][firetv-fullscreen=\"true\"] #firetv-osd,\n";
					style += "html[firetv-class=\"firetv\"][firetv-profile=\"" + profileDefinition.name + "\"][firetv-scaling][firetv-tv-format][firetv-fullscreen=\"true\"] #firetv-background-tv ";
					style += "{transition-property: transform, left !important;  transition-duration: 0.3s !important; transform: scale(" + scaleX + "," + scaleY + "); left: 0 !important}\n";
					

					// -- profile specific external sheets
					if (profileDefinition.stylesheets) {
						for (j = 0; j < profileDefinition.stylesheets.length; j++) {
							file = profileName + "/" + profileDefinition.stylesheets[j];
							profileCss = _this.FileUtils.getResourceAsString("chrome://firetv-profile/content/" + file);
							sheet = _this.CSSUtils.Parser.parse(profileCss);
							sheet.prefixSelector("html[firetv-profile=\"" + profileDefinition.name + "\"]");
							profileCss = "\n/* --- " + profileName + " profile rules --- */\n";
							profileCss += sheet.serialize();
							profileCss += "\n";
							style += profileCss;
							if (FBTrace.DBG_FIRETV_UI) {
								FBTrace.sysout(ui.CAT + "[getUIStyle] Loaded profile stylesheet : " + file, {
									file : file,
									cssText : profileCss
								});
							}
						}
					}
					// -- margins
					m = profileDefinition.margins;
					style += "\n/* --- " + profileName + " margin rules --- */\n";
					style += "html[firetv-profile=\"" + profileDefinition.name + "\"] #firetv-margin-nw {width:" + m.left + "px !important; height:" + m.top + "px !important; }\n";
					style += "html[firetv-profile=\"" + profileDefinition.name + "\"] #firetv-margin-n  {left:" + m.left + "px !important; height:" + m.top + "px !important; right:" + m.right + "px !important;}\n";
					style += "html[firetv-profile=\"" + profileDefinition.name + "\"] #firetv-margin-ne {width:" + m.right + "px !important; height:" + m.top + "px !important;}\n";
					style += "html[firetv-profile=\"" + profileDefinition.name + "\"] #firetv-margin-e  {top:" + m.top + "px !important; width:" + m.right + "px !important; bottom:" + m.bottom + "px !important;}\n";
					style += "html[firetv-profile=\"" + profileDefinition.name + "\"] #firetv-margin-se {width:" + m.right + "px !important; height:" + m.bottom + "px !important;}\n";
					style += "html[firetv-profile=\"" + profileDefinition.name + "\"] #firetv-margin-s  {left:" + m.left + "px !important; right:" + m.right + "px !important; height:" + m.bottom + "px !important;}\n";
					style += "html[firetv-profile=\"" + profileDefinition.name + "\"] #firetv-margin-sw {width:" + m.left + "px !important; height:" + m.bottom + "px !important;}\n";
					style += "html[firetv-profile=\"" + profileDefinition.name + "\"] #firetv-margin-w  {top: " + m.top + "px !important; bottom:" + m.bottom + "px !important; width:" + m.left + "px !important;}\n";
				}

				style += "}";
			}

			if (FBTrace.DBG_FIRETV_UI) {
				FBTrace.sysout(ui.CAT + "[getUIStyle]", style);
			}
			var data = "data:text/css;charset=firetv," + encodeURIComponent(style);
			var ios = Cc["@mozilla.org/network/io-service;1"]
					.getService(Ci.nsIIOService);
			return ios.newURI(data, null, null);
		};

		var resizeTimeoutId = -1;

		var resizeHandler = function (win) {
			if (appContent.clientWidth !== ui.viewportWidth || (appContent.clientHeight - ui.TOPBAR_HEIGHT) !== ui.viewportHeight) {
				if (FBTrace.DBG_FIRETV_UI) {
					FBTrace.sysout(ui.CAT + "[resizeHandler] viewport size : [" + ui.viewportWidth + "x" + 
							ui.viewportHeight + "] => [" + appContent.clientWidth + "x" + 
							(appContent.clientHeight - ui.TOPBAR_HEIGHT) + "] (fullScreen=" + win.fullScreen + ")");
				}
				checkFullscreen(win);
				ui.viewportWidth = appContent.clientWidth;
				ui.viewportHeight = appContent.clientHeight - ui.TOPBAR_HEIGHT;
				ui.reload();
			}
		};
		

		var checkFullscreen = function (win) {
			var document = win.wrappedJSObject.document;
			if (document.documentElement) {
				document.documentElement.setAttribute("firetv-fullscreen", win.fullScreen);
			}
		};
		
		ui.resizeHandler = resizeHandler;
		
		var resizeHandlerTrigger = function (event) {
			var win = event.target;
//			if (win.location.toString() !== "chrome://browser/content/browser.xul") {
//				return;
//			}
			if (resizeTimeoutId !== -1) {
				clearTimeout(resizeTimeoutId);
			}
			resizeTimeoutId = setTimeout(function () {
				resizeHandler.apply(null, [win]);
			}, 200);
		};

		ui.currentStyle = null;
		
		ui.checkFullscreen = checkFullscreen;

		ui.reload = function () {
			if (FBTrace.DBG_FIRETV_UI) {
				FBTrace.sysout(ui.CAT + "[reload] viewport size : " + ui.viewportWidth + "x" + ui.viewportHeight);
			}
			var u;
			if (ui.currentStyle !== null && stylesheetService.sheetRegistered(ui.currentStyle, stylesheetService.AGENT_SHEET)) {
				stylesheetService.unregisterSheet(ui.currentStyle, stylesheetService.AGENT_SHEET);
			}
			u = getUIStyle();
			stylesheetService.loadAndRegisterSheet(u, stylesheetService.AGENT_SHEET);
			ui.currentStyle = u;
		};

		ui.init = function () {
			if (FBTrace.DBG_FIRETV_UI) {
				FBTrace.sysout(ui.CAT + "[init]");
			}
			ui.viewportWidth = appContent.clientWidth;
			ui.viewportHeight = appContent.clientHeight;

			if (FBTrace.DBG_FIRETV_UI) {
				FBTrace.sysout(ui.CAT + "[init] Register firetv font.");
			}
			stylesheetService.loadAndRegisterSheet(getFireTVFontCss(), stylesheetService.AGENT_SHEET);
			
			window.addEventListener("resize", resizeHandlerTrigger, false);
			ui.reload();
			if (FBTrace.DBG_FIRETV_UI) {
				FBTrace.sysout(ui.CAT + "[done]");
			}
		};

		ui.shutdown = function () {
			if (FBTrace.DBG_FIRETV_UI) {
				FBTrace.sysout(ui.CAT + "[shutdown]");
			}
			window.removeEventListener("resize", resizeHandlerTrigger, false);
			if (FBTrace.DBG_FIRETV_UI) {
				FBTrace.sysout(ui.CAT + "[done]");
			}

		};

		this.UI = ui;

	}).apply(getFireTVPluginInstance());
} catch (exc) {
	alert("[ftv-ui.js] " + exc);
}
