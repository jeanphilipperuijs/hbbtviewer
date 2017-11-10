/* See license.txt for terms of usage */
/*global window:false, alert, getFireTVPluginInstance, Components */
try {
	(function () {
		if (this.ProfileManager) {
			return;
		}
		
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cr = Components.results;
		
		var _this = this;
		
		var FBTrace = this.FBTrace;

		var profilemanager = {};

		profilemanager.CAT = "[ftv.profilemanager] ";

		var profileDefinitions = {};

		profilemanager.profileDefinitions = profileDefinitions;

		var profileBootstraps = {};

		var globalFontCache = {};

		profilemanager.getProfileDefinition = function (profileName) {
			return profileDefinitions[profileName];
		};

		profilemanager.getProfileBootstrap = function (profileName) {
			if (_this.PreferenceManager.isProfileCacheDisabled()) {
				profilemanager.init();
			}
			return profileBootstraps[profileName];
		};

		var initAvailableProfiles = function () {
			profilemanager.profilesNames = [];
			var profilesDir = _this.FileUtils.getExtensionStorageDirectory();
			profilesDir.append("chrome");
			profilesDir.append("profiles");
			if (FBTrace.DBG_FIRETV_PROFILEMANAGER) {
				FBTrace.sysout(profilemanager.CAT + "[initAvailableProfiles] profiles dir: " + profilesDir.path);
			}

			var entries = profilesDir.directoryEntries;
			var entry;
			var profileName;
			while (entries.hasMoreElements()) {
				entry = entries.getNext();
				entry.QueryInterface(Ci.nsIFile);
				profileName = entry.leafName;
				entry.append("definition.json");
				if (entry.exists() && entry.isFile()) {
					profilemanager.profilesNames.push(profileName);
					if (FBTrace.DBG_FIRETV_PROFILEMANAGER) {
						FBTrace.sysout(profilemanager.CAT + "[initAvailableProfiles] profile found : " + profileName);
					}
				}
			}
		};

		profilemanager.init = function () {
			if (FBTrace.DBG_FIRETV_PROFILEMANAGER) {
				FBTrace.sysout(profilemanager.CAT + "[init]");
			}
			
			initAvailableProfiles();
			profileBootstraps = {};
			var i, j, profileName, bootstrapScripts, bootstrapScriptContext, bootstrap, file, fontDefs, fontSrc, key, value, 
				cssReplacements, cssOverloads, origCssOverloads, overload, globalReplace;

			for (i = 0; i < profilemanager.profilesNames.length; i++) {
				profileName = profilemanager.profilesNames[i];
				if (FBTrace.DBG_FIRETV_PROFILEMANAGER) {
					FBTrace.sysout(profilemanager.CAT + "-> Initializing profile '" + profileName + "'");
				}
				try {
					profileDefinitions[profileName] = JSON.parse(_this.FileUtils
							.getResourceAsString("chrome://firetv-profile/content/" + profileName + "/definition.json"));
					profileDefinitions[profileName].name = profileName;
	
					// ---- fonts
					fontDefs = (profileDefinitions[profileName].fonts && profileDefinitions[profileName].fonts.definitions) ? profileDefinitions[profileName].fonts.definitions
							: [];
					for (j = fontDefs.length - 1; j >= 0; j--) {
						if (fontDefs[j].src) {
							fontSrc = fontDefs[j].src;
							if (!globalFontCache[fontSrc]) {
								try {
									globalFontCache[fontSrc] = "url(" + _this.FileUtils.getResourceAsDataURI(fontSrc, "application/x-font") + ")";
								} catch (e) {
									if (FBTrace.DBG_FIRETV_PROFILEMANAGER || FBTrace.DBG_FIRETV_ERROR) {
										FBTrace.sysout(profilemanager.CAT + "-> [ERROR] Font not found in the package : " + fontSrc);
									}
								}
							}
							if (globalFontCache[fontSrc]) {
								// -- embedded font
								fontDefs[j].src = globalFontCache[fontSrc];
							} else {
								// -- font is not found in the package, ignores it!
								fontDefs.splice(j, 1);
							}
						}
					}
	
					// -- globalReplace
					profileDefinitions[profileName].globalReplace = (profileDefinitions[profileName].globalReplace) ? profileDefinitions[profileName].globalReplace : [];
					
					// ---- css overloads
					origCssOverloads = (profileDefinitions[profileName].cssOverloads) ? profileDefinitions[profileName].cssOverloads
							: {};
					cssOverloads = {};
					for (overload in origCssOverloads) {
						if (origCssOverloads.hasOwnProperty(overload)) {
							if (origCssOverloads[overload].property) {
								cssOverloads[origCssOverloads[overload].property] = {
									"property" : origCssOverloads[overload].property
								};
								if (origCssOverloads[overload].propertyValues) {
									cssOverloads[origCssOverloads[overload].property].propertyValues = origCssOverloads[overload].propertyValues;
								}
							} else if (origCssOverloads[overload].properties) {
								for (j = 0; j < origCssOverloads[overload].properties.length; j++) {
									cssOverloads[origCssOverloads[overload].properties[j]] = {
										"property" : origCssOverloads[overload].properties[j]
									};
									if (origCssOverloads[overload].propertyValues) {
										cssOverloads[origCssOverloads[overload].properties[j]].propertyValues = origCssOverloads[overload].propertyValues;
									}
								}
							}
						}
					}
					profileDefinitions[profileName].cssOverloads = cssOverloads;
					
					// ---- css replacements
					cssReplacements = (profileDefinitions[profileName].cssReplacements) ? profileDefinitions[profileName].cssReplacements
							: [];
					profileDefinitions[profileName].cssReplacements = cssReplacements;
					
					bootstrapScripts = (profileDefinitions[profileName].scripts) ? profileDefinitions[profileName].scripts
							: [];
					
					bootstrapScriptContext = (profileDefinitions[profileName].bootstrapScriptContext) ? profileDefinitions[profileName].bootstrapScriptContext
							: [];
					
					bootstrap = "// --------------------------------------------------\n";
					bootstrap += "//            BOOTSTRAP FOR : '" + profileName + "'\n";
					bootstrap += "// --------------------------------------------------\n";
	
					bootstrap += "FireTVPlugin = (FireTVPlugin.wrappedJSObject) ? FireTVPlugin.wrappedJSObject : FireTVPlugin;\n";
					
					
					bootstrap += "// ------> FireTVPlugin\n";
					bootstrap += "FireTVPlugin.profileDefinition = " + profileDefinitions[profileName].toSource() + ";\n";
					
					// -- make lastStyleAccessOnNode not directly visible
					bootstrap += "Object.defineProperty(FireTVPlugin, \"lastStyleAccessOnNode\", {\n";
					bootstrap += "	value : null,\n";
					bootstrap += "	writable : true,\n";
					bootstrap += "	enumerable : false, \n";
					bootstrap += "	configurable : true\n";
					bootstrap += "});\n";
					
					bootstrap += "// ------> Object helper\n";
					bootstrap += _this.FileUtils
							.getResourceAsString("chrome://firetv-profile/content/common/object-helper.js");
					bootstrap += "\n\n";
					
					bootstrap += "// ------> Universal Remote\n";
					bootstrap += _this.FileUtils
							.getResourceAsString("chrome://firetv-profile/content/common/universal-remote.js");
					bootstrap += "\n\n";
	
					bootstrap += "// ------> Broadcast Player\n";
					bootstrap += _this.FileUtils
					.getResourceAsString("chrome://firetv-profile/content/common/tvplayer/broadcast-player-object.js");
					bootstrap += _this.FileUtils
					.getResourceAsString("chrome://firetv-profile/content/common/tvplayer/broadcast-player-svg.js");
					bootstrap += _this.FileUtils
					.getResourceAsString("chrome://firetv-profile/content/common/tvplayer/broadcast-player-html.js");
					bootstrap += _this.FileUtils
					.getResourceAsString("chrome://firetv-profile/content/common/tvplayer/broadcast-player-vlc.js");
					bootstrap += _this.FileUtils
							.getResourceAsString("chrome://firetv-profile/content/common/tvplayer/broadcast-player-proxy.js");
					bootstrap += "\n\n";
					
					bootstrap += "// ------> A/V Player\n";
					bootstrap += _this.FileUtils
					.getResourceAsString("chrome://firetv-profile/content/common/mediaplayer/av-player-svg.js");
					bootstrap += _this.FileUtils
					.getResourceAsString("chrome://firetv-profile/content/common/mediaplayer/av-player-html.js");
					bootstrap += _this.FileUtils
					.getResourceAsString("chrome://firetv-profile/content/common/mediaplayer/av-player-vlc.js");
					bootstrap += _this.FileUtils
							.getResourceAsString("chrome://firetv-profile/content/common/mediaplayer/av-player-proxy.js");
					bootstrap += "\n\n";
	
					bootstrap += "// ------> Useragent\n";
					bootstrap += "Object.defineProperty(FireTVPlugin.profileDefinition, \"computedUserAgent\", {\n";
					bootstrap += "	get : function computedUserAgent() {\n";
					bootstrap += "	   return (FireTVPlugin.bridge.getOverriddenUserAgent()) ? FireTVPlugin.bridge.getOverriddenUserAgent() : FireTVPlugin.profileDefinition.userAgent;\n";
					bootstrap += "	},\n";
					bootstrap += "	enumerable : true, \n";
					bootstrap += "	configurable : true\n";
					bootstrap += "});\n";
					bootstrap += _this.FileUtils
							.getResourceAsString("chrome://firetv-profile/content/common/user-agent.js");
					bootstrap += "\n\n";
					
					
					bootstrap += "// -------------------------> BOOTSTRAP SCRIPTS\n";
					bootstrap += "(function (){ \n";
					bootstrap += "   var bootstrapScriptContext = {};\n";
					
					for (j = 0; j < bootstrapScriptContext.length; j++) {
						file = profileName + "/" + bootstrapScriptContext[j].file;
						bootstrap += "   bootstrapScriptContext[\"" + bootstrapScriptContext[j].id + "\"] = "  + (_this.FileUtils.getResourceAsString("chrome://firetv-profile/content/" + file)).toSource() + ";\n";
					}
					bootstrap += "\n\n";
					
					for (j = 0; j < bootstrapScripts.length; j++) {
						file = profileName + "/" + bootstrapScripts[j];
						bootstrap += "// ------> " + file + "\n";
						bootstrap += _this.FileUtils.getResourceAsString("chrome://firetv-profile/content/" + file);
						bootstrap += "\n\n";
					}
					bootstrap += "})();\n";
					
					if (profileDefinitions[profileName].remote) {
						file = profileName + "/" + profileDefinitions[profileName].remote;
						bootstrap += "// ------> Profile Remote\n";
						bootstrap += _this.FileUtils.getResourceAsString("chrome://firetv-profile/content/" + file);
						bootstrap += "\n\n";
					}
	
					bootstrap += "// ------> Font Loader\n";
					bootstrap += _this.FileUtils
							.getResourceAsString("chrome://firetv-profile/content/common/font-loader.js");
					bootstrap += "\n\n";
	
					bootstrap += "// ------> Window\n";
					bootstrap += _this.FileUtils
							.getResourceAsString("chrome://firetv-profile/content/common/window.js");
					bootstrap += "\n\n";
	
					bootstrap += "// ------> Extended CSS Engine\n\n";
					cssOverloads = (profileDefinitions[profileName].cssOverloads) ? profileDefinitions[profileName].cssOverloads
							: {};
					for (overload in origCssOverloads) {
						if (origCssOverloads.hasOwnProperty(overload)) {
							bootstrap += "//       hook :  " + origCssOverloads[overload].hook + "\n";
							bootstrap += _this.FileUtils.getResourceAsString("chrome://firetv-profile/content/common/css/hooks/" + origCssOverloads[overload].hook);
						}
					}
					
					bootstrap += _this.FileUtils
							.getResourceAsString("chrome://firetv-profile/content/common/css/extended-css.js");
					bootstrap += "\n\n";
	
					bootstrap += "// -----------BOOTSTRAP END--------------------------\n";
					if (FBTrace.DBG_FIRETV_PROFILEMANAGER) {
						FBTrace.sysout(profilemanager.CAT + "-> Profile bootstrap for '" + profileName + "'", bootstrap);
					}
					profileBootstraps[profileName] = bootstrap;
				} catch (e2) {
					if (FBTrace.DBG_FIRETV_PROFILEMANAGER || FBTrace.DBG_FIRETV_ERROR) {
						FBTrace.sysout(profilemanager.CAT + "ERROR while initializing profile bootstrap for '" + profileName + "'", e2);
					}
				}

			}

			if (FBTrace.DBG_FIRETV_PROFILEMANAGER) {
				FBTrace.sysout(profilemanager.CAT + "[done]");
			}
		};

		profilemanager.shutdown = function () {
			if (FBTrace.DBG_FIRETV_PROFILEMANAGER) {
				FBTrace.sysout(profilemanager.CAT + "[shutdown]");
			}

			if (FBTrace.DBG_FIRETV_PROFILEMANAGER) {
				FBTrace.sysout(profilemanager.CAT + "[done]");
			}

		};

		this.ProfileManager = profilemanager;

	}).apply(getFireTVPluginInstance());
} catch (exc) {
	alert("[ftv-profiles.js] " + exc);
}
