/* See license.txt for terms of usage */
/*global window:false, alert, getFireTVPluginInstance, Components */
try {
	(function () {
		if (this.utils) {
			return;
		}
		
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cr = Components.results;
		
		const windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
		
		var _this = this;
		
		var FBTrace = this.FBTrace;
		
		var utils = {};

		utils.CAT = "[ftv.utils] ";

		utils.PLUGIN_ID = "dlfr-firetv-plugin@atosorigin.com";

		utils.getRequestDetails = function (request) {
			var details = {};
			details.fullurl = request.URI.spec;
			var indexOfQuestionMark = details.fullurl.indexOf("?");
			details.url = (indexOfQuestionMark > -1) ? details.fullurl.substring(0, indexOfQuestionMark)
					: details.fullurl;
			details.query = (indexOfQuestionMark > -1) ? details.fullurl.substring(indexOfQuestionMark + 1) : "";
			var lastIndexOfDot = details.url.lastIndexOf(".");
			var lastIndexOfSlash = details.url.lastIndexOf("/");
			var lastPart = details.url.substring(lastIndexOfSlash + 1);
			details.ext = (lastPart.indexOf(".") < 0) ? "/" : details.url.substring(lastIndexOfDot);
			details.path = details.url.substring(request.URI.prePath.length);
			details.server = request.URI.prePath;
			return details;
		};

		utils.managedProtocol = function (request) {
			var scheme, hostPort;
//			if (request instanceof Location) {
			if (request.href) {
				scheme = request.protocol.substring(0, request.protocol.length - 1);
			} else if (request.URI) {
				scheme = request.URI.scheme;
			} else if (request.scheme) {
				scheme = request.scheme;
			} else {
				scheme = request.protocol.substring(0, request.protocol.length - 1);
			}

			if (scheme !== "http" && scheme !== "https" && scheme !== "file" && scheme !== "dvb") {
				return false;
			}
			return true;
		};
		
		utils.getScheme = function (request) {
			var scheme;
			if (request.href) {
				scheme = request.protocol.substring(0, request.protocol.length - 1);
			} else if (request.URI) {
				scheme = request.URI.scheme;
			} else if (request.scheme) {
				scheme = request.scheme;
			} else {
				scheme = request.protocol.substring(0, request.protocol.length - 1);
			}
			return scheme;
		};

		utils.configuredHost = function (request) {
			var scheme, hostPort, href;
//			if (request instanceof Location) {
			if (request.href) {
				scheme = request.protocol.substring(0, request.protocol.length - 1);
				href = request.href;
			} else if (request.URI) {
				scheme = request.URI.scheme;
				href = request.URI.spec;
			} else if (request.scheme) {
				scheme = request.scheme;
				href = request.spec;
			} else if (typeof request === "string") {
				var regexp = new RegExp("(.*):\/\/([^/]+)");
				var re  = regexp.exec(request);
				scheme = re[1];
				href = re[2];
			} else {
				scheme = request.protocol.substring(0, request.protocol.length - 1);
				href = request.href;
			}

			if (scheme === "dvb") {
				return true;
			} 
			
			if (scheme !== "http" && scheme !== "https") {
				return false;
			}
			
			if ((/favicon\.ico$/.test(href))) {
				return false;
			}

//			if (request instanceof Location) {
			if (request.href) {
				hostPort = request.host;
			} else if (request.hostPort) {
				hostPort = request.hostPort;
			} else if (request.URI) {
				hostPort = request.URI.hostPort;
			} else if (typeof request === "string") {
				hostPort = href;
			} else {
				hostPort = request.host;
			}

			return _this.PreferenceManager.isConfiguredHost(scheme + "://" + hostPort);
		};

		utils.getOriginatingWindowFromChannel = function (aChannel) {
			var loadContext = null;
			if (aChannel && aChannel.notificationCallbacks) {
				try {
					loadContext = aChannel.notificationCallbacks.getInterface(Ci.nsILoadContext);
				} catch (e1) {
				}
			}
			if (!loadContext) {
				if (aChannel && aChannel.loadGroup && aChannel.loadGroup.notificationCallbacks) {
					try {
						loadContext = aChannel.loadGroup.notificationCallbacks.getInterface(Ci.nsILoadContext);
					} catch (e2) {
					}
				}
			}
			if (loadContext) {
				return loadContext.associatedWindow;
			}
			return null;
		};
		
		utils.getBrowserFromChannel = function (aChannel) {
			var loadContext = null;
			if (aChannel && aChannel.notificationCallbacks) {
				try {
					loadContext = aChannel.notificationCallbacks.getInterface(Ci.nsILoadContext);
				} catch (e1) {
				}
			}
			if (!loadContext) {
				if (aChannel && aChannel.loadGroup && aChannel.loadGroup.notificationCallbacks) {
					try {
						loadContext = aChannel.loadGroup.notificationCallbacks.getInterface(Ci.nsILoadContext);
					} catch (e2) {
					}
				}
			}
			
			try {
				return utils.getBrowserFromWindow(loadContext.topWindow);
			} catch (e3) {
			}
			return null;
		};
		
		
		
		utils.getBrowserFromWindow = function (aDOMWindow) {
			var enumerator = windowManager.getEnumerator(null);
			var tabbedBrowser, win, aBrowser;
			while (enumerator.hasMoreElements()) {
				win = enumerator.getNext();
				tabbedBrowser = win.document.getElementById("content");
				if (tabbedBrowser && tabbedBrowser.getBrowserForDocument) {
					aBrowser = tabbedBrowser.getBrowserForDocument(aDOMWindow.top.document);
					if (aBrowser !== null) {
						return aBrowser;
					}
				}
			}
			return null;
		};

		utils.isArray = function (obj) {
			if (obj.constructor.toString().indexOf("Array") === -1) {
				return false;
			} else {
				return true;
			}
		};

		utils.format = function (s) {
			return s;
		};

		utils.regexp = {
			RGB : /^rgb\(/,
			RGBA : /^rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(,\s*(\d?\.\d*))?\)$/,
			RGBA_SIMPLE : /^rgba\(/,
			PERCENT : /\%$/,
			STYLE_TAG_CONTENT : /<style[^>]*>([^<]*)<\/style>/igm,
			STYLE_INLINE_CONTENT : /<[a-z]+\s+[^>]*(style\s*=\s*("[^<>"]*"|'[^<>']*'|\w+))/igm,
			CSS_VALUE_IMPORTANT : /\s*([^!]*)(\s*\!\s*important)?/,
			IMPORTANT : /!\s*important$/,
			BLANK : /\s+/,
			DOCTYPE : /<!DOCTYPE[^>]*>/im,
			DOCTYPE_FULLSCREEN : /(<!DOCTYPE.*)(['"]fullscreen["'])(.*>)/im,
			DOCTYPE_FULLSCREEN_2 : /(<!DOCTYPE.*)(fullscreen)(.*>)/im,
			HTML : /(<html)([^>]*>)/im,
			BOX : /(<box)(.*)(\/>)/im,
			HEAD : /(<head[^>]*>)/im
		};

		utils.parseRGBA = function (color) {
			if (color === "transparent") {
				return [ 255, 255, 255, 0 ];
			}
			var bits = utils.regexp.RGBA.exec(color);
			if (bits) {
				var rgba = [ bits[1] >> 0, bits[2] >> 0, bits[3] >> 0, (bits[5]) ? parseFloat(bits[5]) : 1 ];
				return rgba;
			} else {
				return color;
			}
		};

		utils.extend = function (a, b) {
			for (var i in b) {
				var g = b.__lookupGetter__(i), s = b.__lookupSetter__(i);

				if (g || s) {
					if (g) {
						a.__defineGetter__(i, g);
					}
					if (s) {
						a.__defineSetter__(i, s);
					}
				} else {
					a[i] = b[i];
				}
			}
			return a;
		};
		
		utils.logError = function (msg, url, lineNo, sourceLine, win) {
			win.console.error("%s\n%s\nat %s\nline: %d", msg, sourceLine, url,lineNo);
		}
		
		var toCamelCase = function (s) {
			return s.toString().replace(/([A-Z]+)/g, function (m, l) {
				return l.substr(0, 1).toUpperCase() + l.toLowerCase().substr(1, l.length);
			}).replace(/[\-_\s](.)/g, function (m, l) {
				return l.toUpperCase();
			});
		};
		

		utils.CCIN = function (cName, ifaceName) {
			return Cc[cName].createInstance(Ci[ifaceName]);
		};

		this.utils = utils;
	}).apply(getFireTVPluginInstance());

} catch (exc) {
	alert("[ftv-utils.js] " + exc);
}
