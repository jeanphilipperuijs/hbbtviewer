/* See license.txt for terms of usage */

(function() {
	var extensionName = "firetv";

	const Cc = Components.classes;
	const Ci = Components.interfaces;
	
	var windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);

	var FBTrace = {};
	var enumerator = windowManager.getEnumerator(null);
	while (enumerator.hasMoreElements()) {
		var win = enumerator.getNext();
		if (win.FireTVPlugin) {
			FBTrace = win.FireTVPlugin.FBTrace;
		}
	}
	
	var CAT = "[ftv-firebug] ";
	
	if (!Firebug || !Firebug.getModuleLoaderConfig || !Firebug.require) {
		if (FBTrace.DBG_FIRETV_FIREBUG) {
			FBTrace.sysout(CAT + "[initialize][ERROR] Firebug Overlay; 'chrome://firebug/content/moduleConfig.js' must be included!");
		}
		return;
	}

	var config = Firebug.getModuleLoaderConfig();
	config.paths[extensionName] = "firetv/content/firetv";

	Firebug.require(config, [ extensionName + "/ftv-firebug", ], function(Extension) {
		try {
			Extension.initialize();
		} catch (err) {
			if (FBTrace.DBG_ERRORS) {
				FBTrace.sysout("Firebug Overlay; ERROR " + err);
			}
		}
	});

	return {};
})();
