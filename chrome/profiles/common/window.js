/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
(function (global) {
	if (global.top === global) {
		global.__defineGetter__("innerWidth", function () {
			return FireTVPlugin.profileDefinition.resolution.width;
		});
	
		global.__defineGetter__("innerHeight", function () {
			return FireTVPlugin.profileDefinition.resolution.height;
		});
	}
	
	if (FireTVPlugin.profileDefinition.name === "netbox" || FireTVPlugin.profileDefinition.name === "netbox-hd") {
		global.__defineGetter__("innerWidth", function () {
			return undefined;
		});
	
		global.__defineGetter__("innerHeight", function () {
			return undefined;
		});
	}
	
	document.documentElement.addEventListener("mousedown", function (event) {
		var triggeredOnAnonymousNode = (event.originalTarget !== event.target);
		var triggeredOnFiretvChild = false;
		var targetIsInteractive;
		try {
			// -- reading any property of event.originalTarget fails if originalTarget is an anonymous node, so work with target
			var node = event.target;
			while (node) {
				if (node.className && node.className.match(/firetv-/)) {
					triggeredOnFiretvChild = true;
				}
				if (node === document.body) {
					triggeredOnFiretvChild = false;
				}
				node = node.parentNode;
			}
			targetIsInteractive = true;
			if (triggeredOnAnonymousNode || triggeredOnFiretvChild) {
				targetIsInteractive = node.localName !== "div";
				if (node.localName === "button") {
					if (node.onfocus === null) {
						node.onfocus = function (event) {
							node.blur();
						};
					}
				}
			}
		} catch (e) {
		}
		if ((!triggeredOnAnonymousNode && !triggeredOnFiretvChild) || (triggeredOnAnonymousNode && !targetIsInteractive) || (triggeredOnFiretvChild && !targetIsInteractive)) {
			event.stopPropagation();
		}
		if (triggeredOnAnonymousNode || triggeredOnFiretvChild) {
			event.stopPropagation();
		}
	}, false);
	
	var handleIME = function (event) {
		if (typeof event.target._firetvShowIME === "function" && event.nativeKeyCode === global.KeyboardEvent.DOM_VK_SPACE) {
			event.target._firetvShowIME();
			event.stopPropagation();
			event.preventDefault();
		}
	};
	// -- register before everyone, if not, sometimes we cannot do what should be done to manage IME
	global.addEventListener("keydown", handleIME, true);
})(window);
