/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
(function (global) {
	global.Navigator.prototype.__defineGetter__("userAgent", function () {
		var ua = FireTVPlugin.profileDefinition.computedUserAgent;
		if (FireTVPlugin.bridge.isUserAgentSuffixEnabled()) {
			ua += " " + FireTVPlugin.constants.USERAGENT_SUFFIX + " " + FireTVPlugin.constants.VERSION; 
		}
		return ua;
	});
})(window);
