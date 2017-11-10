///* See license.txt for terms of usage */
/*global window:false, alert, getFireTVPluginInstance, Components */
try {
	(function () {
		if (this.HttpMonitor) {
			return;
		}
		
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cr = Components.results;
		
		var _this = this;
		
		var FBTrace = this.FBTrace;
		
		var observerService = Cc["@mozilla.org/observer-service;1"]
				.getService(Ci.nsIObserverService);
		
		var monitor = {};

		monitor.CAT = "[ftv.httpmonitor] ";

		var Delegate = function (httpChannel) {
			this.httpChannel = httpChannel;
			// before onStartRequest -> httpChannel.responseStatus is the real one, after it is the cached one
			this.originalResponseStatus = httpChannel.responseStatus;
		};

		Delegate.prototype = {

			onStartRequest : function (request, context) {
				var details = _this.utils.getRequestDetails(request);
				this.receivedData = "";
				this.isTopWindow = (this.httpChannel.referrer === null) || (this.httpChannel.referrer.spec === this.httpChannel.URI.spec);
				
				if (FBTrace.DBG_FIRETV_HTTPMONITOR) {
					if (this.isTopWindow) {
						FBTrace.sysout(monitor.CAT + ">>> url=" + details.url + "(" + this.originalResponseStatus + ") [TOP WINDOW] (redir=" + request.redirectionLimit + ")");
					} else {
						FBTrace.sysout(monitor.CAT + ">>> url=" + details.url + "(" + this.originalResponseStatus + ") (redir=" + request.redirectionLimit + ")");
					}
				}
				try {
					this.originalListener.onStartRequest(request, context);
				} catch (exc) {
					if (FBTrace.DBG_FIRETV_HTTPMONITOR || FBTrace.DBG_FIRETV_ERROR) {
						FBTrace.sysout(monitor.CAT + "[onStartRequest] [ERROR=>>> url=" + details.url, {request: request, ctx: context, error: exc});
					}
					request.cancel(exc.result);
				}
				
				try {
					this.forcedProfile = this.httpChannel.getResponseHeader("X-FireTV-Profile") || false;
				} catch (e) {
					this.forcedProfile = false;
					var that = this;
					var aVisitor = {
						visitHeader: function (header, value) {
							if (header === "X-FireTV-Profile") {
								that.forcedProfile = value;
							}
						}
					};
					this.httpChannel.visitResponseHeaders(aVisitor);
				}
				
				if (FBTrace.DBG_FIRETV_HTTPMONITOR && this.forcedProfile) {
					FBTrace.sysout(monitor.CAT + "[onStartRequest] forcedProfile: " + this.forcedProfile);
				} 
				
//				if (this.forcedProfile) {
//					var host = this.httpChannel.URI.scheme + "://" + this.httpChannel.URI.hostPort;
//					_this.PreferenceManager.addConfiguredHost(host);
//					_this.PreferenceManager.setHostRelatedPref(host, "profile", this.forcedProfile);
//				}
				
				this.isHtml = (this.httpChannel.contentType !== null && this.httpChannel.contentType.indexOf("html") !== -1);
				this.isJs = (this.httpChannel.contentType !== null && this.httpChannel.contentType.indexOf("javascript") !== -1);
				this.isCss = (this.httpChannel.contentType !== null && this.httpChannel.contentType.indexOf("css") !== -1);
				// -- simplify response content type;
				if (this.isHtml) {
					this.simplifiedResponseContentType = "text/html";
				}
				if (this.isJs) {
					this.simplifiedResponseContentType = "text/javascript";
				}
				if (this.isCss) {
					this.simplifiedResponseContentType = "text/css";
				}
				this.process = (this.isHtml || this.isJs || this.isCss) && (this.originalResponseStatus !== 301 && this.originalResponseStatus !== 302);
				if (this.process) {
					try {
						var profileName;
						if (this.forcedProfile) {
							profileName = this.forcedProfile;
							_this.TabManager.forceTabProfileForChannel(this.httpChannel, profileName);
						} else {
							var tabInfos = _this.TabManager.getTabInfosForChannel(this.httpChannel);
							profileName = tabInfos.profile;
						}
						this.profileDefinition = _this.ProfileManager.getProfileDefinition(profileName);
					} catch (e) {
						// -- unable to get profile definition, maybe a view-source request with no tab associated
					}
				}
			},

			onDataAvailable : function (request, context, inputStream, offset, count) {
				if (this.process) {
					var scriptableInputStream = Cc["@mozilla.org/scriptableinputstream;1"]
							.createInstance(Ci.nsIScriptableInputStream);
					scriptableInputStream.init(inputStream);
					this.receivedData += scriptableInputStream.read(count);
				} else {
					try {
						this.originalListener.onDataAvailable(request, context, inputStream, offset, count);
					} catch (exc) {
						if (FBTrace.DBG_FIRETV_HTTPMONITOR || FBTrace.DBG_FIRETV_ERROR) {
							FBTrace.sysout(monitor.CAT + "[onDataAvailable] [ERROR=>>> url=" + request.URI.spec, {request: request, ctx: context, error: exc});
						}
						request.cancel(exc.result);
					}
				}
			},

			onStopRequest : function (request, context, statusCode) {
				var details = _this.utils.getRequestDetails(request);
				if (FBTrace.DBG_FIRETV_HTTPMONITOR) {
					FBTrace.sysout(monitor.CAT + "<<< url=" + details.url + " (status=" + this.originalResponseStatus + " -> " + request.responseStatus + ")[" + statusCode + " -> success=" + Components.isSuccessCode(statusCode) + "]");
					FBTrace.sysout(monitor.CAT + "process=" + this.process + ", profileDefinition=" + this.profileDefinition + ", length=" + this.receivedData.length, this.profileDefinition);
				}

				if (Components.isSuccessCode(statusCode)) {
					if (this.process) {
						// Get entire response and filter
						var response;
						if (this.profileDefinition) {
							// -- normal case
							response = _this.ResponseFilter.filter(request, this.receivedData, this.simplifiedResponseContentType, this.profileDefinition);
						} else {
							// -- certainly a view-source request
							response = this.receivedData;
						}
						if (response.length > 0) {
							var storageStream = _this.utils.CCIN("@mozilla.org/storagestream;1", "nsIStorageStream");
							var binaryOutputStream = _this.utils.CCIN("@mozilla.org/binaryoutputstream;1",
									"nsIBinaryOutputStream");
							storageStream.init(8192, response.length, null);
							binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));
							binaryOutputStream.writeBytes(response, response.length);

							// send data back to the browser
							try {
								this.originalListener.onDataAvailable(request, context,
										storageStream.newInputStream(0), 0, storageStream.length);
							} catch (e) {
								statusCode = e.result;
							}
						}
					}
				}
				this.originalListener.onStopRequest(request, context, statusCode);

			},

			QueryInterface : function (aIID) {
				if (aIID.equals(Ci.nsIStreamListener) || aIID.equals(Ci.nsISupports)) {
					return this;
				}
				throw Cr.NS_NOINTERFACE;
			}
		};
		
		var MP4Delegate = function (httpChannel) {
			this.httpChannel = httpChannel;
			// before onStartRequest -> httpChannel.responseStatus is the real one, after it is the cached one
			this.originalResponseStatus = httpChannel.responseStatus;
			this.firstDataAvailable = true;
		};
		
		MP4Delegate.prototype = {
			onStartRequest : function (request, context) {
				try {
					this.originalListener.onStartRequest(request, context);
				} catch (exc) {
					if (FBTrace.DBG_FIRETV_HTTPMONITOR || FBTrace.DBG_FIRETV_MP4UTILS || FBTrace.DBG_FIRETV_ERROR) {
						FBTrace.sysout(monitor.CAT + "[MP4Delegate.onStartRequest] [ERROR=>>> url=" + this.httpChannel.URI.spec, {request: request, ctx: context, error: exc});
					}
					request.cancel(exc.result);
				}
			},

			onDataAvailable : function (request, context, inputStream, offset, count) {
				if (this.firstDataAvailable === true) {
					var acceptRanges = false;
					try {
						acceptRanges = this.httpChannel.getResponseHeader("Accept-Ranges") === "bytes";
					} catch (e) {
					}
					try {
						if (acceptRanges) {
							if (FBTrace.DBG_FIRETV_HTTPMONITOR || FBTrace.DBG_FIRETV_MP4UTILS) {
								FBTrace.sysout(monitor.CAT + "[MP4Delegate.onDataAvailable] Server accepts Ranges-requests");
								FBTrace.sysout(monitor.CAT + "[MP4Delegate.onDataAvailable] First time, (received " + count + " bytes from offset " + offset + "), checking moov atom: " + this.httpChannel.URI.spec, request);
							}
							
							// -- first chunk of data will be stored in a storage stream
							var storageStream = Cc["@mozilla.org/storagestream;1"].createInstance(Ci.nsIStorageStream);
							var binaryOutputStream = Cc["@mozilla.org/binaryoutputstream;1"].createInstance(Ci.nsIBinaryOutputStream);
							storageStream.init(8192, count, null);
							binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));
							
							// -- read first chunk of data
							var binaryInputStream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);
							binaryInputStream.setInputStream(inputStream);
							
							binaryOutputStream.writeByteArray(binaryInputStream.readByteArray(count), count);
							binaryOutputStream.close();
							
							var that = this;
							var handler = {
								handleResult: function handleResult(patchedInputStream) {
									if (FBTrace.DBG_FIRETV_HTTPMONITOR || FBTrace.DBG_FIRETV_MP4UTILS) {
										FBTrace.sysout(monitor.CAT + "[MP4Delegate.handleResult] result length=" + patchedInputStream.available());
									}
									try {
										request.resume();
									} catch (exc) {
										if (FBTrace.DBG_FIRETV_HTTPMONITOR || FBTrace.DBG_FIRETV_MP4UTILS || FBTrace.DBG_FIRETV_ERROR) {
											FBTrace.sysout(monitor.CAT + "[MP4Delegate.onDataAvailable] [ERROR=>>> url=" + that.httpChannel.URI.spec + ". Failed to resume.", {request: request, ctx: context, error: exc});
										}
										request.cancel(exc.result);
									}
									try {
										that.originalListener.onDataAvailable(request, context, patchedInputStream, 0, patchedInputStream.available());
									} catch (exc2) {
										if (FBTrace.DBG_FIRETV_HTTPMONITOR || FBTrace.DBG_FIRETV_MP4UTILS || FBTrace.DBG_FIRETV_ERROR) {
											FBTrace.sysout(monitor.CAT + "[MP4Delegate.onDataAvailable] [ERROR=>>> url=" + that.httpChannel.URI.spec, {request: request, ctx: context, error: exc2});
										}
										request.cancel(exc2.result);
									}
									if (FBTrace.DBG_FIRETV_HTTPMONITOR || FBTrace.DBG_FIRETV_MP4UTILS) {
										FBTrace.sysout(monitor.CAT + "[MP4Delegate.handleResult] Resume request.");
									}
								}	
							};
							var moovAtomChecker = new _this.MP4Utils.MP4MoovAtomChecker(this.httpChannel.URI.spec, this.httpChannel.contentLength, storageStream, handler);
							request.suspend();
							moovAtomChecker.checkMoovAtom();
						} else {
							if (FBTrace.DBG_FIRETV_HTTPMONITOR || FBTrace.DBG_FIRETV_MP4UTILS) {
								FBTrace.sysout(monitor.CAT + "[MP4Delegate.onDataAvailable] Server DOES NOT accepts Ranges-requests. No moov atom check possible. Hope it will be first.");
							}
							try {
								this.originalListener.onDataAvailable(request, context, inputStream, offset, count);
							} catch (exc) {
								if (FBTrace.DBG_FIRETV_HTTPMONITOR || FBTrace.DBG_FIRETV_ERROR) {
									FBTrace.sysout(monitor.CAT + "[MP4Delegate.onDataAvailable] [ERROR=>>> url=" + this.httpChannel.URI.spec, {request: request, ctx: context, error: exc});
								}
								request.cancel(exc.result);
							}
						}
					} catch (exc3) {
						if (FBTrace.DBG_FIRETV_HTTPMONITOR || FBTrace.DBG_FIRETV_ERROR) {
							FBTrace.sysout(monitor.CAT + "[MP4Delegate.onDataAvailable] [ERROR=>>> url=" + this.httpChannel.URI.spec, {request: request, ctx: context, error: exc3});
						}
						request.cancel(exc3.result);
					} finally {
						this.firstDataAvailable = false;
					}
				} else {
					// -- no range request supported, forward packets
					try {
						this.originalListener.onDataAvailable(request, context, inputStream, offset, count);
					} catch (exc4) {
						if (FBTrace.DBG_FIRETV_HTTPMONITOR || FBTrace.DBG_FIRETV_ERROR) {
							FBTrace.sysout(monitor.CAT + "[MP4Delegate.onDataAvailable] [ERROR=>>> url=" + this.httpChannel.URI.spec, {request: request, ctx: context, error: exc4});
						}
						request.cancel(exc4.result);
					}
				}
				
			},

			onStopRequest : function (request, context, statusCode) {
				if (FBTrace.DBG_FIRETV_HTTPMONITOR || FBTrace.DBG_FIRETV_MP4UTILS) {
					FBTrace.sysout(monitor.CAT + "[MP4Delegate.onStopRequest] url=" + this.httpChannel.URI.spec, {request: request, context: context, statusCode: statusCode});
				}
				this.originalListener.onStopRequest(request, context, statusCode);
			},

			QueryInterface : function (aIID) {
				if (aIID.equals(Ci.nsIStreamListener) || aIID.equals(Ci.nsISupports)) {
					return this;
				}
				throw Cr.NS_NOINTERFACE;
			}
		};

		var isTopWindowChannel = function (httpChannel) {
			var LOAD_DOCUMENT_URI = !!(httpChannel.loadFlags & Ci.nsIChannel.LOAD_DOCUMENT_URI);
			var LOAD_INITIAL_DOCUMENT_URI = !!(httpChannel.loadFlags & Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI);
			var topWindow = LOAD_DOCUMENT_URI || LOAD_INITIAL_DOCUMENT_URI;
			if (httpChannel.owner) {
				var principal = httpChannel.owner.QueryInterface(Ci.nsIPrincipal);
				if (principal) {
					topWindow = false;
				}
			}
			return topWindow;
		};
		
		var requestObserver = {
			observe : function (aSubject, aTopic, aData) {
				var MODIFIED_SINCE = new Date(0).toString();
				var httpChannel, newListener;
				if (aTopic === "xpcom-shutdown") {
					monitor.shutdown();
				} else if (aTopic === "http-on-modify-request") {
					httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);
					var topWindow = isTopWindowChannel(httpChannel);
					if (topWindow) {
						_this.TabManager.deleteTabIgnoredFlagForChannel(httpChannel);
					}
					if ((_this.utils.configuredHost((httpChannel.referrer !== null) ? httpChannel.referrer : httpChannel) || 
							(_this.TabManager.hasTabInfosForChannel(httpChannel) && !topWindow)) && 
							!_this.TabManager.hasTabIgnoredFlagForChannel(httpChannel)) 
					{
						var tabInfos = _this.TabManager.getTabInfosForChannel(httpChannel);
						if (tabInfos) {
							var profileName = tabInfos.profile;
							var profileDefinition = _this.ProfileManager.getProfileDefinition(profileName);
							var userAgent = _this.PreferenceManager.getOverriddenUserAgent(profileName);
							userAgent = (userAgent) ? userAgent : profileDefinition.userAgent;
							if (_this.PreferenceManager.isUserAgentSuffixEnabled()) {
								userAgent += " " + _this.Constants.USERAGENT_SUFFIX + " " + _this.Constants.VERSION
							}
//							if (FBTrace.DBG_FIRETV_HTTPMONITOR) {
//								FBTrace.sysout(monitor.CAT + "Overriding user-agent: " + userAgent);
//							}
							httpChannel.setRequestHeader("User-Agent", userAgent, false);
						} else {
							if (FBTrace.DBG_FIRETV_HTTPMONITOR) {
								FBTrace.sysout(monitor.CAT + " Unable to override request user-agent, no user agent found for " + httpChannel.URI.spec + " (may happen for firebug, view-source or firetv-ignore requests)");
							}
						}
					}
				} else if (aTopic === "http-on-examine-response" || aTopic === "http-on-examine-cached-response") {
					httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);
					
					// -- get request headers with visitor method as getRequestHeader() seems unavailable here
					var fireTVIgnore = false;
					var fireTVRequest = false;
					var aVisitor = {
						visitHeader: function (header, value) {
							if (header === "X-FireTV-Ignore") {
								fireTVIgnore = true;
							} else {
								if (header === "User-Agent" && value && value.indexOf(_this.Constants.USERAGENT_SUFFIX) > -1) {
									fireTVRequest = true;
								}
							}
						}
					};
					httpChannel.visitRequestHeaders(aVisitor);
					// -- allow server to disable firetv for some configured pages by setting X-FireTV-Ignore header
					httpChannel.visitResponseHeaders(aVisitor);
					
					// -- detected X-FireTV-Ignore header: flag the tab only if a top window request
					if (fireTVIgnore && isTopWindowChannel(httpChannel)) {
						_this.TabManager.setTabIgnoredFlagForChannel(httpChannel);
					}
					
					// -- ignore only if tab has been flagged
					fireTVIgnore = _this.TabManager.hasTabIgnoredFlagForChannel(httpChannel);
					
					var configured = fireTVRequest;
					if (httpChannel.referrer !== null) {
						configured = configured || _this.utils.configuredHost(httpChannel.referrer);
					}
					configured = configured || _this.utils.configuredHost(httpChannel);
					var origin;
					if (!configured) {
						try {
							origin = httpChannel.getRequestHeader("Origin");
							if (origin) {
								configured = _this.utils.configuredHost(origin);
							}
						} catch (e) {
						}
					}
					configured = configured && httpChannel.URI.scheme !== "firetv";
					configured = configured && httpChannel.URI.scheme !== "tv";
					
					if (configured) {
						// manage mp4 requests
						if (httpChannel.responseStatus === 200 && ((httpChannel.contentType && (httpChannel.contentType === "video/mp4")) || (httpChannel.URI.spec.match(/\.mp4$/)))) {
							if (!fireTVIgnore) {
								if (FBTrace.DBG_FIRETV_HTTPMONITOR || FBTrace.DBG_FIRETV_MP4UTILS) {
									FBTrace.sysout(monitor.CAT + " url=" + httpChannel.URI.spec + " -> forwarding control to MP4Delegate");
								}
								// -- allow cross-origin requests for configured hosts to reproduce common tv behaviour
								httpChannel.setResponseHeader("Access-Control-Allow-Origin", "*", false);
								httpChannel.setResponseHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS", false);
								httpChannel.setResponseHeader("Access-Control-Allow-Headers", "Content-Type, X-Requested-With, Expires, Pragma, Cache-Control, Authorization, Clone, toXml", false);
								newListener = new MP4Delegate(httpChannel);
								aSubject.QueryInterface(Ci.nsITraceableChannel);
								newListener.originalListener = aSubject.setNewListener(newListener);
								return;
							}
						}
						
						// manage audio/video requests
						if (httpChannel.contentType && (httpChannel.contentType.match(/^video\//) || httpChannel.contentType.match(/^audio\//))) {
							return;
						}
						
						if (fireTVIgnore) {
							return;
						}
						// -- allow cross-origin requests for configured hosts to reproduce common tv behaviour
						httpChannel.setResponseHeader("Access-Control-Allow-Origin", "*", false);
						httpChannel.setResponseHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS", false);
						httpChannel.setResponseHeader("Access-Control-Allow-Headers", "Content-Type, X-Requested-With, Expires, Pragma, Cache-Control", false);
						var details = _this.utils.getRequestDetails(aSubject);
						if (aTopic === "http-on-examine-cached-response") {
							if (FBTrace.DBG_FIRETV_HTTPMONITOR) {
								FBTrace.sysout(monitor.CAT + "[Cached response] " + details.fullurl);
							}
						}
						
						newListener = new Delegate(httpChannel);
						aSubject.QueryInterface(Ci.nsITraceableChannel);
						newListener.originalListener = aSubject.setNewListener(newListener);
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

		monitor.init = function () {
			if (FBTrace.DBG_FIRETV_HTTPMONITOR) {
				FBTrace.sysout(monitor.CAT + "[init]");
			}
			observerService.addObserver(requestObserver, "http-on-modify-request", false);
			observerService.addObserver(requestObserver, "http-on-examine-response", false);
			observerService.addObserver(requestObserver, "http-on-examine-cached-response", false);
			observerService.addObserver(requestObserver, "xpcom-shutdown", false);
			if (FBTrace.DBG_FIRETV_HTTPMONITOR) {
				FBTrace.sysout(monitor.CAT + "[done]");
			}
		};

		monitor.shutdown = function () {
			if (FBTrace.DBG_FIRETV_HTTPMONITOR) {
				FBTrace.sysout(monitor.CAT + "[shutdown]");
			}
			observerService.removeObserver(requestObserver, "http-on-modify-request");
			observerService.removeObserver(requestObserver, "http-on-examine-response");
			observerService.removeObserver(requestObserver, "http-on-examine-cached-response");
			observerService.removeObserver(requestObserver, "xpcom-shutdown");
			if (FBTrace.DBG_FIRETV_HTTPMONITOR) {
				FBTrace.sysout(monitor.CAT + "[done]");
			}
		};

		this.HttpMonitor = monitor;

	}).apply(getFireTVPluginInstance());

} catch (exc) {
	alert("[ftv-httpmonitor.js] " + exc);
}
