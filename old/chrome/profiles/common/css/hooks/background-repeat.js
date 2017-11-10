/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
// -- available functions :
//       -> this.nodeToString(node)
//       -> this.getComputedCustomCSSValue(node, property)
(function (global) {
	if (!FireTVPlugin.customCSSHooks) {
		FireTVPlugin.customCSSHooks = {};
	}
	FireTVPlugin.customCSSHooks["background-repeat"] = {
		"property" : "background-repeat",
		"propertyValues" : [ "nine-cut" ],
		"listenTo" : [ "background-repeat" ],
		"callback" : function (node, property, triggeredBy) {
			var val = this.getComputedCustomCSSValue(node, property);
			if (FireTVPlugin.customCSSHooks["background-repeat"].propertyValues.indexOf(val) > -1) {
				node.setAttribute("firetv-" + property, val);
			} else {
				node.removeAttribute("firetv-" + property);
			}
		}
	};
})(window);
