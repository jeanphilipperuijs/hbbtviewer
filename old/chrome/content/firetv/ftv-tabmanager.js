/* See license.txt for terms of usage */
/*global window:false, alert, getFireTVPluginInstance, Components */
try {
	(function () {
		if (this.TabManager) {
			return;
		}
		
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cr = Components.results;
		
		const windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);

		var _this = this;
		
		var FBTrace = this.FBTrace;

		var tabmanager = {};

		tabmanager.CAT = "[ftv.tabmanager] ";

		tabmanager.infos = {

		};

		tabmanager.getTabForBrowser = function (aBrowser) {
			var enumerator = windowManager.getEnumerator(null);
			var tabbedBrowser, win;
			var i, aTab;
			while (enumerator.hasMoreElements()) {
				win = enumerator.getNext();
				tabbedBrowser = win.document.getElementById("content");
				if (tabbedBrowser && tabbedBrowser.tabs) {
					for (i = 0; i < tabbedBrowser.tabs.length; i++) {
						aTab = tabbedBrowser.tabs.item(i);
						if (tabbedBrowser.getBrowserForTab(aTab) === aBrowser) {
							return aTab;
						}
					}
				}
			}
			return null;
		};

		var counter = 0;

		// -- if present anOptionalURI is more relevant than aBrowser.currentURI
		var initTabInfos = function (aTab, anOptionalURI) {
			var tabId = aTab.getAttribute("firetv-tab-id");
			var tabbedBrowser = aTab.ownerDocument.defaultView.gBrowser;
			var aBrowser = tabbedBrowser.getBrowserForTab(aTab);
			var aURI = (anOptionalURI) ? anOptionalURI : aBrowser.currentURI;
			var host = (aURI.scheme === "dvb") ? "dvb:/" : (aURI.scheme + "://" + aURI.hostPort);
			
			if (aTab.hasAttribute("firetv-ignore")) {
				return;
			}
			
			if (!aTab.hasAttribute("firetv-tab-id")) {
				tabId = "tab-" + (counter++);
				aTab.setAttribute("firetv-tab-id", tabId);

				var profile = _this.PreferenceManager.getDefaultProfile();
				tabmanager.infos[tabId] = {
					"tab-id" : tabId,
					"profile" : profile
				};
				// -- restoring host related prefs
				var prefs = _this.PreferenceManager.getAllHostRelatedPrefs(host);
				var i;
				for (i = 0; i < prefs.length; i++) {
					tabmanager.infos[tabId][prefs[i].pref] = prefs[i].value;
				}

				if (FBTrace.DBG_FIRETV_TABMANAGER) {
					FBTrace.sysout(tabmanager.CAT + "Initializing tab with id=" + tabId + " [" + host + "]", {
						infos : tabmanager.infos[tabId],
						aTab : aTab,
						host : host
					});
				}
			} 
		};

		tabmanager.cleanTabInfos = function (aTab, cleanDVBRoot) {
			if (cleanDVBRoot && aTab.hasAttribute("firetv-dvbroot")) {
				if (FBTrace.DBG_FIRETV_TABMANAGER) {
					FBTrace.sysout(tabmanager.CAT + "Removing firetv-dvbroot attribute");
				}
				aTab.removeAttribute("firetv-dvbroot");
			}
			if (aTab.hasAttribute("firetv-tab-id")) {
				if (FBTrace.DBG_FIRETV_TABMANAGER) {
					FBTrace.sysout(tabmanager.CAT + "Cleaning tab for id=" + aTab.getAttribute("firetv-tab-id"));
				}
				var tabId = aTab.getAttribute("firetv-tab-id");
				aTab.removeAttribute("firetv-tab-id");
				delete tabmanager.infos[tabId];
				
				var tabbedBrowser = aTab.ownerDocument.defaultView.gBrowser;
				var aBrowser = tabbedBrowser.getBrowserForTab(aTab);
				if (aBrowser.contentWindow.document && aBrowser.contentWindow.document.documentElement) {
					_this.Bridge.unregisterBridge(aBrowser.contentWindow);
					var doc = aBrowser.contentWindow.document.documentElement;
					var attrs = doc.attributes;
					var attrToRemove = [];
					var regexp = /^firetv-/;
					var res;
					var i;
					for (i = 0; i < attrs.length; i++) {
						res = regexp.test(attrs[i].name);
						if (res) {
							attrToRemove.push(attrs[i].name);
						}
					}
					for (i = 0; i < attrToRemove.length; i++) {
						doc.removeAttribute(attrToRemove[i]);
					}
				}
			}
		};

		var onTabClose = function (event) {
			var aTab = event.target;
			tabmanager.cleanTabInfos(aTab, true);
		};

		var getInfosForTab = function (aTab, anOptionalURI) {
			if (aTab === null) {
				// unable to retrieve tab, so cannot init infos : might happen for favicon request, of view-source : ignore 
				return null;
			}
			initTabInfos(aTab, anOptionalURI);
			var tabId = aTab.getAttribute("firetv-tab-id");
			return tabmanager.infos[tabId];
		};
		
		var onTabFocus = function (aTab, anOptionalURI) {
			var tabbedBrowser = aTab.ownerDocument.defaultView.gBrowser;
			var aBrowser = tabbedBrowser.getBrowserForTab(aTab);
			var aURI = (anOptionalURI) ? anOptionalURI : aBrowser.currentURI;
			var firetvButton, infos, currentProfileName, profileDefinition;

			firetvButton = aTab.ownerDocument.defaultView.document.getElementById("firetv-button");

			if (!_this.utils.managedProtocol(aURI) || aTab.hasAttribute("firetv-ignore")) {
				if (aTab === tabmanager.focusedTab) {
					firetvButton.setAttribute("disabled", "true");
				}
			} else {
				if (aTab === tabmanager.focusedTab) {
					firetvButton.removeAttribute("disabled");
				}

				if (_this.utils.configuredHost(aURI)) {
					if (aTab === tabmanager.focusedTab) {
						firetvButton.setAttribute("firetv-disabled", "false");
					}
					infos = getInfosForTab(aTab, aURI);
					currentProfileName = infos.profile;
					profileDefinition = _this.ProfileManager.getProfileDefinition(currentProfileName);
					_this.UI.checkFullscreen(aBrowser.contentWindow);

				} else {
					if (aTab === tabmanager.focusedTab) {
						firetvButton.setAttribute("firetv-disabled", "true");
					}
					tabmanager.cleanTabInfos(aTab, true);
				}
			}
		};

		
		var onTabSelect = function (event) {
			var aTab = event.target;
			tabmanager.focusedTab = aTab;
			onTabFocus(aTab);
		};

		var Delegate = function () {
		};

		Delegate.prototype = {
			QueryInterface : function (aIID) {
				if (aIID.equals(Ci.nsIWebProgressListener) || 
					aIID.equals(Ci.nsISupportsWeakReference) || 
					aIID.equals(Ci.nsISupports)) {
					return this;
				}
				throw Cr.NS_NOINTERFACE;
			},

			onStateChange : function (aBrowser, aWebProgress, aRequest, aFlag, aStatus) {

			},
			onLocationChange : function (aBrowser, aWebProgress, aRequest, aURI) {
				var triggeredByTopWindow = (aWebProgress.DOMWindow && aWebProgress.DOMWindow === aWebProgress.DOMWindow.top);
				var newHost = "about:blank";
				try {
					newHost = aURI.scheme + "://" + aURI.hostPort;
				} catch (e) {
				}
				if (!triggeredByTopWindow) {
					if (FBTrace.DBG_FIRETV_TABMANAGER) {
						FBTrace.sysout(tabmanager.CAT + "[onLocationChange] iframe changed -> " + newHost);
					}
					return;
				}
				var aTab = tabmanager.getTabForBrowser(aBrowser);
				var previousHost = aTab.getAttribute("firetv-previous-host");
				if (previousHost !== newHost) {
					if (FBTrace.DBG_FIRETV_TABMANAGER) {
						FBTrace.sysout(tabmanager.CAT + "[onLocationChange] " + previousHost + " -> " + newHost + " : cleaning tab infos");
					}
					var cleanDVBRoot = !/^dvb:\/\//.test(newHost);
					tabmanager.cleanTabInfos(aTab, cleanDVBRoot);
				}
				aTab.setAttribute("firetv-previous-host", newHost);
				onTabFocus(aTab, aURI);
			},
			onProgressChange : function (aBrowser, aWebProgress, aRequest, curSelf, maxSelf, curTot, maxTot) {
			},
			onStatusChange : function (aBrowser, aWebProgress, aRequest, aStatus, aMessage) {
			},
			onSecurityChange : function (aBrowser, aWebProgress, aRequest, aState) {
			}
		};

		var delegate = new Delegate();

		tabmanager.focusedTab = null;

		tabmanager.getTabById = function (firetvTabId) {
			var enumerator = windowManager.getEnumerator(null);
			var tabbedBrowser, win;
			var i, aTab;
			while (enumerator.hasMoreElements()) {
				win = enumerator.getNext();
				tabbedBrowser = win.document.getElementById("content");
				if (tabbedBrowser) {
					for (i = 0; i < tabbedBrowser.tabs.length; i++) {
						aTab = tabbedBrowser.tabs.item(i);
						if (aTab.getAttribute("firetv-tab-id") === firetvTabId) {
							return aTab;
						}
					}
				}
			}
			return null;
		};
		
		tabmanager.deleteTabIgnoredFlagForChannel = function (aChannel) {
			var aBrowser = _this.utils.getBrowserFromChannel(aChannel);
			var aTab = tabmanager.getTabForBrowser(aBrowser);
			if (aTab) {
				aTab.removeAttribute("firetv-ignore");
			}
		};
		
		tabmanager.setTabIgnoredFlagForChannel = function (aChannel) {
			var aBrowser = _this.utils.getBrowserFromChannel(aChannel);
			var aTab = tabmanager.getTabForBrowser(aBrowser);
			if (aTab) {
				aTab.setAttribute("firetv-ignore", true);
				tabmanager.cleanTabInfos(aTab, true);
			}
		};
		
		tabmanager.hasTabIgnoredFlagForChannel = function (aChannel) {
			var aBrowser = _this.utils.getBrowserFromChannel(aChannel);
			var aTab = tabmanager.getTabForBrowser(aBrowser);
			if (aTab) {
				return aTab.hasAttribute("firetv-ignore");
			} 
			return false;
		};
		
		tabmanager.hasTabInfosForChannel = function (aChannel) {
			if (tabmanager.hasTabIgnoredFlagForChannel(aChannel)) {
				return false;
			}
			var aBrowser = _this.utils.getBrowserFromChannel(aChannel);
			var aTab = tabmanager.getTabForBrowser(aBrowser);
			if (aTab) {
				var tabId = aTab.getAttribute("firetv-tab-id");
				if (tabId && tabId !== "") {
					return true;
				}
			} 
			return false;
		};
		
		tabmanager.forceTabProfileForChannel = function (aChannel, profile) {
			var aBrowser = _this.utils.getBrowserFromChannel(aChannel);
			var aTab = tabmanager.getTabForBrowser(aBrowser);
			var infos = getInfosForTab(aTab, aChannel.URI);
			infos.profile = profile;
		};
		
		tabmanager.getTabInfosForChannel = function (aChannel) {
			var aBrowser = _this.utils.getBrowserFromChannel(aChannel);
			var aTab = tabmanager.getTabForBrowser(aBrowser);
			var infos = getInfosForTab(aTab, aChannel.URI);
			return infos;
		};

		tabmanager.getTabInfosForWindow = function (aWindow) {
			var aBrowser = _this.utils.getBrowserFromWindow(aWindow);
			var aTab = tabmanager.getTabForBrowser(aBrowser);
			var infos = getInfosForTab(aTab);
			return infos;
		};

		tabmanager.registerListeners = function (tabbedBrowser) {
			if (FBTrace.DBG_FIRETV_TABMANAGER) {
				FBTrace.sysout(tabmanager.CAT + "[registerListeners]", tabbedBrowser);
			}
			tabmanager.focusedTab = tabbedBrowser.selectedTab;
			onTabFocus(tabbedBrowser.selectedTab);

			tabbedBrowser.addTabsProgressListener(delegate, Ci.nsIWebProgress.NOTIFY_ALL);
			tabbedBrowser.tabContainer.addEventListener("TabSelect", onTabSelect, false);
			tabbedBrowser.tabContainer.addEventListener("TabClose", onTabClose, false);
		};

		tabmanager.unregisterListeners = function (tabbedBrowser) {
			if (FBTrace.DBG_FIRETV_TABMANAGER) {
				FBTrace.sysout(tabmanager.CAT + "[unregisterListeners]", tabbedBrowser);
			}
			tabbedBrowser.removeTabsProgressListener(delegate, Ci.nsIWebProgress.NOTIFY_ALL);
			tabbedBrowser.tabContainer.removeEventListener("TabSelect", onTabSelect, false);
			tabbedBrowser.tabContainer.removeEventListener("TabClose", onTabClose, false);
		};

		tabmanager.init = function () {
			if (FBTrace.DBG_FIRETV_TABMANAGER) {
				FBTrace.sysout(tabmanager.CAT + "[init]");
			}
			
			if (FBTrace.DBG_FIRETV_TABMANAGER) {
				FBTrace.sysout(tabmanager.CAT + "[done]");
			}
		};

		tabmanager.shutdown = function () {
			if (FBTrace.DBG_FIRETV_TABMANAGER) {
				FBTrace.sysout(tabmanager.CAT + "[shutdown]");
			}

			if (FBTrace.DBG_FIRETV_TABMANAGER) {
				FBTrace.sysout(tabmanager.CAT + "[done]");
			}
		};
		
		this.TabManager = tabmanager;

	}).apply(getFireTVPluginInstance());
} catch (exc) {
	alert("[ftv-tabmanager.js] " + exc);
}
