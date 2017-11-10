/* See license.txt for terms of usage */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("chrome://firetv-comp/content/firetv-channel.jsm");

const FIRETV_PROTOCOL_SCHEME = "firetv";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const CAT = "[firetv://] ";

// ------------- FireTvProtocolHandler --
function FireTvProtocolHandler() {
	if (FBTrace.DBG_FIRETV_PROTOCOL) {
		FBTrace.sysout(CAT + "[FireTvProtocolHandler] [constructor]");
	}
}

(function(proto) {
	// Ci.nsIProtocolHandler
	Object.defineProperties(proto, {
		// -- private
		_referrer : {
			value : null,
			writable : true
		},

		// -- public
		classID : {
			value : Components.ID("{b1365311-3f16-442d-a060-cb33d9d93abf}"),
			enumerable : true
		},
		QueryInterface : {
			value : XPCOMUtils.generateQI([ Ci.nsIProtocolHandler ]),
			enumerable : true
		},
		scheme : {
			value : FIRETV_PROTOCOL_SCHEME,
			enumerable : true
		},
		defaultPort : {
			value : -1,
			enumerable : true
		},
		protocolFlags : {
			value : Ci.nsIProtocolHandler.URI_NOAUTH | Ci.nsIProtocolHandler.URI_INHERITS_SECURITY_CONTEXT
					| Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE | Ci.nsIProtocolHandler.URI_NON_PERSISTABLE
					| Ci.nsIProtocolHandler.URI_IS_LOCAL_RESOURCE,
			enumerable : true

		},
		newURI : {
			value : function(spec, charset, baseURI) {
				this._referrer = baseURI;
				var uri = Cc["@mozilla.org/network/standard-url;1"].createInstance(Ci.nsIURL);
				uri.spec = spec;
				return uri;
			},
			enumerable : true
		},
		newChannel : {
			value : function(aUri) {
				if (FBTrace.DBG_FIRETV_PROTOCOL) {
					FBTrace.sysout(CAT + "[FireTvProtocolHandler.newChannel] aUri: " + aUri.spec);
				}
				var channel = new FireTvChannel(aUri, this._referrer, false);
				return channel;
			},
			enumerable : true
		}
	});
})(FireTvProtocolHandler.prototype);

var components = [ FireTvProtocolHandler ];

const NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
