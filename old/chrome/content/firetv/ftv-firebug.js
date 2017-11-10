/* See license.txt for terms of usage */
/*global define:false */
define([ 
	"firebug/firebug", 
	"firebug/lib/trace", 
	"firebug/lib/url", 
	"firebug/lib/dom",
	"firebug/js/stackFrame",
	"firebug/js/sourceLink",
	"firebug/console/commandLine",
	"firebug/js/debugger",
	"firebug/lib/domplate",
	"firebug/chrome/reps"
], 
function (Firebug, FBTrace, Url, Dom, StackFrame, SourceLink, CommandLine, Debugger, Domplate, FirebugReps) {
	var CAT = "[ftv-firebug] ";
	
	FBTrace = {};
	
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	const Cr = Components.results;
	
	var windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
	var enumerator = windowManager.getEnumerator(null);
	var FireTVPlugin;
	while (enumerator.hasMoreElements()) {
		var win = enumerator.getNext();
		if (win.FireTVPlugin) {
			FireTVPlugin = win.FireTVPlugin;
			FBTrace = win.FireTVPlugin.FBTrace;
		}
	}
	if (FBTrace.DBG_FIRETV_FIREBUG) {
		FBTrace.sysout(CAT + "[initialize]");
	}
	var theApp = {
		initialize : function () {
			if (FBTrace.DBG_FIRETV_FIREBUG) {
				FBTrace.sysout(CAT + "[initialize]");
			}
			if (FBTrace.DBG_FIRETV_FIREBUG) {
				FBTrace.sysout(CAT + "[initialize] Override system url detection");
			}
			var origIsSystemURL = Url.isSystemURL;
			Url.isSystemURL = function () {
				var res = origIsSystemURL.apply(null, arguments);
				var url = (arguments.length > 0) ? arguments[0] : false;
				if (!FireTVPlugin.DBG) {
					if (url && url.length > 20) {
						res = res || (url.substr(0, 28) === "data:text/css;charset=firetv");
					}
					if (url && url.length > 6) {
						res = res || (url.substr(0, 6) === "firetv");
					}
				}
				return res;
			};

			var origGetLTRBWH = Dom.getLTRBWH;
			Dom.getLTRBWH = function (elt) {
				var res = origGetLTRBWH.apply(null, arguments);
				var configured = elt.ownerDocument.documentElement.getAttribute("firetv-class") === "firetv";
				if (elt && elt.ownerDocument.defaultView.frameElement === null && 
						elt.ownerDocument.documentElement.tagName !== "svg" && configured ) 
				{
					if (!res.firetvAdjusted) {
						var win = elt.ownerDocument.defaultView;
						if (elt === elt.ownerDocument.body || elt === elt.ownerDocument.documentElement) {
							return {
								top: -1000,
								left: -1000,
								bottom: 0,
								right: 0,
								width: 0,
								height: 0
							};
						}
						
						var scaleX = 1;
						var scaleY = 1;
						var transform = win.getComputedStyle(elt.ownerDocument.body, null).transform.replace(/^matrix\(/, "").replace(/\)$/, "").split(",");
						scaleX = parseFloat(transform[0]);
						scaleY = parseFloat(transform[3]);
					
						
						var deltaTop = win.getComputedStyle(elt.ownerDocument.documentElement, null).paddingTop;
						deltaTop = deltaTop.replace(/px$/, "") >> 0;
						var deltaLeft = win.getComputedStyle(elt.ownerDocument.body, null).left;
						if (deltaLeft !== "auto") {
							deltaLeft = deltaLeft.replace(/px$/, "") >> 0;
						} else {
							deltaLeft = 0;
						}
						if (deltaLeft === 0) {
							deltaLeft = win.getComputedStyle(elt.ownerDocument.documentElement, null).paddingLeft;
							if (deltaLeft !== "auto") {
								deltaLeft = deltaLeft.replace(/px$/, "") >> 0;
							} else {
								deltaLeft = 0;
							}
						}
						if (FBTrace.DBG_FIRETV_FIREBUG) {
							FBTrace.sysout(CAT + "[#" + elt.getAttribute("id") + "] " + res.firetvAdjusted + " top=" + res.top + ", left=" + res.left + ", width=" + res.width + ", height=" + res.height + " (deltaTop=" + deltaTop + ", deltaLeft=" + deltaLeft);
						}
						res.top -= deltaTop;
						res.left -= deltaLeft;
						res.width /= scaleX;
						res.height /= scaleY;
						res.top /= scaleY;
						res.left /= scaleX;
						res.firetvAdjusted = true;
					}
				}
				return res;
			};


			var origShouldCacheRequest = Firebug.TabCacheModel.shouldCacheRequest;
			Firebug.TabCacheModel.shouldCacheRequest = function (request) {
				var res = origShouldCacheRequest.apply(Firebug.TabCacheModel, [ request ]);
				var shouldCache = false;
				try {
					shouldCache = (request.URI.scheme === "firetv") || 
						(request.URI.scheme === "tv") || 
						((request.URI.scheme === "dvb") && !/\.png$/.test(request.URI.spec) && 
								!/\.jpg$/.test(request.URI.spec) && 
								!/\.gif$/.test(request.URI.spec));
				} catch (e) {
				}
				return res || shouldCache;
			};
			
			var origGetFrameSourceLink = StackFrame.getFrameSourceLink;
			StackFrame.getFrameSourceLink = function (frame)
			{
				while (frame && frame.caller) {
					if (/^firetv:\/\//.test(frame.filename) || /stb-core.js$/.test(frame.filename)) {
						frame = frame.caller;
					} else {
						break;
					}
				}
				return origGetFrameSourceLink.apply(StackFrame, [ frame ]);
			};
			
			var origGetCorrectedStackTrace = StackFrame.getCorrectedStackTrace;
			StackFrame.getCorrectedStackTrace = function (frame, context)
			{
				var trace = origGetCorrectedStackTrace.apply(StackFrame, [frame, context]);
				while (trace.frames && 
						trace.frames[0] && 
						(
							/^firetv:\/\//.test(trace.frames[0].href) || 
							/stb-core.js$/.test(trace.frames[0].href) 
						)
					) 
				{
					trace.frames.shift();
				}
				return trace;
			};
			
			
			if (FBTrace.DBG_FIRETV_FIREBUG) {
				FBTrace.sysout(CAT + "[initialize] Trying to hide firetv- specific attributes in firebug.");
			}
			
			var HTMLPanel = Firebug.HTMLPanel;
			try {
				
				var origOnMutateAttr = HTMLPanel.prototype.onMutateAttr;
				HTMLPanel.prototype.onMutateAttr = function (event) {
					if (!FireTVPlugin.DBG && event.attrName && /^firetv-/.test(event.attrName)) {
						return;
					}
					return origOnMutateAttr.apply(this, [event]);
			    }
			} catch(e) {
			}
			
			try {
				var domplates = ["HTMLDocument", "HTMLHtmlElement", "CompleteElement", "SoloElement", "Element", "EmptyElement", "TextElement", "XEmptyElement"];
				var domplate, i;
				for (i = 0; i < domplates.length; i++) {
					domplate = HTMLPanel[domplates[i]];
					if (FBTrace.DBG_FIRETV_FIREBUG) {
						FBTrace.sysout(CAT + "[initialize] searching domplate: " + domplates[i] + " -> " + domplate, domplate);
					}
					if (domplate && domplate.attrIterator) {
						if (FBTrace.DBG_FIRETV_FIREBUG) {
							FBTrace.sysout(CAT + "[initialize] Overriding attrIterator for "+ domplates[i], HTMLPanel[domplates[i]] );
						}
						(function(){
							var origAttrIterator = HTMLPanel[domplates[i]].attrIterator;
							HTMLPanel[domplates[i]].attrIterator = function(elt) {
								var attrs = origAttrIterator.apply(HTMLPanel[domplates[i]], [elt]);
								if (FBTrace.DBG_FIRETV_FIREBUG) {
									FBTrace.sysout(CAT + "[attrIterator] ", attrs);
								}
						        for (var i = attrs.length - 1; i >= 0; i--) {
						        	if (!FireTVPlugin.DBG) {
							        	if (attrs[i].localName.indexOf("firetv-") != -1) {
							        		attrs.splice(i , 1);
							        	}
						        	}
					            }
						        return attrs;
						    };
						})();
						
					}
				}
			} catch(e) {
			}
			

			if (FBTrace.DBG_FIRETV_FIREBUG) {
				FBTrace.sysout(CAT + "[done]");
			}
		}
	};
	return theApp;
});
