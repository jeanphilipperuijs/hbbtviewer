/* See license.txt for terms of usage */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("chrome://firetv-comp/content/dvb-channel.jsm");

const DVB_PROTOCOL_SCHEME = "dvb";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const CAT = "[dvb://] ";

const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

// ------------- DVBProtocolHandler --
function DVBProtocolHandler() {
	if (FBTrace.DBG_FIRETV_DVBPROTOCOL) {
		FBTrace.sysout(CAT + "[DVBProtocolHandler] [constructor]");
	}
}

(function(proto) {

	// Ci.nsIProtocolHandler
	Object.defineProperties(proto, {
		// -- public
		classID : {
			value : Components.ID("{d8eb9460-edc6-11e0-be50-0800200c9a66}"),
			enumerable : true
		},
		QueryInterface : {
			value : XPCOMUtils.generateQI([ Ci.nsIProtocolHandler ]),
			enumerable : true
		},
		scheme : {
			value : DVB_PROTOCOL_SCHEME,
			enumerable : true
		},
		defaultPort : {
			value : -1,
			enumerable : true
		},
		protocolFlags : {
			value : Ci.nsIProtocolHandler.URI_STD | Ci.nsIProtocolHandler.URI_INHERITS_SECURITY_CONTEXT
					| Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE | Ci.nsIProtocolHandler.URI_NON_PERSISTABLE
					| Ci.nsIProtocolHandler.URI_IS_LOCAL_RESOURCE,
			enumerable : true

		},
		newURI : {
			value : function(spec, charset, baseURI) {
				this._referrer = baseURI;
				var uri;
				uri = Cc["@mozilla.org/network/standard-url;1"].createInstance(Ci.nsIStandardURL);
				uri.init(Ci.nsIStandardURL.URLTYPE_AUTHORITY, this.defaultPort, spec, charset, baseURI);
				uri.mutable = true;
				return uri;
			},
			enumerable : true
		},
		newChannel : {
			value : function(aUri) {
				var channel = new DVBChannel(aUri, this._referrer, true);
				return channel;
			},
			enumerable : true
		}
	});
})(DVBProtocolHandler.prototype);

var components = [ DVBProtocolHandler ];

const NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
