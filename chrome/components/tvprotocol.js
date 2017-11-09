/* See license.txt for terms of usage */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("chrome://firetv-comp/content/tv-channel.jsm");

const TV_PROTOCOL_SCHEME = "tv";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const CAT = "[tv://] ";

// ------------- TvProtocolHandler --
function TvProtocolHandler() {
	if (FBTrace.DBG_FIRETV_TVPROTOCOL) {
		FBTrace.sysout(CAT + "[TvProtocolHandler] [constructor]");
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
			value : Components.ID("{8c259d92-dc29-11df-a544-f516e0d72085}"),
			enumerable : true
		},
		QueryInterface : {
			value : XPCOMUtils.generateQI([ Ci.nsIProtocolHandler ]),
			enumerable : true
		},
		scheme : {
			value : TV_PROTOCOL_SCHEME,
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
				var uri = Cc["@mozilla.org/network/simple-uri;1"].createInstance(Ci.nsIURI);
				try {
					uri.spec = (baseURI && baseURI.scheme==TV_PROTOCOL_SCHEME && /^#/.test(spec))?(baseURI.spec + spec): spec;
				} catch (e){
					if (FBTrace.DBG_FIRETV_TVPROTOCOL || FBTrace.DBG_FIRETV_ERROR) {
						FBTrace.sysout(CAT + "[TvProtocolHandler.newURI] ERROR while setting spec: " + spec + " (baseURI="+((baseURI)?baseURI.spec:"null")+")", e);
					}
				}
				return uri;
			},
			enumerable : true
		},
		newChannel : {
			value : function(aUri) {
				if (FBTrace.DBG_FIRETV_TVPROTOCOL) {
					FBTrace.sysout(CAT + "[TvProtocolHandler.newChannel] aUri=" + aUri.spec + ", aReferrer=" +((this._referrer)?this._referrer.spec:"null"));
				}
				var channel = new TvChannel(aUri, this._referrer, false);
				return channel;
			},
			enumerable : true
		}
	});
})(TvProtocolHandler.prototype);

var components = [ TvProtocolHandler ];

const NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
