/* See license.txt for terms of usage */
/*global window:false, alert, getFireTVPluginInstance, Components */
try {
	(function () {
		if (this.Config) {
			return;
		}
		
		
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cr = Components.results;
		
		const windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
		const prefService = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.firetv.");
		
		var _this = this;
		
		var FBTrace = this.FBTrace;
		
		var config = {};

		config.CAT = "[ftv.config] ";

		
		var isFireTVSupportActivableForCurrentTab = function (event) {
			var doc = event.target.ownerDocument;
			var tabbedBrowser = doc.defaultView.gBrowser;
			
			var url = tabbedBrowser.selectedBrowser.contentWindow.location;
			var activable = (_this.utils.managedProtocol(url) || (_this.utils.getScheme(url) === "dvb"));
			return activable;
		};
		
		var isFireTVSupportActivatedForCurrentTab = function (event) {
			var doc = event.target.ownerDocument;
			var tabbedBrowser = doc.defaultView.gBrowser;
			
			var url = tabbedBrowser.selectedBrowser.contentWindow.location;
			var activated = isFireTVSupportActivableForCurrentTab(event) && _this.utils.configuredHost(url);
			return activated;
		};
		
		config.toggleTraceConsoleAlwaysOpen = function (event) {
			event.preventDefault();
			event.stopPropagation();
			
			if (prefService.getBoolPref("alwaysOpenTraceConsole") === true) {
				prefService.setBoolPref("alwaysOpenTraceConsole", false);
			} else {
				prefService.setBoolPref("alwaysOpenTraceConsole", true);
			}
		};
		
		config.toggleDisableProfileCache = function (event) {
			event.preventDefault();
			event.stopPropagation();
			_this.PreferenceManager.setProfileCacheDisabled(!_this.PreferenceManager.isProfileCacheDisabled())
		};
		
		config.toggleFireTVSupport = function (event) {
			event.preventDefault();
			event.stopPropagation();
			
			var doc = event.target.ownerDocument;
			var tabbedBrowser = doc.defaultView.gBrowser;
			
			var firetvPanel = doc.getElementById("firetv-panel");

			if (!isFireTVSupportActivableForCurrentTab(event)) {
				event.preventDefault();
				return;
			}
			
			if (isFireTVSupportActivatedForCurrentTab(event)) {
				config.onRemoveHost(tabbedBrowser);
			} else {
				config.onAddHost(tabbedBrowser);
			}
			firetvPanel.hidePopup();
		};
		
		config.onAddHost = function (tabbedBrowser) {
			var location = tabbedBrowser.selectedBrowser.contentWindow.location;
			var scheme = _this.utils.getScheme(location);
			if (scheme === "file") {
				var aBrowser = tabbedBrowser.selectedBrowser;
				var aTab = _this.TabManager.getTabForBrowser(aBrowser);
				var tmpDVBRoot = location.href.substring(0, location.href.lastIndexOf("/"));
				var path = location.href.substring(location.href.lastIndexOf("/"));
				aTab.setAttribute("firetv-dvbroot", tmpDVBRoot);
				var newUri = "dvb://localfile.fire.tv" + path;
				if (FBTrace.DBG_FIRETV_CONFIG) {
					FBTrace.sysout(config.CAT + "[onAddHost] fireUrl=" + location.href);
					FBTrace.sysout(config.CAT + "[onAddHost] tmpDVBRoot=" + tmpDVBRoot + ", path=" + path);
					FBTrace.sysout(config.CAT + "[onAddHost] newUri=" + newUri);
				}
				_this.UI.reload();
				tabbedBrowser.selectedBrowser.contentWindow.location.href = newUri;
				return;
			}
			var host = tabbedBrowser.selectedBrowser.contentWindow.location.protocol + "//" + tabbedBrowser.selectedBrowser.contentWindow.location.host;
			var added = _this.PreferenceManager.addConfiguredHost(host);
			if (added) {
				_this.UI.reload();
				tabbedBrowser.selectedBrowser.contentWindow.location.reload(true);
			}
		};

		config.onRemoveHost = function (tabbedBrowser) {
			var host = tabbedBrowser.selectedBrowser.contentWindow.location.protocol + "//" + tabbedBrowser.selectedBrowser.contentWindow.location.host;

			var removed = _this.PreferenceManager.removeConfiguredHost(host);
			if (removed) {
				_this.UI.reload();
				var aBrowser = tabbedBrowser.selectedBrowser;
				var aTab = _this.TabManager.getTabForBrowser(aBrowser);
				if (aTab) {
					_this.TabManager.cleanTabInfos(aTab);
				}
				aBrowser.contentWindow.location.reload(true);
			}
		};
		
		config.chooseDVBRoot = function (event) {
			event.preventDefault();
			event.stopPropagation();
			if (FBTrace.DBG_FIRETV_CONFIG) {
				FBTrace.sysout(config.CAT + "[chooseDVBRoot]");
			}
			var oldRoot = _this.PreferenceManager.getGlobalDVBRoot();
			var newRoot = _this.FileUtils.chooseLocalDirectory((oldRoot) ? oldRoot.path : "", _this.Messages.getMessage("firetv.panel.dvbRootButton"));
			if (newRoot) {
				_this.PreferenceManager.setGlobalDVBRoot(newRoot);
			}
		};
		
		config.openDVBRoot = function (event) {
			event.preventDefault();
			event.stopPropagation();
			if (FBTrace.DBG_FIRETV_CONFIG) {
				FBTrace.sysout(config.CAT + "[openDVBRoot]");
			}
			var root = _this.PreferenceManager.getGlobalDVBRoot();
			// -- at this point root is either an existing nsIFile directory or null
			if (root) {
				root.launch();
			}
		};
		
		config.onChannelListCommand = function (event) {
			event.preventDefault();
			event.stopPropagation();
			var doc = event.target.ownerDocument;
			var tabbedBrowser = doc.defaultView.gBrowser;
			if (FBTrace.DBG_FIRETV_CONFIG) {
				FBTrace.sysout(config.CAT + "[onChannelListCommand]");
			}
			switch (event.target.id) {
			case "firetvDefaultChannelListRadio":
			case "firetvCustomChannelListRadio":
				config.selectChannelList(doc, event.target.id);
				break;
			case "firetvDefaultChannelListButton":
				tabbedBrowser.selectedTab = tabbedBrowser.addTab("view-source:chrome://firetv-channels/content/ChannelList-fr.xml");
				break;
			case "firetvCustomChannelListButton":
				tabbedBrowser.selectedTab = tabbedBrowser.addTab("view-source:firetv://xml/channels");
				break;

			default:
				break;
			}
			var firetvPanel = doc.getElementById("firetv-panel");
			firetvPanel.hidePopup();
		};
		
		config.selectChannelList = function (doc, radioButtonId) {
			var firetvCustomChannelListRadio = doc.getElementById("firetvCustomChannelListRadio");
			var firetvDefaultChannelListRadio = doc.getElementById("firetvDefaultChannelListRadio");
			if (radioButtonId === "firetvDefaultChannelListRadio") {
				firetvDefaultChannelListRadio.setAttribute("selected", true);
				_this.PreferenceManager.setCustomChannelListSelected(false);
			} else {
				firetvCustomChannelListRadio.setAttribute("selected", true);
				_this.PreferenceManager.setCustomChannelListSelected(true);
			}
			// -- reload profiles cache to take new selected channel into account;
			_this.ProfileManager.init();
		};
		
		config.chooseChannelList = function (event) {
			event.preventDefault();
			event.stopPropagation();
			if (FBTrace.DBG_FIRETV_CONFIG) {
				FBTrace.sysout(config.CAT + "[chooseChannelList]");
			}
			
			var channelListFile = _this.FileUtils.chooseLocalFile(_this.Messages.getMessage("firetv.channelList.dialogTitle"), Ci.nsIFilePicker.filterXML);
			if (FBTrace.DBG_FIRETV_CONFIG) {
				FBTrace.sysout(config.CAT + "[chooseChannelList] file: " + channelListFile);
			}
			if (channelListFile !== null) {
				// -- validate channel list
				try {
					_this.Broadcast.parseChannelList("file:///" + channelListFile.path.replace(/\\/g, "\/"));
				} catch (e) {
					window.alert(e);
					return;
				}
				// now a valid channel list
				var success = _this.FileUtils.deleteFile(_this.FileUtils.getUserChannelListFile());
				success = success && _this.FileUtils.copyFile(channelListFile.path, _this.FileUtils.getUserStorageDirectory().path, "channels");

				if (!success) {
					window.alert(_this.Messages.getMessage("firetv.channelList.unableToLoadFile"));
				}
			}
			// -- success, select custom channel list and reload broadcast
			var doc = event.target.ownerDocument;
			config.selectChannelList(doc, "firetvCustomChannelListRadio");
			_this.Broadcast.init();
		};
		
		
		config.onPopupShowing = function (event) {
			if (FBTrace.DBG_FIRETV_CONFIG) {
				FBTrace.sysout(config.CAT + "[onPopupShowing]");
			}
			var doc = event.target.ownerDocument;
			var tabbedBrowser = doc.defaultView.gBrowser;
			var bundle = doc.getElementById("firetv-strings");
			
			
			// -- firetv button
			var firetvButton = doc.getElementById("firetv-button");
			var firetvTitleLabel = doc.getElementById("firetvTitleLabel");
			firetvTitleLabel.setAttribute("value", firetvButton.getAttribute("tooltiptext"));
			
			// -- firetv trace console
			var traceConsoleAvailable = (_this.FBTrace.mock !== true);
			
			var firetvTraceConsoleOptions = doc.getElementById("firetvTraceConsoleOptions");
			var firetvTraceConsoleButton = doc.getElementById("firetvTraceConsoleButton");
			var firetvTraceConsoleAlwaysOpenCheckbox = doc.getElementById("firetvTraceConsoleAlwaysOpenCheckbox");
			var firetvDisableProfileCacheCheckbox = doc.getElementById("firetvDisableProfileCacheCheckbox");
			
			firetvTraceConsoleButton.setAttribute("label", bundle.getString("firetv.traceconsole.open"));
			firetvTraceConsoleAlwaysOpenCheckbox.setAttribute("label", bundle.getString("firetv.traceconsole.alwaysOpen"));
			firetvTraceConsoleAlwaysOpenCheckbox.setAttribute("checked", prefService.getBoolPref("alwaysOpenTraceConsole"));
			
			if (firetvDisableProfileCacheCheckbox) {
				firetvDisableProfileCacheCheckbox.setAttribute("checked", _this.PreferenceManager.isProfileCacheDisabled());
			}
			
			if (traceConsoleAvailable) {
				firetvTraceConsoleOptions.style.display = "inherit";
			} else {
				firetvTraceConsoleOptions.style.display = "none";
			}
			
			// -- firetv activation toggle button
			var location = tabbedBrowser.selectedBrowser.contentWindow.location;
			var scheme = _this.utils.getScheme(location);
			var host = "";
			if (scheme !== "dvb") {
				if (scheme === "file") {
					host = location.href.substring(0, location.href.lastIndexOf("/"));	
				} else {
					host = scheme + "://" + location.host;
				}
			}
			var firetvActivationToggleButtonLabel = doc.getElementById("firetvActivationToggleButtonLabel");
			var firetvActivationToggleButtonLocation = doc.getElementById("firetvActivationToggleButtonLocation");
			var activated = isFireTVSupportActivatedForCurrentTab(event);
			if (scheme === "dvb") {
				// support not removable
				firetvActivationToggleButtonLabel.style.display = "none";
				firetvActivationToggleButtonLocation.style.display = "none";
			} else {
				firetvActivationToggleButtonLabel.style.display = "inherit";
				firetvActivationToggleButtonLocation.style.display = "inherit";
			}
			
			if (activated) {
				firetvActivationToggleButtonLabel.setAttribute("value", bundle.getString("firetv.panel.activationToggleButtonDeactivate"));
			} else {
				firetvActivationToggleButtonLabel.setAttribute("value", bundle.getString("firetv.panel.activationToggleButtonActivate"));
			}
			firetvActivationToggleButtonLocation.setAttribute("label", host);
			
			// -- enable/disable all control regarding activation state
			var controls = doc.querySelectorAll("#firetv-panel radio, #firetv-panel button:not(#firetvActivationToggleButtonLocation):not(#firetvTraceConsoleButton):not(#firetvCleanupRestartFFButton)");
			var i;
			for (i = 0; i < controls.length; i++) {
				controls[i].setAttribute("disabled", !activated);
			}
			
			// -- DVB root config
			var currentDVBRoot = _this.PreferenceManager.getGlobalDVBRoot();
			
			var firetvDVBRootLabel = doc.getElementById("firetvDVBRootLabel");
			var firetvOpenDVBRootButton = doc.getElementById("firetvOpenDVBRootButton");
			var firetvDVBRootButton = doc.getElementById("firetvDVBRootButton");
			
			firetvDVBRootLabel.setAttribute("value", bundle.getString("firetv.panel.dvbRootLabel"));
			firetvDVBRootButton.setAttribute("label", bundle.getString("firetv.panel.dvbRootButton"));
			if (!currentDVBRoot) {
				firetvOpenDVBRootButton.setAttribute("label", bundle.getString("firetv.panel.dvbRootNoValue"));
				firetvOpenDVBRootButton.setAttribute("disabled", "true");
				firetvOpenDVBRootButton.removeAttribute("tooltiptext");
			} else {
				firetvOpenDVBRootButton.setAttribute("label", currentDVBRoot.path);
				firetvOpenDVBRootButton.setAttribute("disabled", !activated);
				firetvOpenDVBRootButton.setAttribute("tooltiptext", bundle.getString("firetv.panel.openDvbRootButtonTooltip"));
			}
			
			// -- Channel list config
			var firetvChannelListLabel = doc.getElementById("firetvChannelListLabel");
			var firetvDefaultChannelListButton = doc.getElementById("firetvDefaultChannelListButton");
			var firetvCustomChannelListButton = doc.getElementById("firetvCustomChannelListButton");
			var firetvCustomChannelListUploadButton = doc.getElementById("firetvCustomChannelListUploadButton");
			
			var firetvCustomChannelListRadio = doc.getElementById("firetvCustomChannelListRadio");
			var firetvDefaultChannelListRadio = doc.getElementById("firetvDefaultChannelListRadio");
			
			var firetvChannelListSwitchNeedReload = doc.getElementById("firetvChannelListSwitchNeedReload");
			
			firetvChannelListLabel.setAttribute("value", bundle.getString("firetv.panel.channelListLabel"));
			firetvChannelListSwitchNeedReload.setAttribute("value", bundle.getString("firetv.panel.channelListChangeNeedsReload"));
			if (activated) {
				firetvChannelListSwitchNeedReload.style.display = "inherit";
			} else {
				firetvChannelListSwitchNeedReload.style.display = "none";
			}
			
			firetvDefaultChannelListButton.setAttribute("label", bundle.getString("firetv.panel.channelListDefault"));
			firetvDefaultChannelListButton.setAttribute("tooltiptext", bundle.getString("firetv.panel.channelListViewTooltip"));
			
			var userChannelListFileExists = _this.FileUtils.userChannelListFileExists();
			if (userChannelListFileExists) {
				firetvCustomChannelListButton.setAttribute("label", bundle.getString("firetv.panel.channelListCustom"));
				firetvCustomChannelListButton.setAttribute("tooltiptext", bundle.getString("firetv.panel.channelListViewTooltip"));
			} else {
				firetvCustomChannelListButton.setAttribute("label", bundle.getString("firetv.panel.channelListCustomNoValue"));
				firetvCustomChannelListButton.setAttribute("disabled", !userChannelListFileExists || !activated);
				firetvCustomChannelListButton.removeAttribute("tooltiptext");				
			}
			
			firetvCustomChannelListRadio.setAttribute("disabled", !userChannelListFileExists || !activated);
			var customChannelListSelected = _this.PreferenceManager.customChannelListSelected();
			firetvDefaultChannelListRadio.setAttribute("selected", !customChannelListSelected);
			firetvCustomChannelListRadio.setAttribute("selected", customChannelListSelected);
			
			firetvCustomChannelListUploadButton.setAttribute("label", bundle.getString("firetv.panel.channelListCustomUpload"));
			
			
		};

		this.Config = config;

	}).apply(getFireTVPluginInstance());

} catch (exc) {
	alert("[ftv-config.js] " + exc);
}
