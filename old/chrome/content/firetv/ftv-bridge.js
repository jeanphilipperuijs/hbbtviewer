/* See license.txt for terms of usage */
/*global window:false, alert, getFireTVPluginInstance, Components */
try {
	(function () {
		if (this.Bridge) {
			return;
		}
		
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cr = Components.results;
		const Cu = Components.utils;
		
		var _this = this;
		
		var FBTrace = this.FBTrace;

		var bridge = {};

		bridge.CAT = "[ftv.bridge] ";

		var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

		function initBridgeInterface(bridgeInterface) {
			
			function lightClone(o) {
				if (!o) {
					return o;
				}
				var clone = {};
				for (var i in o) {
					if (o.hasOwnProperty(i)) {
						clone[i] = o[i]; 
					}
				}
				return clone;
			}
			
			function filterPlayerByAvailability(element, index, array) {
				if (!element.mimetype) {
					return true;
				}
				window.navigator.plugins.refresh(false);
				if (window.navigator.mimeTypes[element.mimetype] && window.navigator.mimeTypes[element.mimetype].enabledPlugin) {
					return true;
				}
				return false;
			}
			function mapPlayer(element) {
				return {
					value: element.impl,
					label: element.label
				};
			}
			function mapChannel(element) {
				var channel = lightClone(element, true);
				var num = parseInt(channel.ccid.replace(/^ccid:/, ""), 10);
				channel.value = channel.ccid;
				channel.label = ((num >= 0) ? (num + " - ") : "")  + channel.name;
				channel.defaultStream = channel.stream;
				
				delete(channel.stream);
				Object.defineProperty(channel, "stream", {
					get: function stream() {
						var customStream = _this.PreferenceManager.getCustomStreamUrlForCcid(channel.ccid);
						return (customStream) ? customStream : channel.defaultStream;
					},
					enumerable: true
				});
				return channel;
			}
			
			var PLAYERS = [
			    {impl: "SVGPlayer", label: "Player SVG", available: true },
			    {impl: "HTMLPlayer", label: "Player HTML", available: true },
			    {impl: "VLCPlayer", label: "Player VLC (WebChimera)", mimetype: "application/x-chimera-plugin", available: false }
			];
						
			var BROADCAST_PLAYERS = [
			    {impl: "SVGBroadcastPlayer", label: "TV SVG", available: true },
			    {impl: "HTMLBroadcastPlayer", label: "TV HTML", available: true },
			    {impl: "VLCBroadcastPlayer", label: "TV VLC (WebChimera) ", mimetype: "application/x-chimera-plugin", available: false }
			];
						
			var TV_FORMATS = [
			    {value : "RAW", label : "RAW"}, 
			    {value : "4:3", label : "4:3"},
			    {value : "3:2", label : "3:2"}, 
			    {value : "16:9", label : "16:9"}
			];
			
			var UI_SCALINGS = [ 
			    {value : "noscale", label : _this.Messages.getMessage("firetv.scaling.noscale")}, 
			    {value : "auto-downscale-only", label : _this.Messages.getMessage("firetv.scaling.autoDownscaleOnly")},
			    {value : "auto-upscale-only", label : _this.Messages.getMessage("firetv.scaling.autoUpscaleOnly")},
			    {value : "auto-scale", label : _this.Messages.getMessage("firetv.scaling.autoScale")}
			];
						
			var PROFILES = (function () {
				var res = [], i, profileName, profileDefinition;
				for (i = 0; i < _this.ProfileManager.profilesNames.length; i++) {
					profileName = _this.ProfileManager.profilesNames[i];
					profileDefinition = _this.ProfileManager.getProfileDefinition(profileName);
					res.push({
						value : profileName,
						label : profileDefinition.label,
						icon : profileDefinition.icon
					});
				}
				res.sort(function (a, b) {
					return a.label > b.label ? 1 : -1;
				});
				return res;
			})();
						
			
			// -- ####################################
			// -- bridge functions
			// -- ####################################
			
			// -- profiles
			bridgeInterface.getProfiles = function (ctx) {
				return PROFILES;
			};
			bridgeInterface.getCurrentProfile = function (ctx) {
				var tabProfile = ctx.tabInfos.profile;
				var profileDefinition = _this.ProfileManager.getProfileDefinition(tabProfile);
				return {
					value : tabProfile,
					label : profileDefinition.label,
					icon : profileDefinition.icon
				};
			};
			bridgeInterface.setCurrentProfile = function (ctx, profile) {
				ctx.tabInfos.profile = profile;
				_this.PreferenceManager.setHostRelatedPref(ctx.host, "profile", profile);
				ctx.window.top.location.reload(true);
			};
	
			// -- tv format
			bridgeInterface.getTVFormats = function (ctx) {
				return TV_FORMATS;
			};
			bridgeInterface.getCurrentTVFormat = function (ctx) {
				var val = ctx.tabInfos["tv-format"];
				if (!val) {
					var profileDefinition = _this.ProfileManager.getProfileDefinition(ctx.tabInfos.profile);
					if (profileDefinition.defaultTVFormat) {
						val = profileDefinition.defaultTVFormat;
					} else {
						val = "RAW";
					}
				}
				return {
					value : val,
					label : val
				};
			};
			bridgeInterface.setCurrentTVFormat = function (ctx, tvFormat) {
				ctx.tabInfos["tv-format"] = tvFormat;
				_this.PreferenceManager.setHostRelatedPref(ctx.host, "tv-format", tvFormat);
				ctx.window.top.document.documentElement.setAttribute("firetv-tv-format", tvFormat);
				ctx.window.top.FireTVPlugin.bridge.dispatchEvent({
					type: "firetv-config-change",
					configKey: "tv-format",
					configValue : tvFormat
				});
			};
			
			// -- ui-scalings
			bridgeInterface.getUIScalings = function (ctx) {
				return UI_SCALINGS;
			};
			bridgeInterface.getCurrentUIScaling = function (ctx) {
				var val = ctx.tabInfos["scaling"];
				if (!val) {
					val = _this.PreferenceManager.getHostRelatedPref(ctx.host, "scaling");
					if (!val) {
						val = "auto-downscale-only";
					}
				}
				for (var i = 0; i < UI_SCALINGS.length; i++) {
					if (UI_SCALINGS[i].value === val) {
						return UI_SCALINGS[i];
					}
				}
				return UI_SCALINGS[1]; // "auto-downscale-only" -> ascendant compatibility
			};
			bridgeInterface.setCurrentUIScaling = function (ctx, scaling) {
				ctx.tabInfos["scaling"] = scaling;
				_this.PreferenceManager.setHostRelatedPref(ctx.host, "scaling", scaling);
				ctx.window.top.document.documentElement.setAttribute("firetv-scaling", scaling);
				ctx.window.top.FireTVPlugin.bridge.dispatchEvent({
					type: "firetv-config-change",
					configKey: "scaling",
					configValue : scaling
				});
			};

			// -- ua
			bridgeInterface.getOverriddenUserAgent = function (ctx) {
				val = _this.PreferenceManager.getOverriddenUserAgent(ctx.tabInfos.profile);
				return val;
			};
			bridgeInterface.setOverriddenUserAgent = function (ctx, userAgent) {
				_this.PreferenceManager.setOverriddenUserAgent(ctx.tabInfos.profile, userAgent);
			};
			
			bridgeInterface.isUserAgentSuffixEnabled = function (ctx) {
				val = _this.PreferenceManager.isUserAgentSuffixEnabled();
				return val;
			};
			bridgeInterface.setUserAgentSuffixEnabled = function (ctx, enable) {
				_this.PreferenceManager.setUserAgentSuffixEnabled(enable);
			};
			
			// -- margin display
			bridgeInterface.getMarginDisplay = function (ctx) {
				var val = ctx.tabInfos["margin-display"];
				if (typeof val !== "boolean") {
					val = _this.PreferenceManager.getHostRelatedPref(ctx.host, "margin-display");
					if (!val) {
						val = _this.PreferenceManager.getGlobalMarginDisplay();
					}
				}
				return val;
			};
			bridgeInterface.setMarginDisplay = function (ctx, display) {
				ctx.tabInfos["margin-display"] = display;
				_this.PreferenceManager.setHostRelatedPref(ctx.host, "margin-display", display);
				ctx.window.top.document.documentElement.setAttribute("firetv-margin-display", display);
				ctx.window.top.FireTVPlugin.bridge.dispatchEvent({
					type: "firetv-config-change",
					configKey: "margin-display",
					configValue : display
				});
			};
				
			// -- media player
			bridgeInterface.getMediaPlayers = function (ctx) {
				return PLAYERS.filter(filterPlayerByAvailability).map(mapPlayer);
			};
			bridgeInterface.getMediaPlayer = function (ctx) {
				var val = ctx.tabInfos["media-player"];
				if (!val) {
					val = _this.PreferenceManager.getHostRelatedPref(ctx.host, "media-player");
					if (!val) {
						val = _this.PreferenceManager.getDefaultMediaPlayer();
					}
				}
				var i, impls = bridgeInterface.getMediaPlayers(ctx);
				for (i = 0; i < impls.length; i++) {
					if (impls[i].value === val) {
						return impls[i];
					}
				}
				val = _this.PreferenceManager.getDefaultMediaPlayer();
				for (i = 0; i < impls.length; i++) {
					if (impls[i].value === val) {
						return impls[i];
					}
				}
				return null; // should never happen as default media player will always be there
			};
			bridgeInterface.setMediaPlayer = function (ctx, player) {
				ctx.tabInfos["media-player"] = player;
				_this.PreferenceManager.setHostRelatedPref(ctx.host, "media-player", player);
				ctx.window.top.FireTVPlugin.bridge.dispatchEvent({
					type: "firetv-config-change",
					configKey: "media-player",
					configValue : player
				});
			};
				
			// -- broadcast
			bridgeInterface.getBroadcastPlayers = function (ctx) {
				return BROADCAST_PLAYERS.filter(filterPlayerByAvailability).map(mapPlayer);
			};
				
			bridgeInterface.getBroadcastPlayer = function (ctx) {
				var val = ctx.tabInfos["broadcast-player"];
				if (!val) {
					val = _this.PreferenceManager.getHostRelatedPref(ctx.host, "broadcast-player");
					if (!val) {
						val = "SVGBroadcastPlayer";
					}
				}
				var i, impls = bridgeInterface.getBroadcastPlayers(ctx);
				for (i = 0; i < impls.length; i++) {
					if (impls[i].value === val) {
						return impls[i];
					}
				}
				val = "SVGBroadcastPlayer";
				for (i = 0; i < impls.length; i++) {
					if (impls[i].value === val) {
						return impls[i];
					}
				}
				return null; // should never happen as SVG broadcast player will always be there
			};
			bridgeInterface.setBroadcastPlayer = function (ctx, player) {
				ctx.tabInfos["broadcast-player"] = player;
				_this.PreferenceManager.setHostRelatedPref(ctx.host, "broadcast-player", player);
				ctx.window.top.FireTVPlugin.bridge.dispatchEvent({
					type: "firetv-config-change",
					configKey: "broadcast-player",
					configValue : player
				});
			};
			
			// -- stream infos
			bridgeInterface.updateStreamInfos = function (ctx) {
				var streamInfos =  ctx.wrappedWindow.top.document.getAnonymousElementByAttribute(ctx.wrappedWindow.top.document.documentElement, "anonid", "firetv-stream-infos");
				var streamInfosInput =  ctx.wrappedWindow.top.document.getAnonymousElementByAttribute(ctx.wrappedWindow.top.document.documentElement, "anonid", "firetv-stream-infos-input");
				var streamInfosChannel =  ctx.wrappedWindow.top.document.getAnonymousElementByAttribute(ctx.wrappedWindow.top.document.documentElement, "anonid", "firetv-stream-infos-channel");
				var ccid = ctx.window.FireTVPlugin.bridge.getCurrentTVChannel().ccid;
				var channel = ctx.window.FireTVPlugin.bridge.getTVChannelByCcid(ccid);
				
				if (ccid === "ccid:-1") {
					streamInfos.style.setProperty("visibility", "hidden", "important");
					return;
				} else {
					streamInfos.style.setProperty("visibility", "visible", "important");
				}
				
				var url = "N/A", label = "";
				if (channel) {
					if (ccid !== "ccid:-1" && channel.stream && channel.stream !== "") {
						url = channel.stream;
					}
					label = "[" + channel.name + "]";
				}
				if (streamInfosInput && streamInfosChannel) {
					while (streamInfosChannel.firstChild) {
						streamInfosChannel.removeChild(streamInfosChannel.firstChild);
					}
					streamInfosChannel.appendChild(document.createTextNode(label));
					if (url === "N/A") {
						streamInfosInput.setAttribute("value", "");
					} else {
						streamInfosInput.setAttribute("value", url);
					}
					if (streamInfosInput.wrappedJSObject && streamInfosInput.wrappedJSObject._firetvValidateInput) {
						streamInfosInput.wrappedJSObject._firetvValidateInput();
					}
				}
			};
			
			bridgeInterface.setChannelCustomStream = function (ctx, ccid, value) {
				_this.PreferenceManager.setCustomStreamUrlForCcid(ccid, value);
			};
			
			// -- osd
			bridgeInterface.hideOSD = function (ctx) {
				var osd = ctx.wrappedWindow.top.document.getAnonymousElementByAttribute(ctx.wrappedWindow.top.document.documentElement, "anonid", "firetv-osd");
				osd.style.visibility = "hidden";
			};
			
			bridgeInterface.displayOSDMessage = function (ctx, text) {
				var osd = ctx.wrappedWindow.top.document.getAnonymousElementByAttribute(ctx.wrappedWindow.top.document.documentElement, "anonid", "firetv-osd");
				var msg = osd.firstChild;
				while (msg.firstChild) {
					msg.removeChild(msg.firstChild);
				}
				msg.appendChild(msg.ownerDocument.createTextNode(text));
				osd.style.visibility = "inherit";
			};
			
			// -- other infos
			bridgeInterface.updateOtherInfos = function (ctx, text) {
				var otherInfos = ctx.wrappedWindow.top.document.getAnonymousElementByAttribute(ctx.wrappedWindow.top.document.documentElement, "anonid", "firetv-other-infos");
				while (otherInfos.firstChild) {
					otherInfos.removeChild(otherInfos.firstChild);
				}
				otherInfos.appendChild(ctx.window.top.document.createTextNode(text));
			};
			
			// -- tv channels
			bridgeInterface.getTVChannels = function (ctx) {
				var channelList = _this.Broadcast.getCurrentChannelList();
				// -- return a brand new one each time, be cause it can change at runtime (not very clever anyway) TODO improve
				return channelList.map(mapChannel);
			};

			bridgeInterface.getTVChannelByCcid = function (ctx, ccid) {
				var i, channel, channelList = _this.Broadcast.getCurrentChannelList();
				for (i = 0; i < channelList.length; i++) {
					channel = channelList[i];
					if (channel.ccid === ccid) {
						return mapChannel(channel);
					}
				}
				return null;
			};
			bridgeInterface.getCurrentTVChannel = function (ctx) {
				var val = ctx.tabInfos["tv-channel"];
				if (!val) {
					val = _this.PreferenceManager.getHostRelatedPref(ctx.host, "tv-channel");
					if (!val) {
						val = "ccid:-1";
					}
				}
				return bridgeInterface.getTVChannelByCcid(ctx, val);
			};
			bridgeInterface.setCurrentTVChannel = function (ctx, ccid) {
				ctx.tabInfos["tv-channel"] = ccid;
				_this.PreferenceManager.setHostRelatedPref(ctx.host, "tv-channel", ccid);
				ctx.window.top.FireTVPlugin.bridge.dispatchEvent({
					type: "firetv-config-change",
					configKey: "tv-channel",
					configValue : ccid
				});
				ctx.window.FireTVPlugin.bridge.dispatchEvent({
					type: "firetv-channel-change",
					ccid: ccid
				});
			};
			
			// -- stream event
			bridgeInterface.getStreamEventName = function (ctx) {
				var val = ctx.tabInfos["streamevent-name"];
				if (!val) {
					val = _this.PreferenceManager.getHostRelatedPref(ctx.host, "streamevent-name");
					if (!val) {
						val = "";
					}
				}
				return val;
			};
			bridgeInterface.setStreamEventName = function (ctx, name) {
				ctx.tabInfos["streamevent-name"] = name;
				_this.PreferenceManager.setHostRelatedPref(ctx.host, "streamevent-name", name);
			};
			
			bridgeInterface.getStreamEventData = function (ctx) {
				var val = ctx.tabInfos["streamevent-data"];
				if (!val) {
					val = _this.PreferenceManager.getHostRelatedPref(ctx.host, "streamevent-data");
					if (!val) {
						val = "";
					}
				}
				return val;
			};
			bridgeInterface.setStreamEventData = function (ctx, data) {
				ctx.tabInfos["streamevent-data"] = data;
				_this.PreferenceManager.setHostRelatedPref(ctx.host, "streamevent-data", data);
			};
			
			// -- widgets
			bridgeInterface.getWidgetVisible = function (ctx, widgetId) {
				var val = ctx.tabInfos[widgetId + "-visible"];
				if (!val) {
					val = _this.PreferenceManager.getHostRelatedPref(ctx.host, widgetId + "-visible");
					if (!val) {
						val = false;
					}
				}
				return val;
			};
			bridgeInterface.setWidgetVisible = function (ctx, widgetId, visible) {
				ctx.tabInfos[widgetId + "-visible"] = visible;
				_this.PreferenceManager.setHostRelatedPref(ctx.host, widgetId + "-visible", visible);
			};
			
			// -- tv image
			bridgeInterface.getTVImageDisplay = function (ctx) {
				var val = ctx.tabInfos["tvimage-display"];
				if (!val) {
					val = _this.PreferenceManager.getHostRelatedPref(ctx.host, "tvimage-display");
					if (!val) {
						val = false;
					}
				}
				return val;
			};
			bridgeInterface.setTVImageDisplay = function (ctx, display) {
				ctx.tabInfos["tvimage-display"] = display;
				_this.SVG.TV_IMAGE_PNG_CACHE = {};
				_this.PreferenceManager.setHostRelatedPref(ctx.host, "tvimage-display", display);
				ctx.window.top.document.documentElement.setAttribute("firetv-tvimage-display", display);
				ctx.window.top.FireTVPlugin.bridge.dispatchEvent({
					type: "firetv-config-change",
					configKey: "tvimage-display",
					configValue : display
				});
				ctx.window.top.location.reload(true);
			};
	
			bridgeInterface.chooseTVImage = function (ctx) {
				if (FBTrace.DBG_FIRETV_BRIDGE) {
					FBTrace.sysout(bridge.CAT + "[bridgeHandler.chooseTVImage]");
				}
				var tvImageFile = _this.FileUtils.chooseLocalFile(_this.Messages.getMessage("firetv.tvImage.fileChooserTitle"), Ci.nsIFilePicker.filterImages);
				if (FBTrace.DBG_FIRETV_BRIDGE) {
					FBTrace.sysout(bridge.CAT + "[bridgeHandler.chooseTVImage] file: " + tvImageFile);
				}
				if (tvImageFile !== null) {
					var success = _this.FileUtils.deleteFile(_this.FileUtils.getUserImageFile());
					success = success && _this.FileUtils.copyFile(tvImageFile.path, _this.FileUtils.getUserStorageDirectory().path, "tv");
					if (success) {
						bridgeInterface.setTVImageDisplay(ctx, true);
					} else {
						window.alert(_this.Messages.getMessage("firetv.tvImage.unableToCopy"));
					}
				}
			};
			
			// -- event dispatcher
			bridgeInterface.addEventListener = function (ctx, type, listener) {
				var b = ctx.window.FireTVPlugin.bridge;
				if (!b._listeners) {
					Object.defineProperty(b, "_listeners", {enumerable: false, writable: true, value: {}});
				}
				if (!b._listeners[type]) {
					b._listeners[type] = [];
				}
				b._listeners[type].push(listener);
			};
			bridgeInterface.removeEventListener = function (ctx, type, listener) {
				var b = ctx.window.FireTVPlugin.bridge;
				if (!b._listeners || !b._listeners[type]) {
					return;
				}
				var listeners = b._listeners[type];
				for (var i = listeners.length - 1; i >= 0; i--) {
					if (listeners[i] === listener) {
						listeners.splice(i, 1);
					}
				}
				if (listeners.length === 0) {
					delete b._listeners[type];
				}
			};
			
			bridgeInterface.dispatchEvent = function (ctx, event) {
				var evt = Cu.cloneInto(Cu.waiveXrays(event), ctx.window, {cloneFunctions: true, wrapReflectors: true});
				function callListeners(win) {
					if (win && win.FireTVPlugin && win.FireTVPlugin.bridge && evt.type) {
						var b = win.FireTVPlugin.bridge, i;
						if (!b._listeners || !b._listeners[evt.type]) {
							return;
						}
						var listeners = b._listeners[evt.type];
						for (i = 0; i < listeners.length; i++) {
							if (typeof (listeners[i] === "function")) {
								try {
									listeners[i](evt);
								} catch (e) {
									ctx.window.console.error(e);
								}
							}
						}
						var iframes = win.document.querySelectorAll("iframe");
						for (i = 0; i < iframes.length; i++) {
							callListeners(iframes[i].contentWindow);
						}
					}
				}
				if (ctx.window.top === ctx.window) {
					// -- call listeners for ctx.window (which is top window), then sub iframes recursively
					callListeners(ctx.window);
				} else {
					ctx.window.top.FireTVPlugin.bridge.dispatchEvent(evt);
				}
			};
			
			// -- various
			bridgeInterface.loadUrlInTopWindow = function (ctx, url) {
				ctx.window.top.location.href = url;
			};
			bridgeInterface.activateTopWindow = function (ctx) {
				var utils = ctx.window.top.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
				utils.sendNativeKeyEvent(0, 0x9, 0, "\u0009", "\u0009");
				ctx.window.top.focus(); // restore window focus so that does not really exit dom window
			};
			bridgeInterface.generateBackKeydown = function (ctx) {
				var utils = ctx.window.top.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
				utils.sendNativeKeyEvent(0, 0x8, 0, "\u0008", "\u0008");
			};
		}
		
		var bridgeInterface = {};
		
		var restoreTabInfosInDocument = function (ctx) {
			var doc = ctx.window.top.document.documentElement;
			doc.setAttribute("firetv-tv-format", bridgeInterface.getCurrentTVFormat(ctx).value);
			doc.setAttribute("firetv-scaling", bridgeInterface.getCurrentUIScaling(ctx).value);
			doc.setAttribute("firetv-margin-display", bridgeInterface.getMarginDisplay(ctx));
			doc.setAttribute("firetv-tvimage-display", bridgeInterface.getTVImageDisplay(ctx));
			doc.setAttribute("firetv-fullscreen", ctx.window.fullScreen);
		};
		
		var getPluginInterfaceForWindow = function (win) {
			var f, plugin = {};
			var tabInfos =  _this.TabManager.getTabInfosForWindow(win);
			// -- context injected in each bridge method:
			// - window: the js window
			// - tabInfos: the related tabinfos
			// - host: the top window host (used to retrieve prefs)
			var context = {
				wrappedWindow: win,
				window  : win.wrappedJSObject,
				tabInfos: tabInfos,
				host	: (win.top.location.protocol === "dvb:") ? "dvb:/" : (win.top.location.protocol + "//" + win.top.location.host)
			};
			if (win.top === win) {
				// -- restore tab infos on document element, that is : attribute that are used in firetv ui css
				restoreTabInfosInDocument(context);
			}
			var exposed = {
				"bridge": bridgeInterface
			};
			
			var api, prop, descriptor, i, pkgs, pkg, obj;
			for (api in exposed) {
				if (exposed.hasOwnProperty(api)) {
					pkgs = api.split(".");
					obj = plugin;
					for (i = 0; i < pkgs.length; i++) {
						pkg = pkgs[i];
						if (!obj[pkg]) {
							Object.defineProperty(obj, pkg, {enumerable: true, writable: true, value: {}});
						}
						obj = obj[pkg];
					}
					for (prop in exposed[api]) {
						if (typeof exposed[api][prop] === "function") {
							obj[prop] = (function () {
								var func = exposed[api][prop];
								var that = obj;
								var fn = prop;
								var path = api;
								return function () {
									var args = [context];
									for (var i = 0; i < arguments.length; i++) {
										args.push(arguments[i]);
									}
									var res = func.apply(that, args);
									return res;
								};
							})();
						}
					}
				}
			}
			
			function cloneFunction(win, func) {
			    var obj = XPCNativeWrapper.unwrap(new win.Object());
			    Object.defineProperty(obj, "f", {value: func});
			    Cu.makeObjectPropsNormal(obj);
			    return obj.f;
			}
			
			var unsafeCloneFunctionIntoContentScope = function(win, sandbox, func)
			{
				function chromeForwarder(args) {
			        var unwrappedArgs = XPCNativeWrapper.unwrap(args);
			        var wrappedArgs = [];
			        for (var i = 0; i < unwrappedArgs.length; i++)
			            wrappedArgs.push(XPCNativeWrapper(unwrappedArgs[i]));
			        var res = func.apply(null, wrappedArgs);
			        res = Cu.cloneInto(res, win);
			        if (Array.isArray(res)) {
			        	for (var i = 0; i < res.length; i++) {
			        		res[i] = Cu.cloneInto(res[i], win);
			        	}
			        	return res;
			        } else {
			        	return res;
			        }
			    }
			    var expr = "(function(x) { return function() { return x(arguments); }.bind(null); })";
			    // -- inspired by firebug <console> object injection
			    var makeContentForwarder = Cu.evalInSandbox(expr, sandbox);
			    return makeContentForwarder(cloneFunction(win, chromeForwarder));
			};
			
			
			// -- plugin is a chrome object, makes a wrapper that will be extensible by content, exposed functions are readonly
			var expr = "";
			expr += '(function(x) { \n';
			expr += '   var plugin = {};\n';
			// -- expose DBG, constants and messages
			expr += '   plugin.DBG = ' + _this.DBG + ';\n';
			expr += '   plugin.constants = ' + _this.Constants.toSource() + ';\n';
			expr += '   plugin.messages = ' + _this.Messages.stringBundle.toSource() + ';\n';
			expr += '   plugin.bridge = {};\n';
			expr += '   return plugin;\n';
			expr += '})\n';
			
			// -- Evaluate the function in the window sandbox/scope and execute. The return value is a wrapper for the 'plugin' object.
			var sandbox = Cu.Sandbox(win);
			// -- inspired by firebug <console> object injection
			var getPluginWrapper = Cu.evalInSandbox(expr, sandbox);
			var wrapper = getPluginWrapper(plugin);
			
			sandbox = Cu.Sandbox(win, {wantXRays: false});

			for (var prop in plugin.bridge) {
				if (plugin.bridge.hasOwnProperty(prop)) {
	              	if (typeof plugin.bridge[prop] === "function") {
	              		wrapper.bridge[prop] = unsafeCloneFunctionIntoContentScope(win, sandbox, plugin.bridge[prop]);
	              	}
				}
			}
			
			return wrapper;
		};
		
		function unloadHandler(event) {
			var win = event.target;
			bridge.unregisterBridge(win);
		}
		
		bridge.unregisterBridge = function (win) {
			delete win.wrappedJSObject.FireTVPlugin;
			win.removeEventListener("unload", unloadHandler, false);
			if (FBTrace.DBG_FIRETV_BRIDGE) {
				FBTrace.sysout(bridge.CAT + "[unregisterBridge()] " + win.location);
			}
		};
		
		function Delegate() {
		}
		Delegate.prototype = {
			registerBridge : function (win) {
				win.addEventListener("unload", unloadHandler, false);
				
				var plugin = getPluginInterfaceForWindow(win);
//				win.wrappedJSObject.FireTVPlugin = plugin;
				win.wrappedJSObject.FireTVPlugin = plugin.wrappedJSObject;
				
				if (FBTrace.DBG_FIRETV_BRIDGE) {
					FBTrace.sysout(bridge.CAT + "[registerBridge()] " + win.location);
				}
			},
			observe : function (aSubject, aTopic, aData) {
				if (aTopic === "document-element-inserted") {
					if (!aSubject.location) {
						return;
					}
					var svgMediaplayer = aSubject && aSubject.location && aSubject.location.href === "tv://?mediaplayer=true";
					if (aSubject && aSubject.location && (aSubject.location.href.match(/^http/) || aSubject.location.href.match(/^dvb/) || svgMediaplayer)) {
						if (_this.utils.configuredHost(aSubject.location) || svgMediaplayer) {
							var win = aSubject.defaultView;
							// -- check if tab should be ignored
							var aBrowser = _this.utils.getBrowserFromWindow(win.top);
							var aTab =  _this.TabManager.getTabForBrowser(aBrowser);
							if (aTab.hasAttribute("firetv-ignore")) {
								return;
							}
							// -- now register bridge for each window (frame), not top window only
							this.registerBridge(win);
						}
					}
				}
			},
			QueryInterface : function (aIID) {
				if (aIID.equals(Ci.nsIObserver) || aIID.equals(Ci.nsISupports)) {
					return this;
				}
				throw Cr.NS_NOINTERFACE;
			}
		};

		bridge.init = function (loggingGroupId) {
			if (FBTrace.DBG_FIRETV_BRIDGE) {
				FBTrace.sysout(bridge.CAT + "[init]");
			}
			initBridgeInterface(bridgeInterface);
			bridge.delegate = new Delegate();
			observerService.addObserver(bridge.delegate, "document-element-inserted", false);
			
			if (FBTrace.DBG_FIRETV_BRIDGE) {
				FBTrace.sysout(bridge.CAT + "[done]");
			}
		};

		bridge.shutdown = function () {
			if (FBTrace.DBG_FIRETV_BRIDGE) {
				FBTrace.sysout(bridge.CAT + "[shutdown]");
			}
			observerService.removeObserver(bridge.delegate, "document-element-inserted", false);
			delete bridge.delegate;
			if (FBTrace.DBG_FIRETV_BRIDGE) {
				FBTrace.sysout(bridge.CAT + "[done]");
			}
		};
		this.Bridge = bridge;

	}).apply(getFireTVPluginInstance());

} catch (exc) {
	alert("[ftv-bridge.js] " + exc);
}
