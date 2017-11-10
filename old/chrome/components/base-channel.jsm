/* See license.txt for terms of usage */

var EXPORTED_SYMBOLS = [ "BaseChannel", "scope", "FBTrace" ];

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const CAT = "[base://] ";

const windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);

var FBTrace = {};
var scope = (function () {
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

var id = 0;

// ------------- BaseChannel --
function BaseChannel (aUri, aReferrer) {
	this._id = id++;
	if (FBTrace.DBG_FIRETV_BASECHANNEL) {
		FBTrace.sysout(CAT + "[BaseChannel][constructor][" + this._id + "]");
	}
	this.URI = aUri;
	this.originalURI = aUri;
}

// -- Implements Ci.nsISupports
(function (proto) {
	// Ci.nsISupports
	Object.defineProperties(proto, {
		QueryInterface : {
			value : XPCOMUtils.generateQI([ 
		        Ci.nsISupports, 
		        Ci.nsISupportsWeakReference, 
		        Ci.nsIRequest, 
		        Ci.nsIChannel, 
		        Ci.nsIRequestObserver,
				Ci.nsIStreamListener, 
				Ci.nsITransportEventSink, 
				Ci.nsIAsyncVerifyRedirectCallback ]),
			enumerable : true
		}
	});
})(BaseChannel.prototype);

// -- define BaseChannel channel own properties
(function (proto) {

	// BaseChannel
	Object.defineProperties(proto, {
		// -- private
		_streamListener : {
			value : null,
			writable : true
		},
		_streamListenerCtxt : {
			value : null,
			writable : true
		},
		_pump : {
			value : null,
			writable : true
		},
		_synthProgressEvents : {
			value : true,
			writable : true
		}
	});
})(BaseChannel.prototype);

// -- Implements Ci.nsIRequest
(function (proto) {
	Object.defineProperties(proto, {
		// -- private
		_status : {
			value : 0,
			writable : true
		},
		// -- public
		loadFlags : {
			value : 0,
			writable : true,
			enumerable : true
		},
		loadGroup : {
			value : null,
			writable: true,
			enumerable : true
		},
		name : {
			get : function name() {
				if (!this.URI) {
					return "";
				}
				return this.URI.spec;
			},
			enumerable : true
		},
		status : {
			get : function status() {
				return this._status;
			},
			enumerable : true
		},
		cancel : {
			value : function status(aStatus) {
				this._status = aStatus;
				if (this._pump) {
					this._pump.cancel(aStatus);
					this._pump = null;
				}
			},
			enumerable : true
		},
		isPending : {
			value : function isPending() {
				return this._pump != null;
			},
			enumerable : true
		},
		resume : {
			value : function resume() {
				this._pump.suspend();
			},
			enumerable : true
		},
		suspend : {
			value : function suspend() {
				this._pump.suspend();
			},
			enumerable : true
		}

	});
})(BaseChannel.prototype);

// -- Implements Ci.nsIChannel
(function(proto) {
	Object.defineProperties(proto, {
		_beginPumpingData : {
			value : function _beginPumpingData() {
				if (FBTrace.DBG_FIRETV_BASECHANNEL) {
					FBTrace.sysout(CAT + "[BaseChannel._beginPumpingData][" + this._id + "][" + this.name + "]");
				}
				var inputStream;
				try {
					inputStream = this.openContentStream();
				} catch (e) {
					if (FBTrace.DBG_FIRETV_BASECHANNEL || FBTrace.DBG_FIRETV_ERROR) {
						FBTrace.sysout(CAT + "[BaseChannel._beginPumpingData][" + this._id + "][" + this.name
								+ "] ERROR while opening content stream !", e);
					}
					throw e;
				}
				this._pump = Cc["@mozilla.org/network/input-stream-pump;1"].createInstance(Ci.nsIInputStreamPump);
				this._pump.init(inputStream, -1, -1, 0, 0, true);
				if (FBTrace.DBG_FIRETV_BASECHANNEL) {
					FBTrace.sysout(CAT + "[BaseChannel._beginPumpingData][" + this._id + "][" + this.name
							+ "] pump initialized, asyncRead...");
				}
				try {
					this._pump.asyncRead(this, null);
				} catch (e){
					if (FBTrace.DBG_FIRETV_BASECHANNEL || FBTrace.DBG_FIRETV_ERROR) {
						FBTrace.sysout(CAT + "[BaseChannel._beginPumpingData][" + this._id + "][" + this.name
								+ "] ERROR while calling asyncRead", e);
					}
				}
			},
			writable : false
		},

		openContentStream : {
			value : function openContentStream() {
				if (FBTrace.DBG_FIRETV_BASECHANNEL || FBTrace.DBG_FIRETV_ERROR) {
					FBTrace.sysout(CAT + "[BaseChannel.openContentStream][" + this._id + "][" + this.name + "] ERROR : must be implemented by subclasses" );
				}
				throw Cr.NS_ERROR_NOT_IMPLEMENTED;
			},
			configurable : true
		},

		// -- public
		contentCharset : {
			value : null,
			writable : true,
			enumerable : true
		},
		contentLength : {
			value : -1,
			writable : true,
			enumerable : true
		},
		contentType : {
			value : null,
			writable : true,
			enumerable : true
		},
		notificationCallbacks : {
			value : null,
			writable : true,
			enumerable : true
		},
		originalURI : {
			value : null,
			writable : true,
			enumerable : true
		},
		owner : {
			value : null,
			writable : true,
			enumerable : true
		},
		securityInfo : {
			value : null,
			writable : true,
			enumerable : true
		},
		URI : {
			value : null,
			writable : true,
			enumerable : true
		},
		asyncOpen : {
			value : function asyncOpen(aStreamListener, aContext) {
				if (FBTrace.DBG_FIRETV_BASECHANNEL) {
					FBTrace.sysout(CAT + "[BaseChannel.asyncOpen][" + this._id + "][" + this.name + "]", this);
				}
				// -- store original listener and context
				this._streamListener = aStreamListener;
				this._streamListenerCtxt = aContext;
				
				if (this.loadGroup) {
					this.loadGroup.addRequest(this, aContext);
					if (FBTrace.DBG_FIRETV_BASECHANNEL) {
						FBTrace.sysout(CAT + "[BaseChannel.asyncOpen][" + this._id + "][" + this.name
								+ "] Added request to loadGroup");
					}
				}
				
				try {
					this._beginPumpingData();
				} catch(e) {
					this._pump = null;
					this._streamListener = null;
					this._streamListenerCtxt = null;
					this.notificationCallbacks = null;
					if (this.loadGroup) {
						this.loadGroup.removeRequest(this, aContext, Cr.NS_BINDING_ABORTED);
						if (FBTrace.DBG_FIRETV_BASECHANNEL) {
							FBTrace.sysout(CAT + "[BaseChannel.asyncOpen][" + this._id + "][" + this.name
									+ "] Removed request from loadGroup");
						}
					}
					throw Cr.NS_BINDING_ABORTED;
				}
				if (FBTrace.DBG_FIRETV_BASECHANNEL) {
					FBTrace.sysout(CAT + "[BaseChannel.asyncOpen][" + this._id + "][" + this.name + "] done");
				}
			},
			enumerable : true
		},
		open : {
			value : function open() {
				if (FBTrace.DBG_FIRETV_BASECHANNEL) {
					FBTrace.sysout(CAT + "[BaseChannel.open][" + this._id + "][" + this.name + "]", arguments);
				}
				return this.openContentStream();
			},
			enumerable : true
		}
	});
})(BaseChannel.prototype);

// -- Implements Ci.nsIRequestObserver
(function(proto) {
	Object.defineProperties(proto, {
		onStartRequest : {
			value : function onStartRequest(aRequest, aContext) {
				if (FBTrace.DBG_FIRETV_BASECHANNEL) {
					FBTrace.sysout(CAT + "[BaseChannel.onStartRequest][" + this._id + "][" + this.name + "]", arguments);
				}
				try {
					this._streamListener.onStartRequest(this, this._streamListenerCtxt);
				} catch (e) {
					if (FBTrace.DBG_FIRETV_BASECHANNEL || FBTrace.DBG_FIRETV_ERROR) {
						FBTrace.sysout(CAT + "[BaseChannel.onStartRequest][" + this._id + "][" + this.name + "] ERROR", e);
					}
					
					if (this.loadGroup) {
						try {
							this.loadGroup.removeRequest(this, null, this._status);
							if (FBTrace.DBG_FIRETV_BASECHANNEL) {
								FBTrace.sysout(CAT + "[BaseChannel.onStartRequest][" + this._id + "][" + this.name
										+ "] Removed request from loadGroup (isPending=" + this.isPending() + ")", this.loadGroup);
							}
						} catch (e2) {
							// -- best effort
						}
					}
					this.loadGroup = null;
					this.notificationCallbacks = null;
					
//					throw e;
				}
			},
			enumerable : true
		},
		onStopRequest : {
			value : function onStopRequest(aRequest, aContext, aStatusCode) {
				if (FBTrace.DBG_FIRETV_BASECHANNEL) {
					FBTrace.sysout(CAT + "[BaseChannel.onStopRequest][" + this._id + "][" + this.name + "] aStatusCode=0x" + aStatusCode.toString(16), arguments);
				}
				this._status = aStatusCode;
				
				// Cause isPending to return false
				this._pump = null;
				
				try {
					this._streamListener.onStopRequest(this, this._streamListenerCtxt, this._status);
				} catch (e) {
					if (FBTrace.DBG_FIRETV_BASECHANNEL || FBTrace.DBG_FIRETV_ERROR) {
						FBTrace.sysout(CAT + "[BaseChannel.onStopRequest][" + this._id + "][" + this.name + "] ERROR", e);
					}
				}
				this._streamListener = null;
				this._streamListenerCtxt = null;

				if (this.loadGroup) {
					try {
						this.loadGroup.removeRequest(this, null, this._status);
						if (FBTrace.DBG_FIRETV_BASECHANNEL) {
							FBTrace.sysout(CAT + "[BaseChannel.onStopRequest][" + this._id + "][" + this.name
									+ "] Removed request from loadGroup (isPending=" + this.isPending() + ")", this.loadGroup);
						}
					} catch (e) {
						// -- best effort
					}
				}
				this.loadGroup = null;
				this.notificationCallbacks = null;
			},
			enumerable : true
		}
	});
})(BaseChannel.prototype);

// -- Implements Ci.nsIStreamListener
(function(proto) {
	Object.defineProperties(proto, {
		onDataAvailable : {
			value : function onDataAvailable(aRequest, aContext, aInputStream, aOffset, aCount) {
				if (FBTrace.DBG_FIRETV_BASECHANNEL) {
					FBTrace.sysout(CAT + "[BaseChannel.onDataAvailable][" + this._id + "][" + this.name + "]", arguments);
				}
				var success = true;
				try {
					this._streamListener.onDataAvailable(this, this._streamListenerCtxt, aInputStream, aOffset, aCount);
				} catch (e) {
					if (FBTrace.DBG_FIRETV_BASECHANNEL || FBTrace.DBG_FIRETV_ERROR) {
						FBTrace.sysout(CAT + "[BaseChannel.onDataAvailable][" + this._id + "][" + this.name + "] ERROR", e);
					}
					success = false;
				}
				if (this._synthProgressEvents && success) {
				    var prog = aOffset + aCount;
				    var progMax = (this.contentLength>-1)?this.contentLength:0xFFFFFFFF;
				    this.onTransportStatus(null, Ci.nsITransport.STATUS_READING, prog, progMax);
				}
			},
			enumerable : true
		}
	});
})(BaseChannel.prototype);

// -- Implements Ci.nsITransportEventSink
(function(proto) {
	Object.defineProperties(proto, {
		onTransportStatus : {
			value : function onTransportStatus(aTransport, aStatus, aProgress, aProgressMax) {
				if (FBTrace.DBG_FIRETV_BASECHANNEL) {
					FBTrace.sysout(CAT + "[BaseChannel.onTransportStatus][" + this._id + "][" + this.name + "] aStatus=0x" + aStatus.toString(16), arguments);
				}
				var progressSink = null;
				if (this.notificationCallbacks){
					try {
						progressSink = this.notificationCallbacks.QueryInterface(Ci.nsIProgressEventSink);
					} catch (e){
						// no progressSink
					}
				}
				if (progressSink){
					if (aProgress){
						progressSink.onProgress(this, this._streamListenerCtxt, aProgress, aProgressMax);
					}
				}
			},
			enumerable : true
		}
	});
})(BaseChannel.prototype);

// -- Implements Ci.nsIAsyncVerifyRedirectCallback --> TODO check if necessary
(function(proto) {
	// Ci.nsIAsyncVerifyRedirectCallback
	Object.defineProperties(proto, {
		onRedirectVerifyCallback : {
			value : function onRedirectVerifyCallback(result) {
				if (FBTrace.DBG_FIRETV_BASECHANNEL) {
					FBTrace.sysout(CAT + "[BaseChannel.onRedirectVerifyCallback][" + this._id + "][" + this.name + "]",
							arguments);
				}
			},
			enumerable : true
		}
	});

})(BaseChannel.prototype);
