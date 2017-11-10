/* See license.txt for terms of usage */
/*global window:false, alert, getFireTVPluginInstance, Components */
try {
	(function () {
		if (this.PreferenceManager) {
			return;
		}
		
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cr = Components.results;
		
		var _this = this;
		
		var FBTrace = this.FBTrace;

		var prefService = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.firetv.");

		var manager = {};

		manager.CAT = "[ftv.preferences] ";
		
		manager.isDebugEnabled = function () {
			return prefService.getBoolPref("debug");
		};
		
		manager.isHbbtvStrict = function () {
			return prefService.getBoolPref("hbbtvStrict");
		};
		
		manager.isProfileCacheDisabled = function () {
			return prefService.getBoolPref("profileCacheDisabled");
		};
		
		manager.isUserAgentSuffixEnabled = function () {
			return prefService.getBoolPref("userAgentSuffixEnabled");
		};
		
		manager.setUserAgentSuffixEnabled = function (enable) {
			return prefService.setBoolPref("userAgentSuffixEnabled", enable);
		};
	
		manager.setProfileCacheDisabled = function (disabled) {
			prefService.setBoolPref("profileCacheDisabled", disabled);
		};
		
		manager.getGlobalMarginDisplay = function () {
			return prefService.getBoolPref("marginDisplay");
		};
		
		manager.getDefaultMediaPlayer = function () {
			return prefService.getCharPref("defaultMediaPlayer");
		};
		
		manager.getOverriddenUserAgent = function (profile) {
			var pref = profile + "_userAgent";
			if (prefService.getPrefType(pref)) {
				return prefService.getCharPref(pref);
			}
		};
		
		manager.setOverriddenUserAgent = function (profile, userAgent) {
			if (!userAgent) {
				prefService.clearUserPref(profile + "_userAgent");
			} else {
				prefService.setCharPref(profile + "_userAgent", userAgent);
			}
		};

		manager.getGlobalDVBRoot = function () {
			var root = prefService.getCharPref("dvbRoot");
			try {
				var dvbRoot = Cc["@mozilla.org/file/local;1"]
						.createInstance(Ci.nsIFile);
				dvbRoot.initWithPath(root);
				if (dvbRoot.exists() && dvbRoot.isDirectory()) {
					return dvbRoot;
				}
			} catch (e) {
			}
			return null;
		};
		
		manager.setGlobalDVBRoot = function (dvbRoot) {
			prefService.setCharPref("dvbRoot", dvbRoot.path);
		};

		manager.customChannelListSelected = function () {
			return prefService.getBoolPref("customChannelListSelected") && _this.FileUtils.userChannelListFileExists();
		};
		
		manager.setCustomChannelListSelected = function (selected) {
			prefService.setBoolPref("customChannelListSelected", selected);
		};
		
		manager.getDefaultProfile = function () {
			var hbbtvProfileIndex = _this.ProfileManager.profilesNames.indexOf("hbbtv");
			hbbtvProfileIndex = (hbbtvProfileIndex != -1) ? hbbtvProfileIndex : 0;
			return _this.ProfileManager.profilesNames[hbbtvProfileIndex];
		};

		manager.getCustomStreamUrlForCcid = function (ccid) {
			var prefsString = prefService.getCharPref("customStreams");
			var prefs = JSON.parse(prefsString);
			if (prefs[ccid] && prefs[ccid].trim() !== "") {
				return prefs[ccid].trim();
			}
			return null;
		};
		
		manager.setCustomStreamUrlForCcid = function (ccid, streamUrl) {
			var prefsString = prefService.getCharPref("customStreams");
			var prefs = JSON.parse(prefsString);
			if (!streamUrl || streamUrl.trim() === "") {
				delete prefs[ccid];
			} else {
				prefs[ccid] = streamUrl.trim();
			}
			prefsString = JSON.stringify(prefs);
			prefService.setCharPref("customStreams", prefsString);
		};
		
		manager.getHostRelatedPref = function (host, pref) {
			if (/^dvb:\//.test(host)) {
				host = "dvb:/";
			}
			var prefsString = prefService.getCharPref("hostsPrefs");
			var prefs = JSON.parse(prefsString);
			if (prefs[host] && prefs[host][pref]) {
				return prefs[host][pref];
			}
			return null;
		};

		manager.getAllHostRelatedPrefs = function (host) {
			if (/^dvb:\//.test(host)) {
				host = "dvb:/";
			}
			var res = [];
			var prefsString = prefService.getCharPref("hostsPrefs");
			var prefs = JSON.parse(prefsString);
			var pref;
			if (prefs[host]) {
				for (pref in prefs[host]) {
					if (prefs[host].hasOwnProperty(pref)) {
						res.push({
							"pref" : pref,
							"value" : prefs[host][pref]
						});
					}
				}
			}
			return res;
		};

		manager.setHostRelatedPref = function (host, pref, value) {
			if (/^dvb:\//.test(host)) {
				host = "dvb:/";
			}
			var prefsString = prefService.getCharPref("hostsPrefs");
			var prefs = JSON.parse(prefsString);
			if (!prefs[host]) {
				prefs[host] = {};
			}
			prefs[host][pref] = value;
			prefsString = JSON.stringify(prefs);
			prefService.setCharPref("hostsPrefs", prefsString);
		};

		manager.addConfiguredHost = function (host) {
			if (/^dvb:\//.test(host)) {
				host = "dvb:/";
			}
			var prefsString = prefService.getCharPref("hostsPrefs");
			var prefs = JSON.parse(prefsString);
			if (!prefs[host]) {
				prefs[host] = {};
				prefsString = JSON.stringify(prefs);
				prefService.setCharPref("hostsPrefs", prefsString);
				return true;
			}
			return false;
		};

		manager.removeConfiguredHost = function (host) {
			if (/^dvb:\//.test(host)) {
				return false;
			}
			var prefsString = prefService.getCharPref("hostsPrefs");
			var prefs = JSON.parse(prefsString);
			if (prefs[host]) {
				delete prefs[host];
				prefsString = JSON.stringify(prefs);
				prefService.setCharPref("hostsPrefs", prefsString);
				return true;
			}
			return false;
		};

		manager.getConfiguredHosts = function () {
			var hosts = [];
			var host;
			var prefsString = prefService.getCharPref("hostsPrefs");
			var prefs = JSON.parse(prefsString);
			var dvbVirtualHostDetected = false;
			for (host in prefs) {
				if (prefs.hasOwnProperty(host)) {
					if (host === "dvb:/") {
						dvbVirtualHostDetected = true;
					}
					hosts.push(host);
				}
			}
			if (!dvbVirtualHostDetected) {
				hosts.push("dvb:/");
			}
			return hosts;
		};

		manager.isConfiguredHost = function (host) {
			if (/^dvb:\//.test(host)) {
				host = "dvb:/";
			}
			var prefsString = prefService.getCharPref("hostsPrefs");
			var prefs = JSON.parse(prefsString);
			return (prefs[host]) ? true : false;
		};
		
		manager.init = function () {
			if (FBTrace.DBG_FIRETV_PREFERENCES) {
				FBTrace.sysout(manager.CAT + "[init]");
			}
			
			if (FBTrace.DBG_FIRETV_PREFERENCES) {
				FBTrace.sysout(manager.CAT + "[done]");
			}
		};

		manager.shutdown = function () {
			if (FBTrace.DBG_FIRETV_PREFERENCES) {
				FBTrace.sysout(manager.CAT + "[shutdown]");
			}
		
			if (FBTrace.DBG_FIRETV_PREFERENCES) {
				FBTrace.sysout(manager.CAT + "[done]");
			}
		};

		this.PreferenceManager = manager;

	}).apply(getFireTVPluginInstance());

} catch (exc) {
	alert("[ftv-preferences.js] " + exc);
}
