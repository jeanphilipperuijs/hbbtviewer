/* See license.txt for terms of usage */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("chrome://firetv-comp/content/base-channel.jsm");
//Components.utils.import("chrome://firetv-comp/content/http-channel.jsm");

var EXPORTED_SYMBOLS = [ "TvChannel", "scope", "FBTrace" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const CAT = "[tv://] ";

// ------------- TvChannel --
function TvChannel(aUri, aReferrer, notifyObservers) {
	if (FBTrace.DBG_FIRETV_TVCHANNEL) {
		FBTrace.sysout(CAT + "[TvChannel] [constructor]");
	}
	BaseChannel.apply(this, arguments);
}


TvChannel.prototype = new BaseChannel();

(function(proto) {

	// Override BaseChannel.openContentStream
	Object.defineProperties(proto, {
		openContentStream : {
			value : function() {
				if (FBTrace.DBG_FIRETV_TVCHANNEL) {
					FBTrace.sysout(CAT + "[TvChannel.openContentStream]", scope.FireTVPlugin);
				}

				var tabId = null, aBrowser = null, host;
				try {
					aBrowser = scope.FireTVPlugin.utils.getBrowserFromChannel(this);
					var aTab = scope.FireTVPlugin.TabManager.getTabForBrowser(aBrowser);
					if(!aTab){
						// -- if we don't have the tab, do the best effort by taking the currently active tab
						// This may happen, when Firebug network panel try to do its own requests (i.e to display an image)
						aTab = scope.document.getElementById("content").selectedTab;
					}
					if (aBrowser == null){
						var tabbedBrowser = aTab.ownerDocument.defaultView.gBrowser;
						aBrowser = tabbedBrowser.getBrowserForTab(aTab);
					}
					tabId = aTab.getAttribute("firetv-tab-id");
					if (FBTrace.DBG_FIRETV_TVCHANNEL) {
						FBTrace.sysout(CAT + "[TvChannel.openContentStream] tab-id: " + tabId);
					}
				} catch (e) {
					if (FBTrace.DBG_FIRETV_TVCHANNEL || FBTrace.DBG_FIRETV_ERROR) {
						FBTrace.sysout(CAT + "[TvChannel.openContentStream] ERROR while getting originating tab!", {error:e, channel:this});
					}
				} finally {
					if (!tabId || tabId == ""){
						// -- not firetv enabled tab
						if (FBTrace.DBG_FIRETV_TVCHANNEL || FBTrace.DBG_FIRETV_ERROR) {
							FBTrace.sysout(CAT + "[TvChannel.openContentStream] ERROR while getting originating tab!");
						}
						throw "Not a firetv enabled tab!";
					}
				}
					
				var infos = scope.FireTVPlugin.TabManager.infos[tabId];
				var profile = infos.profile;
				
				host = (aBrowser.currentURI.scheme== "dvb")?"dvb:/":(aBrowser.currentURI.scheme + "://" + aBrowser.currentURI.hostPort);
				
				var params = {};
				var path = this.URI.path;
				var queryString, keyValues, keyValue, index, i, value;
				index = path.indexOf("?");
				if (index > -1) {
					queryString = path.substring(index + 1);
					keyValues = queryString.split("&");
					for (i = 0; i < keyValues.length; i++) {
						keyValue = keyValues[i].split("=");
						value = keyValue[1];
						if (value) {
							value = scope.decodeURIComponent(value);
						}
						params[keyValue[0]] = value;
					}
				}
				
				
				var svgImage;
				
				// -- mediaplayer image requested, always computes it
				if (params.mediaplayer) {
					if (FBTrace.DBG_FIRETV_TVCHANNEL) {
						FBTrace.sysout(CAT + "[TvChannel.openContentStream] Requesting mediaplayer image with options: ", params);
					}
					svgImage = scope.FireTVPlugin.SVG.getTVImage(profile, host, params);
					this.contentCharset = "utf-8";
					this.contentType = "image/svg+xml";
					this.contentLength = svgImage.length;
					var unicodeConverter  = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
  					unicodeConverter.charset = "UTF-8";
					return unicodeConverter.convertToInputStream(svgImage);
				} 
				

				// -- now we known this is for tv
				
				// -- get channel
				var channelList = scope.FireTVPlugin.Broadcast.getCurrentChannelList();
				
				var ccid = params.ccid;
				if (!ccid) {
					ccid = infos["tv-channel"];	
					if (!ccid) {
						ccid = scope.FireTVPlugin.PreferenceManager.getHostRelatedPref(host, "tv-channel");
						if (!ccid) {
							ccid = "ccid:-1";
						}
					}
				}
				
				var channel = scope.FireTVPlugin.Broadcast.getChannelByCcid(ccid);
				if (channel == null) {
					channel = channelList[0];
				}
				
				params.channelDisplayName = channel.name;
				if (channel.ccid === "ccid:-1") {
					params.nochannel = true;
				}
				
				var profileDefinition =  scope.FireTVPlugin.ProfileManager.getProfileDefinition(profile);
				
				// -- get/create cache for current resolution
				var res = profileDefinition.resolution.width + "x" + profileDefinition.resolution.height;
				
				var cache = scope.FireTVPlugin.SVG.TV_IMAGE_PNG_CACHE[res];
				if (!cache) {
					cache = scope.FireTVPlugin.SVG.TV_IMAGE_PNG_CACHE[res] = {}
				}
				
				if (FBTrace.DBG_FIRETV_TVCHANNEL) {
					FBTrace.sysout(CAT + "[TvChannel.openContentStream] Requesting TV image '" + params.channelDisplayName + "' at resolution: " + res);
				}
				
				
				// -- tv image requested and it is in the cache, returns it
				if (cache[params.channelDisplayName]) {
					this.contentType = "image/png";
					
					var response = atob(cache[params.channelDisplayName]);
					this.contentLength = response.length;
					
					if (FBTrace.DBG_FIRETV_TVCHANNEL) {
						FBTrace.sysout(CAT + "[TvChannel.openContentStream] Found '" + params.channelDisplayName + "' image at " + res + " in the cache (" + response.length + " bytes).");
					}
					
					var storageStream = Cc["@mozilla.org/storagestream;1"].createInstance(Ci.nsIStorageStream);
					storageStream.init(8192, response.length, null);
					var binaryOutputStream = Cc["@mozilla.org/binaryoutputstream;1"].createInstance(Ci.nsIBinaryOutputStream);
					binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));
					binaryOutputStream.writeBytes(response, response.length);
			    	binaryOutputStream.close();
					return storageStream.newInputStream(0);
				}
				
				// -- compute png rendering and once computed, fills the stream
				if (FBTrace.DBG_FIRETV_TVCHANNEL) {
					FBTrace.sysout(CAT + "[TvChannel.openContentStream] Rendering '" + params.channelDisplayName + "' image at " + res + ".");
				}
				
				svgImage = scope.FireTVPlugin.SVG.getTVImage(profile, host, params);
			
				var win = aBrowser.contentWindow;
				var img = win.document.createElement("img");
				img.width = profileDefinition.resolution.width;
				img.height = profileDefinition.resolution.height;
				img.style = "width:" + profileDefinition.resolution.width + "px; height:" + profileDefinition.resolution.height + "px";
				
				var unicodeConverter  = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
				unicodeConverter.charset = "UTF-8";
				svgImage = unicodeConverter.ConvertFromUnicode(svgImage);
						
				var encoded = btoa(svgImage);
				var dataUri = "data:image/svg+xml;base64," + encoded;
				
				var pipe = Cc["@mozilla.org/pipe;1"].createInstance(Ci.nsIPipe);
				pipe.init(true,true, 65536, 100, null);
				var binaryOutputStream = Cc["@mozilla.org/binaryoutputstream;1"].createInstance(Ci.nsIBinaryOutputStream);
				binaryOutputStream.setOutputStream(pipe.outputStream);
				
				var that = this;
				var loadHandler = function(event) {
					event.target.removeEventListener("load", loadHandler, false);
					try {
						if (FBTrace.DBG_FIRETV_TVCHANNEL) {
							FBTrace.sysout(CAT + "[TvChannel.openContentStream#loadHandler] Image loaded");
						}
						var canvas = win.document.createElement("canvas");
						canvas.width = profileDefinition.resolution.width;
						canvas.height = profileDefinition.resolution.height;
						canvas.style = "position: absolute !important; top:0 !important; left:0 !important; visibility: hidden !important;";
						win.document.documentElement.appendChild(canvas);
						
						var ctx = canvas.getContext("2d");
						ctx.drawImage(img, 0, 0);
						cache[params.channelDisplayName] = canvas.toDataURL("image/png").substring(22);
						win.document.documentElement.removeChild(canvas)

						if (FBTrace.DBG_FIRETV_TVCHANNEL) {
							FBTrace.sysout(CAT + "[TvChannel.openContentStream#loadHandler] Storing png rendering in cache for '" + params.channelDisplayName + "' at " + res);
						}
						var response = atob(cache[params.channelDisplayName]);
						if (FBTrace.DBG_FIRETV_TVCHANNEL) {
							FBTrace.sysout(CAT + "[TvChannel.openContentStream#loadHandler] Size: base64=" + cache[params.channelDisplayName].length + ", bin=" + response.length);
						}
						
						that.contentLength = response.length;
						binaryOutputStream.writeBytes(response, response.length);
						binaryOutputStream.close();
				    	pipe.outputStream.close();
					} catch (e) {
						if (FBTrace.DBG_FIRETV_TVCHANNEL || FBTrace.DBG_FIRETV_ERROR) {
							FBTrace.sysout(CAT + "[TvChannel.openContentStream#loadHandler] ERROR", e);
						}
						binaryOutputStream.close();
					}
				};
				img.addEventListener("load", loadHandler, false);
				img.src = dataUri;
				this.contentType = "image/png";
				var is = pipe.inputStream;
				if (FBTrace.DBG_FIRETV_TVCHANNEL) {
					FBTrace.sysout(CAT + "[TvChannel.openContentStream] Returning inputstream (available=" + is.available()+ ", nonBlocking=" + is.isNonBlocking()+ ")", is);
				}
				return is;
			},
			enumerable : false
		}
	});
})(TvChannel.prototype);
