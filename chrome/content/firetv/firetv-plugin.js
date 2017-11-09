/* See license.txt for terms of usage */

try {
	(function() {
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cr = Components.results;
		
		var _this = this;
		
		var FBTrace = this.FBTrace;

		var CAT = "[firetv-plugin] ";

		var prefPluginsService = Cc["@mozilla.org/preferences-service;1"].getService(
				Ci.nsIPrefService).getBranch("plugins.");
		
		var observerService = Cc["@mozilla.org/observer-service;1"]
				.getService(Ci.nsIObserverService);

		var windowsRestoredObserver = {
			observe : function(aSubject, aTopic, aData) {
				if (aTopic == "sessionstore-windows-restored") {
					var gBrowser = document.getElementById("content");
					var browser = gBrowser.getBrowserForTab(gBrowser.selectedTab);
					_this.TabManager.focusedTab = gBrowser.selectedTab;
					observerService.removeObserver(windowsRestoredObserver, "sessionstore-windows-restored");
				}
			},
			QueryInterface : function(aIID) {
				if (aIID.equals(Ci.nsIObserver) || aIID.equals(Ci.nsISupports)) {
					return this;
				}
				throw Ci.NS_NOINTERFACE;
			}

		}

		this.init = function(event) {
			
			if (_this.initialized === true) {
				// -- just register tab manager listener and increment window count 
				_this.windowCount++;
				_this.TabManager.registerListeners(event.target.getElementById("content"));
				return;
			}
			if (FBTrace.DBG_FIRETV) {
				FBTrace.sysout(CAT + "[init]");
			}
			_this.Messages.init();
			_this.Broadcast.init();
			_this.PreferenceManager.init();
			
			_this.DBG = _this.PreferenceManager.isDebugEnabled();
			
			_this.TabManager.init();
			_this.ProfileManager.init();
			
			_this.Bridge.init();
			_this.HttpMonitor.init();
			_this.UI.init();
			_this.SVG.init();
			
			_this.windowCount = 1;
			

			
			_this.ORIGINAL_MISSING_PLUGIN_PREF = null;
			try {
				// -- https://bugzilla.mozilla.org/show_bug.cgi?id=839206 : hide_infobar_for_missing_plugin no more exists 
				_this.ORIGINAL_MISSING_PLUGIN_PREF = prefPluginsService.getBoolPref("hide_infobar_for_missing_plugin");
				prefPluginsService.setBoolPref("hide_infobar_for_missing_plugin", true);
			} catch (e) {
			}
			
			observerService.addObserver(windowsRestoredObserver, "sessionstore-windows-restored", false);

			_this.TabManager.registerListeners(event.target.getElementById("content"));
			
			if (FBTrace.DBG_FIRETV) {
				FBTrace.sysout(CAT + "[done] ");
			}

			_this.initialized = true;

		};

		this.shutdown = function(event) {
			_this.windowCount--;
			if ( _this.windowCount>0) {
				// -- just unregister tab manager listener and increment window count
				_this.TabManager.unregisterListeners(event.target.getElementById("content"));
				return;
			}
			
			// -- last window, relaly shutdown
			if (FBTrace.DBG_FIRETV) {
				FBTrace.sysout(CAT + "[shutdown] ");
			}
			_this.Messages.shutdown();
			_this.Broadcast.shutdown();
			_this.PreferenceManager.shutdown();
			_this.TabManager.shutdown();
			_this.Bridge.shutdown();
			_this.HttpMonitor.shutdown();
			_this.ProfileManager.shutdown();
			_this.UI.shutdown();
			_this.SVG.shutdown();

			
			if (_this.ORIGINAL_MISSING_PLUGIN_PREF !== null) {
				prefPluginsService.setBoolPref("hide_infobar_for_missing_plugin", _this.ORIGINAL_MISSING_PLUGIN_PREF);
			}
			
			if (FBTrace.DBG_FIRETV) {
				FBTrace.sysout(CAT + "[done] ");
			}

		};
		

	}).apply(getFireTVPluginInstance());

} catch (exc) {
	alert("[firetv-plugin.js] " + exc);
}

window.addEventListener("load", getFireTVPluginInstance().init, false);
window.addEventListener("unload", getFireTVPluginInstance().shutdown, false);
