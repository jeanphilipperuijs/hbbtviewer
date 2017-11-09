/* See license.txt for terms of usage */
/*global FireTVPlugin:false */
(function (global) {
	var cssNode = document.createElement('style');
	cssNode.type = 'text/css';
	cssNode.rel = 'stylesheet';
	cssNode.title = 'firetv-fonts';
	cssNode.firebugIgnore = !global.FireTVPlugin.DBG;
	
	var head = document.getElementsByTagName("head")[0];
	if (head.firstChild) {
		head.insertBefore(cssNode, head.firstChild);
	} else {
		head.appendChild(cssNode);
	}
	
	var stylesheet, i;
	for (i = 0; i < document.styleSheets.length; i++) {
		if (document.styleSheets[i].title === "firetv-fonts") {
			stylesheet = document.styleSheets[i];
		}
	}

	var fontDefs = (FireTVPlugin.profileDefinition.fonts && FireTVPlugin.profileDefinition.fonts.definitions) ? FireTVPlugin.profileDefinition.fonts.definitions
			: [];
	var rule, key, value;
	for (i = 0; i < fontDefs.length; i++) {
		rule = "@font-face {";
		for (key in fontDefs[i]) {
			if (fontDefs[i].hasOwnProperty(key)) {
				value = fontDefs[i][key];
				if (/\s/.test(value)) {
					value = '"' + value + '"';
				}
				rule += (key + ": " + value + "; ");
			}
		}
		rule += "}";
		stylesheet.insertRule(rule, stylesheet.cssRules.length);
	}
})(window);
