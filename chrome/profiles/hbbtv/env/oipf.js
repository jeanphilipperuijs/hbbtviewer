/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
(function (global) {

	var privateData = {};

	Object.defineProperties(privateData, {
		"keyset" : {
			get : function keyset() {
				return global.KeySet;
			},
			enumerable : true
		},
		"currentChannel" : {
			get : function currentChannel() {
				var currCcid = FireTVPlugin.bridge.getCurrentTVChannel().ccid;
				return global.ChannelConfig.channelList.getChannel(currCcid);
			},
			enumerable : true
		},
		"getFreeMem" : {
			value : function getFreeMem() {
				return null;
			},
			enumerable : true
		}
	});

	function Application(doc) {
		this._document = doc;
	}
	
	Object.defineProperties(Application.prototype, {
		"_appUrl" : {
			value : null,
			writable : true,
			enumerable : false
		},
		
		"_xhr" : {
			value : null,
			writable : true,
			enumerable : false
		},
		"_asyncCreateApplication" : {
			value : function _asyncCreateApplication(url) {
				if (this._xhr) {
					this._xhr.abort();
				}
				this._xhr = new XMLHttpRequest();
				this._xhr.open("GET", url, true);
				this._xhr.onreadystatechange = this._asyncCreateApplicationCallback.bind(this);
				try {
					this._xhr.send(null);
				} catch (e) {
				}
			},
			writable : false,
			enumerable : false
		},
		"_asyncCreateApplicationCallback" : {
			value : function _asyncCreateApplicationCallback() {
				switch (this._xhr.readyState) {
				case 1:
					break;
				case 2:
					break;
				case 3:
					break;
				case 4:
					var contentType = this._xhr.getResponseHeader("Content-Type");
					if (!contentType) {
						contentType = "";
					}
					contentType = contentType.toLowerCase();
					// -- remove charset
					var index = contentType.indexOf(";");
					if (index > -1) {
						contentType = contentType.substring(0, index);
					}
					if (contentType === "application/vnd.dvb.ait+xml") {
						var ait = this._xhr.responseXML;
						try {
							var mhpNS = "urn:dvb:mhp:2009";
							var application = ait.getElementsByTagNameNS(mhpNS, "Application")[0];
							var urlBase = application.getElementsByTagNameNS(mhpNS, "URLBase")[0];
							if (urlBase) {
								urlBase = urlBase.textContent;
							} else {
								urlBase = "";
							}
							var applicationLocation = application.getElementsByTagNameNS(mhpNS, "applicationLocation")[0];
							global.location.href = urlBase + applicationLocation.textContent;
						} catch (e) {
						}
					} else {
						FireTVPlugin.bridge.loadUrlInTopWindow(this._appUrl);
					}
					break;
				default:
					break;
				}
			},
			writable : false,
			enumerable : false
		},
		
		"_document" : {
			value : null,
			writable : true,
			enumerable : false
		},
		"_visible" : {
			value : false,
			writable : true,
			enumerable : false
		},
		"privateData" : {
			value : privateData,
			writable : false,
			enumerable : true
		},
		"createApplication" : {
			value : function createApplication(url) {
				this._appUrl = url;
				this._asyncCreateApplication(url);
				// this._document.location.href = url;
				return new Application(document);
			},
			enumerable : true
		},
		"destroyApplication" : {
			value : function destroyApplication() {
				// ???
				this._document._oipfApplication = null;
				this._document = null;
				return false;
			},
			enumerable : true
		},
		"show" : {
			value : function show() {
				this._document.body.style.visibility = "visible";
				this._visible = true;
				return true;
			},
			enumerable : true
		},
		"hide" : {
			value : function hide() {
				this._document.body.style.visibility = "hidden";
				this._visible = false;
				return true;
			},
			enumerable : true
		}
	});
	global.Application = Application;
})(window);

// -- <object type="application/oipfConfiguration" />
(function (global) {
	var oipfConfiguration = {
		countryId : "FRA",
		preferredAudioLanguage : "FRA",
		preferredSubtitleLanguage : "FRA"
	};

	FireTVPlugin.defineObjectPropertiesForTypes({
		"configuration" : {
			value : oipfConfiguration,
			writable : false,
			enumerable : true
		}
	}, [ "application/oipfConfiguration" ]);
})(window);

// -- <object type="application/oipfApplicationManager" />
(function (global) {
	Object.defineProperties(global.Document.prototype, {
		"_oipfApplication" : {
			value : undefined,
			writable : true,
			enumerable : false
		}
	});

	FireTVPlugin.defineObjectPropertiesForTypes({
		"getOwnerApplication" : {
			value : function getOwnerApplication(document) {
				if (typeof (document._oipfApplication) === "undefined") {
					document._oipfApplication = new global.Application(document);
				}
				return document._oipfApplication;
			},
			enumerable : true
		}
	}, [ "application/oipfApplicationManager" ]);
})(window);

// -- <object type="application/oipfCapabilities" />
(function (global) {

	var capabilities = '<profilelist></profilelist>';
	var parser = new global.DOMParser();
	var xmlCapabilities = parser.parseFromString(capabilities, "text/xml");

	FireTVPlugin.defineObjectPropertiesForTypes({
		"xmlCapabilities" : {
			value : xmlCapabilities,
			writable : false,
			enumerable : true
		},
		"extraSDVideoDecodes" : {
			value : 0,
			writable : false,
			enumerable : true
		},
		"extraHDVideoDecodes" : {
			value : 0,
			writable : false,
			enumerable : true
		},
		"hasCapability" : {
			value : function hasCapability(profileName) {
				return false;
			},
			writable : false,
			enumerable : true
		}
	}, [ "application/oipfCapabilities" ]);
})(window);
