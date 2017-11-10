/* See license.txt for terms of usage */

if (typeof FireTVPlugin != "undefined") {

	Components.utils.import("resource://gre/modules/AddonManager.jsm");

	FireTVPlugin.onFirefoxLoad = function(event) {

		var id = "dlfr-firetv-plugin@atosorigin.com";
		var bundle = document.getElementById("firetv-strings");
		
		AddonManager.getAddonByID(FireTVPlugin.Constants.EXTENSION_ID, function(addon) {
			var tooltip = window.document.getElementById("firetv-button");
			tooltip.setAttribute("tooltiptext", 
					bundle.getString("extensions." + FireTVPlugin.Constants.EXTENSION_ID + ".description") 
					+ " v" + addon.version);
		});
	};
	window.addEventListener("load", FireTVPlugin.onFirefoxLoad, false);
}
