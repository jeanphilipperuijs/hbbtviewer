/* See license.txt for terms of usage */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const CAT = "[hbbtv-stream-converter] ";

const windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);

var FBTrace = {};
var scope = (function() {
	var enumerator = windowManager.getEnumerator(null);
	var res = null;
	while (enumerator.hasMoreElements()) {
		var win = enumerator.getNext();
		if (win.FireTVPlugin) {
			res = win;
			FBTrace = win.FireTVPlugin.FBTrace;
		}
	}
	return res;
})();

function HbbTVStreamConverter() {
	
}

HbbTVStreamConverter.prototype = {
	classID : Components.ID("{fe63ff00-c285-11e0-962b-0800200c9a66}"),

	QueryInterface : XPCOMUtils.generateQI([ Ci.nsIStreamConverter ]),

	// --
	// -- nsIStreamConverter implementation
	// --
	asyncConvertData : function(aFromType, aToType, aListener, aCtxt) {
		this.originalListener = aListener;
		var channel = aCtxt.QueryInterface(Ci.nsIChannel);
		
		var host = channel.URI.scheme + "://" + channel.URI.hostPort;
		var added = scope.FireTVPlugin.PreferenceManager.addConfiguredHost(host);
		if (added) {
				if (FBTrace.DBG_FIRETV_STREAMCONVERTER) {
					FBTrace.sysout(CAT + "[HbbTVStreamConverter.asyncConvertData] Added FireTV hbbtv support for " + host + " (type=" + aFromType + ")");
				}
				scope.FireTVPlugin.PreferenceManager.setHostRelatedPref(host, "profile", "hbbtv");
			scope.FireTVPlugin.PreferenceManager.setHostRelatedPref(host, "profile", "hbbtv");
			scope.FireTVPlugin.UI.reload();
			var originatingWindow = scope.FireTVPlugin.utils.getOriginatingWindowFromChannel(channel);
			// -- abort request 
			this.originalListener.onStopRequest(channel, aCtxt, 204);
			// reload so that now http monitor will take request into account
			originatingWindow.location.href = channel.URI.spec;
		}
	},

	// returns nsIInputStream
	convert : function(aFromStream, aFromType, aToType, aCtxt) {
		if (FBTrace.DBG_FIRETV_STREAMCONVERTER) {
			FBTrace.sysout(CAT + "[HbbTVStreamConverter.convert]", {
				aFromType : aFromType,
				aToType : aToType,
				aCtxt : aCtxt
			});
		}
		return aFromStream;
	},

	// --
	// -- nsIStreamListener implementation
	// --
	onDataAvailable : function(aRequest, aContext, aInputStream, aOffset, aCount) {
		// -- forward to original listener
		this.originalListener.onDataAvailable(aRequest, aContext, aInputStream, aOffset, aCount);
	},

	// --
	// -- nsIRequestObserver implementation
	// --
	onStartRequest : function(aRequest, aContext) {
		// -- setting channel content type to text/html so that it is understood by the browser
		var channel = aRequest.QueryInterface(Ci.nsIChannel);
		
		if (scope.FireTVPlugin.PreferenceManager.isHbbtvStrict()) {
			channel.contentType = "application/xhtml+xml";
		} else {
			channel.contentType = "text/html";
		}
		
		// -- forward to original listener
		this.originalListener.onStartRequest(aRequest, aContext);
	},
	onStopRequest : function(aRequest, aContext, aStatusCode) {
		// -- forward to original listener
		this.originalListener.onStopRequest(aRequest, aContext, aStatusCode);
	}
};

var components = [ HbbTVStreamConverter ];

const NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
