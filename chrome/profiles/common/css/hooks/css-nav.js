/* See license.txt for terms of usage */
/*global FireTVPlugin: false */

// -- available functions :
//       -> this.nodeToString(node)
//       -> this.getComputedCustomCSSValue(node, property)
(function (global) {
	if (!FireTVPlugin.customCSSHooks) {
		FireTVPlugin.customCSSHooks = {};
	}

	var properties = [ "nav-down", "nav-up", "nav-left", "nav-right" ];
	var i;
	for (i = 0; i < properties.length; i++) {
		(function () {
			var property = properties[i];
			FireTVPlugin.customCSSHooks[property] = {
				"property" : property,
				"listenTo" : [ property ],
				"callback" : function (node, property, triggeredBy) {
					var val = this.getComputedCustomCSSValue(node, property);
					if (val !== null) {
//						 console.info("[" + property + ".callback] triggered by " +
//						 triggeredBy + " [val=" + val + "] on " + this.nodeToString(node));
						node.setAttribute("firetv-" + property, val);
					} else {
						node.removeAttribute("firetv-" + property);
					}
				},
				"getter" : function () {
					var node = FireTVPlugin.lastStyleAccessOnNode;
					var next = node.getAttribute("firetv-" + property);
					if (next) {
						return next;
					} else {
						return "auto";
					}
				},
				"setter" : function (t) {
					var node = FireTVPlugin.lastStyleAccessOnNode;
					this.setCustomStyle(node, property, t);
					FireTVPlugin.customCSSHooks[property].callback.apply(this, [ node, property, property ]);
				}
			};
		})();
	}

	// -- handler
	var getNextId = function (element, prop) {
		var nextId = global.getComputedStyle(element, null)[prop];
		var children, i, childNextId;
		if ((nextId === ("#" + element.id) || nextId === "auto") && (element !== global.document.documentElement && element !== global.document.body)) {
			children = element.getElementsByTagName("*");
			for (i = 0; i < children.length; i++) {
				childNextId = global.getComputedStyle(children[i], null)[prop];
				if (childNextId && childNextId !== nextId) {
					nextId = childNextId;
					break;
				}
			}
		}
		var res = (nextId === "#" + element.id) ? "current" : nextId;
		return res;
	};

	var treeWalker = null;  
	
	var navigate = function (backward) {
		if (treeWalker) {
			treeWalker.currentNode = document.activeElement;
			var node = (backward === true) ? treeWalker.previousNode() : treeWalker.nextNode();
			if (node) {
				node.focus();
			}
		}
	};
	
	var initTreeWalker = function (event) {
		event.target.removeEventListener("DOMContentLoaded", initTreeWalker, false);
		treeWalker = document.createTreeWalker(
			document.body,  
			global.NodeFilter.SHOW_ELEMENT,  
			{ 
				acceptNode: function (node) {
					if (
						((node instanceof global.HTMLAnchorElement || node instanceof global.HTMLAreaElement) && node.getAttribute("href") !== "") ||
						((node instanceof global.HTMLInputElement || node instanceof global.HTMLSelectElement || node instanceof global.HTMLTextAreaElement || node instanceof global.HTMLButtonElement) && 
						node.disabled === false) ||
						(!isNaN(parseInt(node.getAttribute("tabindex"), 10)) && parseInt(node.getAttribute("tabindex"), 10) > -1)
					) 
					{
						// NodeFilter.FILTER_SKIP
						return global.NodeFilter.FILTER_ACCEPT; 
					}
					return global.NodeFilter.FILTER_SKIP;
				}
			},  
		    false  
		);
	};
	
	global.addEventListener("DOMContentLoaded", initTreeWalker, false);

	var handleCssNav = function (event) {
		if (event.defaultPrevented) {
			return;
		}
		var nextId, nextEl;
		var reverse = (event.nativeKeyCode === global.KeyboardEvent.DOM_VK_UP || event.nativeKeyCode === global.KeyboardEvent.DOM_VK_LEFT);
		var prop = null;
		switch (event.nativeKeyCode) {
		case global.KeyboardEvent.DOM_VK_UP:
			prop = (prop === null) ? "nav-up" : prop;
		case global.KeyboardEvent.DOM_VK_DOWN:
			prop = (prop === null) ? "nav-down" : prop;
		case global.KeyboardEvent.DOM_VK_LEFT:
			prop = (prop === null) ? "nav-left" : prop;
		case global.KeyboardEvent.DOM_VK_RIGHT:
			prop = (prop === null) ? "nav-right" : prop;
			nextId = getNextId(document.activeElement, prop);
			if (nextId !== "current") {
				nextEl = document.querySelector(nextId);
				if (nextId === "auto" || !nextEl) {
					navigate(reverse);
				} else {
					if (nextEl && nextEl.focus) {
						nextEl.focus();
						event.preventDefault();
						event.stopPropagation();
					}
				}
			}
			break;
		default:
			break;
		}
	};
	global.addEventListener("keydown", handleCssNav, false);

})(window);
