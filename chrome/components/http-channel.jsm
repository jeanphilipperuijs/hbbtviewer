/* See license.txt for terms of usage */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("chrome://firetv-comp/content/base-channel.jsm");

var EXPORTED_SYMBOLS = [ "BaseChannel", "HttpChannel", "scope", "FBTrace" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const CAT = "[http://] ";

const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
const observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
const activityDistributor = Cc["@mozilla.org/network/http-activity-distributor;1"].getService(Ci.nsIHttpActivityDistributor);
const PrefService = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
var configuredRedirectionLimit = PrefService.getIntPref("network.http.redirection-limit");

const NS_HTTP_ACTIVITY_TYPE_SOCKET_TRANSPORT = Ci.nsIHttpActivityObserver.ACTIVITY_TYPE_SOCKET_TRANSPORT;
const NS_HTTP_ACTIVITY_TYPE_HTTP_TRANSACTION = Ci.nsIHttpActivityObserver.ACTIVITY_TYPE_HTTP_TRANSACTION;
const NS_HTTP_ACTIVITY_SUBTYPE_REQUEST_HEADER = Ci.nsIHttpActivityObserver.ACTIVITY_SUBTYPE_REQUEST_HEADER;
const NS_HTTP_ACTIVITY_SUBTYPE_REQUEST_BODY_SENT = Ci.nsIHttpActivityObserver.ACTIVITY_SUBTYPE_REQUEST_BODY_SENT;
const NS_HTTP_ACTIVITY_SUBTYPE_RESPONSE_START = Ci.nsIHttpActivityObserver.ACTIVITY_SUBTYPE_RESPONSE_START;
const NS_HTTP_ACTIVITY_SUBTYPE_RESPONSE_HEADER = Ci.nsIHttpActivityObserver.ACTIVITY_SUBTYPE_RESPONSE_HEADER;
const NS_HTTP_ACTIVITY_SUBTYPE_RESPONSE_COMPLETE = Ci.nsIHttpActivityObserver.ACTIVITY_SUBTYPE_RESPONSE_COMPLETE;
const NS_HTTP_ACTIVITY_SUBTYPE_TRANSACTION_CLOSE = Ci.nsIHttpActivityObserver.ACTIVITY_SUBTYPE_TRANSACTION_CLOSE;

// ------------- HttpChannel --
function HttpChannel(aUri, aReferrer, notifyObservers) {
	BaseChannel.apply(this, arguments);
	if (FBTrace.DBG_FIRETV_HTTPCHANNEL) {
		FBTrace.sysout(CAT + "[HttpChannel][constructor][" + this._id + "]");
	}
	this.referrer = aReferrer;
	this._notifyObservers = notifyObservers;
	this.documentURI = aReferrer;
}

HttpChannel.prototype = new BaseChannel();

// Override BaseChannel
(function(proto) {

	var qi =  XPCOMUtils.generateQI([ 
        Ci.nsISupports,
        Ci.nsISupportsWeakReference,
        Ci.nsIRequest, 
        Ci.nsIChannel, 
        Ci.nsIRequestObserver, 
		Ci.nsIStreamListener,
        Ci.nsITransportEventSink,
		Ci.nsIAsyncVerifyRedirectCallback, 
		
		Ci.nsIMultiPartChannel,
		
		Ci.nsIHttpChannel,
		Ci.nsIUploadChannel2, 
		Ci.nsITraceableChannel, 
		Ci.nsIHttpChannelInternal]
	);
	
	// Overrides QueryInterface() to add support for : 
	// -- Ci.nsIHttpChannel, Ci.nsIUploadChannel2, Ci.nsIHttpChannelInternal, Ci.nsITraceableChannel
	// - Support of Ci.nsIHttpChannelInternal should not be necessary but it is
	//   because of :	// https://bugzilla.mozilla.org/show_bug.cgi?id=501952
	// - Support of Ci.nsITraceableChannel may help firebug caching operations
	Object.defineProperties(proto, {
		QueryInterface : {
			value : function QueryInterface() {
				var iid = arguments[0];
//				if (FBTrace.DBG_FIRETV_HTTPCHANNEL) {
//					for (var i in Components.interfaces) {
//						try {
//							if(Components.interfaces[i].equals(iid)){
//								FBTrace.sysout(CAT + "[HttpChannel.QueryInterface][" + this._id + "] name=" + i);
//							}
//						} catch (e) {
//						}
//					}
//				}
				return qi.apply(this, [iid])
			},
			writable : false,
			enumerable : true
		},
		openContentStream : {
			value : function() {
				if (this._notifyObservers === true && this.requestMethod.toLowerCase() == "get" ){
					observerService.notifyObservers(this, "http-on-examine-response", null);
				}
				activityDistributor.observeActivity(
			            this,
			            NS_HTTP_ACTIVITY_TYPE_HTTP_TRANSACTION,
			            NS_HTTP_ACTIVITY_SUBTYPE_RESPONSE_HEADER,
			            new Date().getTime(), 0,
			            this._rawHeaders(this._responseHeaders));
			},
			enumerable : true
		},
		asyncOpen : {
			value : function(aStreamListener, aContext) {
				if (FBTrace.DBG_FIRETV_HTTPCHANNEL) {
					FBTrace.sysout(CAT + "[HttpChannel.asyncOpen][" + this._id + "][" + this.URI.spec + "] method=" + this.requestMethod, this);
				}
				
				if (this._notifyObservers === true && this.requestMethod.toLowerCase() == "get"){
					observerService.notifyObservers(this, "http-on-modify-request", null);
				}
				
				activityDistributor.observeActivity(
			            this,
			            NS_HTTP_ACTIVITY_TYPE_HTTP_TRANSACTION,
			            NS_HTTP_ACTIVITY_SUBTYPE_REQUEST_HEADER,
			            new Date().getTime(), 0,
			            this._rawHeaders(this._requestHeaders));
				
				BaseChannel.prototype.asyncOpen.apply(this, [aStreamListener, aContext]);

			},
			enumerable : true
		}
	});
})(HttpChannel.prototype);


// -- Implements Ci.nsIHttpChannel
// -- allow to manage headers so that XMLHttpRequest are not canceled because
// cross-protocol
(function(proto) {

	// -- private
	Object.defineProperties(proto, {
		_notifyObservers : {
			value : false,
			writable : true,
			enumerable : false
		},
		_requestHeaders : {
			value : {},
			writable : true,
			enumerable : false
		},
		_responseHeaders : {
			value : {
				"date" : function(){return new Date().toString();},
				"server" : "HTTP/FireTV",
				"content-type" : function(){return this.contentType;},
				"content-length" : function(){return this.contentLength;},
				"access-control-allow-origin" : "*",
				"access-control-allow-methods" : "GET",
				"access-control-allow-headers" : "Content-Type,X-Requested-With,Expires,Pragma,Cache-Control"
			},
			writable : true,
			enumerable : false
		},
		_rawHeaders : {
			value : function _rawHeaders(headers){
				var res = "";
				var header;
				for (header in headers){
					if (headers.hasOwnProperty(header)){
						header = header.split("-").map(function(x){return x.charAt(0).toUpperCase() + x.substring(1);}).join("-");
						res += header + ": " + this.getResponseHeader(header) + "\n";
					}
				}
				res += "\r\n";
				return res;
			},
			writable: true,
			enumerable: false
		}
		
	});

	Object.defineProperties(proto, {
		allowPipelining : {
			value : false,
			writable : false,
			enumerable : true
		},
		redirectionLimit : {
			value : configuredRedirectionLimit,
			writable : false,
			enumerable : true
		},
		referrer : {
			value : null,
			writable : false,
			enumerable : true
		},
		requestMethod : {
			value : "GET",
			writable : true,
			enumerable : true
		},
		requestSucceeded : {
			value : true,
			writable : true,
			enumerable : true
		},
		responseStatus : {
			value : 200,
			writable : true,
			enumerable : true
		},
		responseStatusText : {
			value : "OK",
			writable : true,
			enumerable : true
		},
		getRequestHeader : {
			value : function getRequestHeader(aHeader) {
				aHeader = aHeader.toLowerCase();
				var res = this._requestHeaders[aHeader];
				if (!res){
					res = "";
				}
				return res;
			},
			writable : false,
			enumerable : true
		},
		getResponseHeader : {
			value : function getResponseHeader(aHeader) {
				aHeader = aHeader.toLowerCase();
				var res = this._responseHeaders[aHeader];
				if (!res){
					res = "";
				} else if(typeof res == "function"){
					res = res.apply(this,[]);
				}
				return res;
			},
			writable : false,
			enumerable : true
		},
		isNoCacheResponse : {
			value : function isNoCacheResponse() {
				return true;
			},
			writable : false,
			enumerable : true
		},
		isNoStoreResponse : {
			value : function isNoStoreResponse() {
				return true;
			},
			writable : false,
			enumerable : true
		},
		setRequestHeader : {
			value : function setRequestHeader(aHeader, aValue, aMerge) {
				aHeader = aHeader.toLowerCase();
				if (aMerge == true){
					var curValues = this._requestHeaders[aHeader].split(",").map(function(x) { return x.trim(); });
					if (curValues.indexOf(aValue) == -1){
						curValues.push(aValue);
						aValue = curValues.join(", ");
					}
				}
				this._requestHeaders[aHeader] = aValue;
			},
			writable : false,
			enumerable : true
		},
		setResponseHeader : {
			value : function setResponseHeader(aHeader, aValue, aMerge) {
				aHeader = aHeader.toLowerCase();
				if (aMerge == true){
					var curValues = this._responseHeaders[aHeader].split(",").map(function(x) { return x.trim(); });
					if (curValues.indexOf(aValue) == -1){
						curValues.push(aValue);
						aValue = curValues.join(", ");
					}
				}
				this._responseHeaders[aHeader] = aValue;
			},
			writable : false,
			enumerable : true
		},
		visitRequestHeaders : {
			value : function visitRequestHeaders(aVisitor) {
				var header;
				for (header in this._requestHeaders){
					if (this._requestHeaders.hasOwnProperty(header)){
						header = header.split("-").map(function(x){return x.charAt(0).toUpperCase() + x.substring(1);}).join("-");
						try {
							aVisitor.visitHeader(header, this.getRequestHeader(header));
						} catch (e){
							// must stop visit
							break;
						}
					}
				}

			},
			writable : false,
			enumerable : true
		},
		visitResponseHeaders : {
			value : function visitResponseHeaders(aVisitor) {
				var header;
				for (header in this._responseHeaders){
					if (this._responseHeaders.hasOwnProperty(header)){
						header = header.split("-").map(function(x){return x.charAt(0).toUpperCase() + x.substring(1);}).join("-");
						if (/^Access/.test(header) && !this._requestHeaders.hasOwnProperty("origin")){
							continue;
						}
						try {
							aVisitor.visitHeader(header, this.getResponseHeader(header));
						} catch (e){
							// must stop visit
							break;
						}
					}
				}
			},
			writable : false,
			enumerable : true
		}
	});

})(HttpChannel.prototype);


//-- Implements Ci.nsiTraceableChannel
//-- helps firebug caching mechanism 
(function(proto) {
	
	function StreamListenerWrapper(aStreamListener, aRequest, ctx) {
		if (FBTrace.DBG_FIRETV_HTTPCHANNEL) {
			FBTrace.sysout(CAT + "[StreamListenerWrapper.constructor] arguments: ", {args: arguments, ctx:ctx});
		}
		this._streamListener = aStreamListener;
		this._request = aRequest;
		this._ctx = ctx;
	}
	
	// -- private fields
	Object.defineProperties(StreamListenerWrapper.prototype, {
		"_streamListener" : {
			value : null,
			writable: true,
			enumerable : false
		},
		"_request" : {
			value : null,
			writable: true,
			enumerable : false
		},
		"_ctx" : {
			value : null,
			writable: true,
			enumerable : false
		},
		// -- nsIRequestObserver
		onStartRequest : {
			value : function onStartRequest(aRequest, aContext) {
				if (FBTrace.DBG_FIRETV_HTTPCHANNEL) {
					FBTrace.sysout(CAT + "[StreamListenerWrapper.onStartRequest] arguments: ", {args: arguments, "this": this});
				}
				this._streamListener.onStartRequest.apply(this._ctx, [aRequest, aContext]);
			},
			writable: true,
			enumerable : true
		},
		onStopRequest : {
			value : function onStopRequest(aRequest, aContext, aStatusCode) {
				if (FBTrace.DBG_FIRETV_HTTPCHANNEL) {
					FBTrace.sysout(CAT + "[StreamListenerWrapper.onStopRequest] arguments: ", {args: arguments});
				}
				this._streamListener.onStopRequest.apply(this._ctx, [aRequest, aContext, aStatusCode]);
			},
			writable: true,
			enumerable : true
		},
		// -- nsIStreamListener
		onDataAvailable : {
			value : function onDataAvailable(aRequest, aContext, aInputStream, aOffset, aCount) {
				if (FBTrace.DBG_FIRETV_HTTPCHANNEL) {
					FBTrace.sysout(CAT + "[StreamListenerWrapper.onDataAvailable] arguments: ", {args: arguments});
				}
				this._streamListener.onDataAvailable.apply(this._ctx, [aRequest, aContext, aInputStream, aOffset, aCount]);
			},
			writable: true,
			enumerable : true
		},
		// Ci.nsISupports
		QueryInterface : {
			value : XPCOMUtils.generateQI([ Ci.nsISupports, Ci.nsIRequestObserver, Ci.nsIStreamListener ]),
			enumerable : true
		}
	});
	
	Object.defineProperties(proto,
			{
			_responseStarted : {
				value : false,
				writable : true,
				enumerable : false
			},
			_delegatedStreamListener : {
				value : null,
				writable : true,
				enumerable : false
			},
			onStartRequest : {
				value : function(aRequest, aContext) {
					if (this._delegatedStreamListener){
						if (FBTrace.DBG_FIRETV_HTTPCHANNEL) {
							FBTrace.sysout(CAT + "[HttpChannel.onStartRequest][" + this._id + "][" + this.URI.spec + "] (nsITraceableChannel)");
						}
						this._delegatedStreamListener.onStartRequest.apply(this._delegatedStreamListener, [this, aContext]);
					} else {
						BaseChannel.prototype.onStartRequest.apply(this, [this, aContext]);
					}
				},
				enumerable : true
			},
			onStopRequest : {
				value : function(aRequest, aContext, aStatusCode) {
					activityDistributor.observeActivity(
				            this,
				            NS_HTTP_ACTIVITY_TYPE_HTTP_TRANSACTION,
				            NS_HTTP_ACTIVITY_SUBTYPE_RESPONSE_COMPLETE,
				            new Date().getTime(), this.contentLength,
				            "");
//					activityDistributor.observeActivity(
//				            this,
//				            NS_HTTP_ACTIVITY_TYPE_HTTP_TRANSACTION,
//				            NS_HTTP_ACTIVITY_SUBTYPE_TRANSACTION_CLOSE,
//				            new Date().getTime(), 0,
//				            "");
					if (this._delegatedStreamListener){
						if (FBTrace.DBG_FIRETV_HTTPCHANNEL) {
							FBTrace.sysout(CAT + "[HttpChannel.onStopRequest][" + this._id + "][" + this.URI.spec + "] (nsITraceableChannel)");
						}
						this._delegatedStreamListener.onStopRequest.apply(this._delegatedStreamListener, [this, aContext, aStatusCode]);
					} else {
						BaseChannel.prototype.onStopRequest.apply(this, [aRequest, aContext, aStatusCode]);
					}
				},
				enumerable : true
			},
			onDataAvailable : {
				value : function(aRequest, aContext, aInputStream, aOffset, aCount) {
					if (!this._responseStarted){
						if (FBTrace.DBG_FIRETV_HTTPCHANNEL) {
							FBTrace.sysout(CAT + "[HttpChannel.onDataAvailable][" + this._id + "][" + this.URI.spec + "] (nsITraceableChannel) NS_HTTP_ACTIVITY_SUBTYPE_RESPONSE_START");
						}
						activityDistributor.observeActivity(
					            this,
					            NS_HTTP_ACTIVITY_TYPE_HTTP_TRANSACTION,
					            NS_HTTP_ACTIVITY_SUBTYPE_RESPONSE_START,
					            new Date().getTime(), 0,
					            "");
						this._responseStarted = true;
					}
					if (this._delegatedStreamListener){
						if (FBTrace.DBG_FIRETV_HTTPCHANNEL) {
							FBTrace.sysout(CAT + "[HttpChannel.onDataAvailable][" + this._id + "][" + this.URI.spec + "] (nsITraceableChannel)");
						}
						this._delegatedStreamListener.onDataAvailable.apply(this._delegatedStreamListener, [this, aContext, aInputStream, aOffset, aCount]);
					} else {
						BaseChannel.prototype.onDataAvailable.apply(this, [aRequest, aContext, aInputStream, aOffset, aCount]);
					}
				},
				enumerable : true
			},
			setNewListener : {
					value : function setNewListener(aListener) {
						if(this._delegatedStreamListener == null){
							this._delegatedStreamListener = aListener;
							var originalStreamListener = new StreamListenerWrapper(BaseChannel.prototype, this, this);
							if (FBTrace.DBG_FIRETV_HTTPCHANNEL) {
								FBTrace.sysout(CAT + "[HttpChannel.setNewListener][" + this._id + "](first time)[" + this.URI.spec + "] originalStreamListener: ", originalStreamListener);
							}
							return originalStreamListener;
						} else {
							var originalStreamListener = new StreamListenerWrapper(this._delegatedStreamListener, this, this._delegatedStreamListener);
							if (FBTrace.DBG_FIRETV_HTTPCHANNEL) {
								FBTrace.sysout(CAT + "[HttpChannel.setNewListener][" + this._id + "](next time)[" + this.URI.spec + "] originalStreamListener: ", originalStreamListener);
							}
							this._delegatedStreamListener = aListener;
							return originalStreamListener;
						}
					},
					enumerable : true
				}
			});
})(HttpChannel.prototype);

// -- Implements Ci.nsIHttpChannelInternal
// Support of Ci.nsIHttpChannelInternal should not be necessary but it is
// because of : https://bugzilla.mozilla.org/show_bug.cgi?id=501952
(function(proto) {
	Object.defineProperties(proto, {
		canceled : {
			get : function canceled() {
				return this._status != 0;
			},
			enumerable : true
		},
		channelIsForDownload : {
			value : false,
			writable : false,
			enumerable : true
		},
		documentURI : {
			value : null,
			writable : true,
			enumerable : true
		},
		forceAllowThirdPartyCookie : {
			value : false,
			writable : true,
			enumerable : true
		},
		localAddress : {
			get : function localAddress() {
				return "127.0.0.1";
			},
			enumerable : true
		},
		localPort : {
			get : function localPort() {
				return -1;
			},
			enumerable : true
		},
		proxyInfo : {
			value : null,
			writable : false,
			enumerable : true
		},
		remoteAddress : {
			get : function remoteAddress() {
				return "127.0.0.1";
			},
			enumerable : true
		},
		remotePort : {
			get : function remotePort() {
				return -1;
			},
			enumerable : true
		},
		getRequestVersion : {
			value : function getRequestVersion(major, minor) {
				// out primitive variable as function parameter has no real
				// meaning in JS
				major = 1;
				minor = 1;
//				throw Cr.NS_ERROR_NOT_IMPLEMENTED;
			},
			writable : false,
			enumerable : true
		},
		getResponseVersion : {
			value : function getResponseVersion(major, minor) {
				// out primitive variable as function parameter has no real
				// meaning in JS
				major = 1;
				minor = 1;
//				throw Cr.NS_ERROR_NOT_IMPLEMENTED;
			},
			writable : false,
			enumerable : true
		},
		HTTPUpgrade : {
			value : function HTTPUpgrade(aProtocolName, aListener) {
				throw Cr.NS_ERROR_NOT_IMPLEMENTED;
			},
			writable : false,
			enumerable : true
		},
		setCookie : {
			value : function setCookie(aCookieHeader) {
				throw Cr.NS_ERROR_NOT_IMPLEMENTED;
			},
			writable : false,
			enumerable : true
		},
		setupFallbackChannel : {
			value : function setupFallbackChannel(aFallbackKey) {
				throw Cr.NS_ERROR_NOT_IMPLEMENTED;
			},
			writable : false,
			enumerable : true
		}
	});

})(HttpChannel.prototype);

// -- Implements Ci.nsIUploadChannel2
// -- must be implemented for channel used with XMLHttpRequest. Though it won't
// be "really" used, it avoid an console warning about the channel implementation 
(function(proto) {
	Object.defineProperties(proto,
			{
				explicitSetUploadStream : {
					value : function explicitSetUploadStream(aStream, aContentType, aContentLength, aMethod,
							aStreamHasHeaders) {
						throw Cr.NS_ERROR_NOT_IMPLEMENTED;
					},
					enumerable : true
				}
			});

})(HttpChannel.prototype);

//-- override nsITransportEventSink
(function(proto) {
	Object.defineProperties(proto, {
		onTransportStatus : {
			value : function(aTransport, aStatus, aProgress, aProgressMax) {
				
				if (FBTrace.DBG_FIRETV_HTTPCHANNEL) {
					FBTrace.sysout(CAT + "[HttpChannel.onTransportStatus][" + this._id + "][" + this.name + "] aStatus=0x" + aStatus.toString(16), arguments);
				}
				activityDistributor.observeActivity(
			            this,
			            NS_HTTP_ACTIVITY_TYPE_SOCKET_TRANSPORT,
			            aStatus,
			            new Date().getTime(), aProgress,
			            "");
				BaseChannel.prototype.onTransportStatus.apply(this, arguments);
			},
			enumerable : true
		}
	});
})(HttpChannel.prototype);


//-- override nsIMultiPartChannel
(function(proto) {
	Object.defineProperties(proto, {
		baseChannel : {
			get: function baseChannel(){
				return this;
			},
			enumerable : true
		},
		isLastPart : {
			get: function isLastPart(){
				return true;
			},
			enumerable : true
		},
		partID : {
			get: function partID(){
				return 1;
			},
			enumerable : true
		},
		contentDisposition : {
			value: null,
			enumerable : true
		}
	});
})(HttpChannel.prototype);

