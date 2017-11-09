/* See license.txt for terms of usage */
/*global window:false, alert, getFireTVPluginInstance, Components */
try {
	(function () {
		if (this.Messages) {
			return;
		}
		
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cr = Components.results;
		
		var _this = this;

		var FBTrace = this.FBTrace;
		
		var messages = {};

		messages.CAT = "[ftv.messages] ";

		var bundle = Cc["@mozilla.org/intl/stringbundle;1"].getService(
				Ci.nsIStringBundleService)
				.createBundle("chrome://firetv/locale/messages.properties");

		messages.getMessage = function (messageKey) {
			var value = messages.stringBundle[messageKey];
			if (FBTrace.DBG_FIRETV_MESSAGES) {
				FBTrace.sysout(messages.CAT + "[getMessage] key: " + messageKey + " -> " + value);
			}
			return value;
		};

		messages.stringBundle = {};
		
		messages.init = function () {
			if (FBTrace.DBG_FIRETV_MESSAGES) {
				FBTrace.sysout(messages.CAT + "[init]");
			}
			var enumeration = bundle.getSimpleEnumeration();
			var propertyElement;
			while (enumeration.hasMoreElements()) {
				propertyElement = enumeration.getNext().QueryInterface(Ci.nsIPropertyElement);
				if (propertyElement.key) {
					messages.stringBundle[propertyElement.key] = propertyElement.value;
				}
			}
			if (FBTrace.DBG_FIRETV_MESSAGES) {
				FBTrace.sysout(messages.CAT + "stringBundle: ", messages.stringBundle);
			}
			if (FBTrace.DBG_FIRETV_MESSAGES) {
				FBTrace.sysout(messages.CAT + "[done]");
			}
		};
		
		messages.shutdown = function () {
			if (FBTrace.DBG_FIRETV_MESSAGES) {
				FBTrace.sysout(messages.CAT + "[shutdown]");
			}
			if (FBTrace.DBG_FIRETV_MESSAGES) {
				FBTrace.sysout(messages.CAT + "[done]");
			}
		};
		
		this.Messages = messages;

	}).apply(getFireTVPluginInstance());

} catch (exc) {
	alert("[ftv-message.js] " + exc);
}
