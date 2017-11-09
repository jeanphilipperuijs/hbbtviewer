/* See license.txt for terms of usage */
/*global window:false, alert, getFireTVPluginInstance, Components */
try {
	(function () {
		if (this.Constants) {
			return;
		}

		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cr = Components.results;
		const Cu = Components.utils;
		
		Cu.import("resource://gre/modules/AddonManager.jsm");
		
		var _this = this;
		
		var FBTrace = this.FBTrace;
		
		var constants = {};

		constants.HTML_ELEMENTS = [
			"HTMLAnchorElement",
			"HTMLAppletElement",
			"HTMLAreaElement",
			"HTMLBaseElement",
			"HTMLBaseFontElement",
			"HTMLBodyElement",
			"HTMLBRElement",
			"HTMLButtonElement",
			"HTMLDirectoryElement",
			"HTMLDivElement",
			"HTMLDListElement",
			"HTMLFieldSetElement",
			"HTMLFontElement",
			"HTMLFormElement",
			"HTMLFrameElement",
			"HTMLFrameSetElement",
			"HTMLHeadElement",
			"HTMLHeadingElement",
			"HTMLHRElement",
			"HTMLHtmlElement",
			"HTMLIFrameElement",
			"HTMLImageElement",
			"HTMLInputElement",
			"HTMLIsIndexElement",
			"HTMLLabelElement",
			"HTMLLegendElement",
			"HTMLLIElement",
			"HTMLLinkElement",
			"HTMLMapElement",
			"HTMLMenuElement",
			"HTMLMetaElement",
			"HTMLModElement",
			"HTMLOListElement",
			"HTMLOptGroupElement",
			"HTMLOptionElement",
			"HTMLParagraphElement",
			"HTMLParamElement",
			"HTMLPreElement",
			"HTMLQuoteElement",
			"HTMLScriptElement",
			"HTMLSelectElement",
			"HTMLStyleElement",
			"HTMLTableCaptionElement",
			"HTMLTableCellElement",
			"HTMLTableColElement",
			"HTMLTableElement",
			"HTMLTableRowElement",
			"HTMLTableSectionElement",
			"HTMLTextAreaElement",
			"HTMLTitleElement",
			"HTMLUListElement",
			"HTMLUnknownElement" 
		];
		
		constants.AV_MIME_TYPES = [ "video/mp4", "video/mpeg", "video/mpeg4", "application/dash+xml", "audio/mp3", "audio/mpeg", "audio/mp4" ];
		
		constants.USERAGENT_SUFFIX = "firetv-firefox-plugin";
		
		constants.EXTENSION_ID = "dlfr-firetv-plugin@atosorigin.com"; 
		
		constants.VERSION = "";

		AddonManager.getAddonByID(constants.EXTENSION_ID, function(addon) {
			constants.VERSION = addon.version;
		});
		
		this.Constants = constants;

	}).apply(getFireTVPluginInstance());

} catch (exc) {
	alert("[ftv-constants.js] " + exc);
}
