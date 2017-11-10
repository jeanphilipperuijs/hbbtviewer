/* See license.txt for terms of usage */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("chrome://firetv-comp/content/http-channel.jsm");

var EXPORTED_SYMBOLS = [ "FireTvChannel", "scope", "FBTrace" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const CAT = "[firetv://] ";

const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

const FireTvContentTypes = {
	js : "text/javascript",
	html : "text/html",
	css : "text/css",
	xml : "text/xml",
	text : "text/plain",
	img : "image/png"
};

var FireTvDelegate = {
	bootstrap : function(args) {
		var profileName = args.profile;
		var bootstrap = scope.FireTVPlugin.ProfileManager.getProfileBootstrap(profileName);
		
		var is = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);
		is.data = bootstrap;
		return {inputStream: is, length:bootstrap.length};
	},
	tv : function(args) {
		var file = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
		file.append(scope.FireTVPlugin.utils.PLUGIN_ID);
		file.append("tv");

		var uri = ioService.newFileURI(file);
		var channel = ioService.newChannelFromURI(uri);

		var channelInputStream = channel.open();
		return {inputStream: channelInputStream, length:file.fileSize};
	},
	channels : function(args) {
		var file = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
		file.append(scope.FireTVPlugin.utils.PLUGIN_ID);
		file.append("channels");

		var uri = ioService.newFileURI(file);
		var channel = ioService.newChannelFromURI(uri);

		var channelInputStream = channel.open();
		return {inputStream: channelInputStream, length:file.fileSize};
	}
};

// ------------- FireTvChannel --
function FireTvChannel(aUri, aReferrer, notifyObservers) {
	if (FBTrace.DBG_FIRETV_FIRETVCHANNEL) {
		FBTrace.sysout(CAT + "[FireTvChannel] [constructor]");
	}
	HttpChannel.apply(this, arguments);
}

FireTvChannel.prototype = new HttpChannel();

(function(proto) {
	// Override HttpChannel.openContentStream
	Object.defineProperties(proto, {
		openContentStream : {
			value : function openContentStream() {
				if (FBTrace.DBG_FIRETV_FIRETVCHANNEL) {
					FBTrace.sysout(CAT + "[FireTvChannel.openContentStream]");
				}
				this.contentCharset = "utf-8";
				this.contentType = FireTvContentTypes[this.URI.host];
				
				var params = {
					"_contentType" : this.contentType
				};
				var path = this.URI.path.substring(1);
				var method, queryString, keyValues, keyValue, index, i, value;
				index = path.indexOf("?");
				if (index > -1) {
					queryString = path.substring(index + 1);
					method = path.substring(0, index);
					keyValues = queryString.split("&");
					for (i = 0; i < keyValues.length; i++) {
						keyValue = keyValues[i].split("=");
						value = keyValue[1];
						if (value) {
							value = scope.decodeURIComponent(value);
						}
						params[keyValue[0]] = value;
					}
				} else {
					method = path;
				}

				var delegate = FireTvDelegate[method];
				var delegateArgs = params;
				var res = delegate(delegateArgs);
				this.contentLength = res.length;
				
				HttpChannel.prototype.openContentStream.apply(this, arguments);
				return res.inputStream;
			},
			enumerable : false
		}
	});
})(FireTvChannel.prototype);