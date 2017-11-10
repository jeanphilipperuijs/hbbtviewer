/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
(function (global) {
	global.debug = function (text) {
		if (typeof global.console !== "undefined" && typeof global.console.log === "function") {
			if (/^\[error\]/i.test(text) && typeof global.console.error === "function") {
				global.console.error(text);
				return;
			} else if (/^\[warn\]/i.test(text) && typeof global.console.info === "function") {
				global.console.warn(text);
				return;
			} else if (/^\[info\]/i.test(text) && typeof global.console.info === "function") {
				global.console.info(text);
				return;
			}
			global.console.log(text);
		}
	};
})(window);
