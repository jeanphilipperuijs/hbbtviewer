/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
(function (global) {
	
	if (!FireTVPlugin.customCSSHooks) {
		FireTVPlugin.customCSSHooks = {};
	}
	
	var nodeToString = function (node) {
		var res = "";
		res += node.nodeName.toLowerCase();
		if (node.id) {
			res += "#" + node.id;
		}
		if (node.className) {
			var classes = node.className.split(/\s+/);
			var j;
			for (j = 0; j < classes.length; j++) {
				res += "." + classes[j];
			}
		}
		return res;
	};


	var setCustomStyle = function (node, property, value) {
		var uri = global.location.href;
		//var msg = "[setCustomStyle] value " + value + "for " + property + " on " + nodeToString(node) + " (" + uri + ")";

		var customStyleString = node.hasAttribute("firetv-css") ? node.getAttribute("firetv-css") : "{}";
		var customStyle = JSON.parse(customStyleString);
		if (value === "" || value === null || typeof value === "undefined") {
			delete customStyle[property];
		} else {
			customStyle[property] = value;
		}
		if (Object.keys(customStyle).length > 0) {
			node.setAttribute("firetv-css", JSON.stringify(customStyle));
		} else {
			node.removeAttribute("firetv-css");
		}
	};
	
	var getComputedCustomCSSValue = function (node, property) {
		var uri = global.location.href;
		//var msg = "[getComputedCustomCSSValue] for " + property + " on " + nodeToString(node) + " (" + uri + ")";
		var value;
		
		var customStyleString = node.hasAttribute("firetv-css") ? node.getAttribute("firetv-css") : "{}";
		var customStyle = JSON.parse(customStyleString);
		value = customStyle[property];
		if (value && value !== "") {
			//msg += "[from firetv-css] return : " + value;
			//console.info(msg)
			return customStyle[property];
		}
		
		var customSheet = FireTVPlugin.customCSSSheet;
		if (customSheet) {
			value = customSheet.getComputedValue(node, property);
			if (value !== null) {
				//msg += "[from custom sheet] return : " + value;
				//console.info(msg);
				return value;
			}
		}
		//msg += " return : null";
		// console.info(msg)
		return null;
	};

	var context = {
		"nodeToString" : nodeToString,
		"getComputedCustomCSSValue" : getComputedCustomCSSValue,
		"setCustomStyle": setCustomStyle
	};

	var overloadCSSStyleDeclaration = function (event) {
		if (event) {
			event.target.removeEventListener("DOMContentLoaded", overloadCSSStyleDeclaration, false);
		}
		var HTML_ELEMENTS = FireTVPlugin.constants.HTML_ELEMENTS;
		var elClass, property, i;
		for (elClass in HTML_ELEMENTS) {
			if (HTML_ELEMENTS.hasOwnProperty(elClass)) {
				if (global[HTML_ELEMENTS[elClass]] && global[HTML_ELEMENTS[elClass]].prototype) {
					var g = global[HTML_ELEMENTS[elClass]].prototype.__lookupGetter__("style");
					if (g) {
						global[HTML_ELEMENTS[elClass]].prototype.__defineGetter__("style",
							function () {
								var res = g.apply(this, []);
								FireTVPlugin.lastStyleAccessOnNode = this;
								return res;
							});
						global[HTML_ELEMENTS[elClass]].prototype.__defineGetter__("nativestyle", function () {
							return g.apply(this, []);
						});
					}
				}
			}
		}

		var nativeGetComputedStyle = global.getComputedStyle;
		global.getComputedStyle = function (elt, pseudoElt) {
			var s = nativeGetComputedStyle.apply(global, [ elt, pseudoElt ]);
			if (pseudoElt === "from-binding") {
				return s;
			}
			FireTVPlugin.lastStyleAccessOnNode = elt;
			var val;
			var o = {};
			var count = 0;
			var i;
			var property;
			for (property in FireTVPlugin.customCSSHooks) {
				if (FireTVPlugin.customCSSHooks.hasOwnProperty(property)) {
					val = getComputedCustomCSSValue(elt, property);
					if (val !== null) {
						delete s[property];
						o[property] = "" + val;
						count++;
					}
				}
			}
			if (count > 0) {
				// return a proxy object because s cannot be modified
				// - filter with !o.hasOwnProperty to get everything that is not
				// in o
				for (i in s) {
					if (!o.hasOwnProperty(i)) {
						o[i] = s[i];
					}
				}
				o.original = s;
				return o;
			}
			return s;
		};

		for (property in FireTVPlugin.customCSSHooks) {
			if (FireTVPlugin.customCSSHooks.hasOwnProperty(property)) {
				(function () {
					var getter = FireTVPlugin.customCSSHooks[property].getter;
					var setter = FireTVPlugin.customCSSHooks[property].setter;
					if (getter) {
						global.CSSStyleDeclaration.prototype.__defineGetter__(property, (function () {
							return function () {
								return getter.apply(context, []);
							};
						})());
					}
					if (setter) {
						global.CSSStyleDeclaration.prototype.__defineSetter__(property, (function () {
							return function (val) {
								setter.apply(context, [val]);
							};
						})());
					}
				})();
			}
		}

		var replacements = FireTVPlugin.profileDefinition.cssReplacements;
		for (i = 0; i < replacements.length; i++) {
			(function () {
				var prop = replacements[i].property;
				var val = replacements[i].value;
				var replacement = replacements[i].replacement;
				var origSetter = global.CSSStyleDeclaration.prototype.__lookupSetter__(prop);
				var setter = function (value) {
					if (value === val) {
						origSetter.apply(this, [replacement]);
						return replacement;
					} else {
						return origSetter.apply(this, [value]);
					}
				};
				global.CSSStyleDeclaration.prototype.__defineSetter__(prop, (function () {
					return function (val) {
						setter.apply(this, [val]);
					};
				})());
			})();
		}
		
		var nativeSetProperty = global.CSSStyleDeclaration.prototype.setProperty;
		global.CSSStyleDeclaration.prototype.setProperty = function (propertyName, value, priority) {
			if (propertyName in FireTVPlugin.customCSSHooks && FireTVPlugin.customCSSHooks[propertyName].setter) {
//				console.log(FireTVPlugin.lastStyleAccessOnNode);
//				console.log(propertyName + " : " + value);
				FireTVPlugin.customCSSHooks[propertyName].setter.apply(context, [value]);
			} else {
				nativeSetProperty.apply(this, [propertyName, value, priority]);
			}
		};
		
		var nativeGetPropertyPriority = global.CSSStyleDeclaration.prototype.getPropertyPriority;
		global.CSSStyleDeclaration.prototype.getPropertyPriority = function (propertyName) {
			return nativeGetPropertyPriority.apply(this, [ propertyName ]);
		};
		
		var nativeGetPropertyValue = global.CSSStyleDeclaration.prototype.getPropertyValue;
		global.CSSStyleDeclaration.prototype.getPropertyValue = function (propertyName) {
			var res;
			try {
				res = nativeGetPropertyValue.apply(this, [propertyName]);
			} catch (e) {
				res = nativeGetPropertyValue.apply(this.original, [propertyName]);
			}
			return res;
		};
		
		var nativeRemoveProperty = global.CSSStyleDeclaration.prototype.removeProperty;
		global.CSSStyleDeclaration.prototype.removeProperty = function (propertyName) {
			return nativeRemoveProperty.apply(this, [propertyName]);
		};
	};

	var parseStyle = function (s) {
		var obj = {};
		if (!s) {
			return obj;
		}
		s = s.substring(0, s.length - 1);
		var properties = s.split(";");
		for (var i = 0; i < properties.length; i++) {
			var kv = properties[i].split(":");
			if (kv.length === 2) {
				kv[0] = kv[0].replace(/^\s+/, "").replace(/\s+$/, "");
				kv[1] = kv[1].replace(/^\s+/, "").replace(/\s+$/, "");
				obj[kv[0]] = kv[1];
			}
		}
		return obj;
	};
	
	var domAttrModifiedHandler = function (mutation) {
		var element = mutation.target;
		try {
			// -- reading any property of element fails if element is an anonymous node, so catch it
			if (element.firebugIgnore) {
				return;
			}
		} catch (e) {
			return;
		}
		
		var styleModified = mutation.attributeName === "style";
		var classModified = mutation.attributeName === "class";
		// var customModified = event.attrName.substr(0, "firetv-".length) ===
		// "firetv-";
		var i, property, newValue = mutation.target.getAttribute(mutation.attributeName);
		if (styleModified) {
			var oldStyle = parseStyle(mutation.oldValue);
			var newStyle =  parseStyle(newValue);
			var p;
			for (p in newStyle) {
				if (newStyle.hasOwnProperty(p)) {
					if (oldStyle.hasOwnProperty(p) && oldStyle[p] === newStyle[p]) {
						delete newStyle[p];
					}
				}
			}
			for (p in newStyle) {
				if (newStyle.hasOwnProperty(p)) {
					for (property in FireTVPlugin.customCSSHooks) {
						if (FireTVPlugin.customCSSHooks.hasOwnProperty(property)) {
							if (FireTVPlugin.customCSSHooks[property].listenTo.indexOf(p) > -1) {
								FireTVPlugin.customCSSHooks[property].callback.apply(context, [element, property, p]);
							}
						}
					}
				}
			}
		} else if (classModified) {
			for (property in FireTVPlugin.customCSSHooks) {
				if (FireTVPlugin.customCSSHooks.hasOwnProperty(property)) {
					FireTVPlugin.customCSSHooks[property].callback.apply(context, 
					[element, property, "[class " + mutation.oldValue + "->" + newValue + "]"]);
				}
			}
			var elements = element.querySelectorAll("*");
			var l = elements.length;
			for (i = 0; i < l; i++) {
				if (!elements[i].nodeName) {
					continue; // might happen during external plugin loading
				}
				if (elements[i].nodeName.toLowerCase() === "iframe" || elements[i].nodeName.toLowerCase() === "html" || 
					elements[i].nodeName.toLowerCase() === "head" || elements[i].nodeName.toLowerCase() === "meta" || 
					elements[i].nodeName.toLowerCase() === "script" || elements[i].nodeName.toLowerCase() === "object" || 
					elements[i].nodeName.toLowerCase() === "embed" || elements[i].nodeName.toLowerCase() === "style" || 
					elements[i].firebugIgnore) 
				{
					continue;
				}
				for (property in FireTVPlugin.customCSSHooks) {
					if (FireTVPlugin.customCSSHooks.hasOwnProperty(property)) {
						FireTVPlugin.customCSSHooks[property].callback.apply(context, [ elements[i], property, "[init]" ]);
					}
				}
			}
		}
		// else if (customModified) {
		// // var property =
		// // event.attrName.substr(css.CUSTOM_PROPERTY_PREFIX.length);
		//
		// // _this.Console.debug([css.CAT, "custom changed ("+property+"):
		// // " + event.prevValue + " -> " + event.newValue]);
		// }
	};

	var domNodeInsertedHandler = function (element) {
		// -- ignore <object> and <embed> as it seems to crash quicktime 
		if (element.tagName === "object" || element.tagName === "embed") {
			return;
		}
		// -- the event seems to be fired only on the topmost element, not
		// its children
		var elements = [];
		var i, property;
		if (element.nodeType === global.Node.ELEMENT_NODE) {
			elements.push(element);
			if (element.getElementsByTagName) {
				var children = element.getElementsByTagName("*");
				for (i = 0; i < children.length; i++) {
					elements.push(children[i]);
				}
			}
		}
		for (i = 0; i < elements.length; i++) {
			if (!elements[i].nodeName) {
				continue; // might happen during external plugin loading
			}
			if (elements[i].nodeName.toLowerCase() === "iframe" || elements[i].nodeName.toLowerCase() === "html" || 
				elements[i].nodeName.toLowerCase() === "head" || elements[i].nodeName.toLowerCase() === "meta" || 
				elements[i].nodeName.toLowerCase() === "script" || elements[i].nodeName.toLowerCase() === "object" || 
				elements[i].nodeName.toLowerCase() === "embed" || elements[i].nodeName.toLowerCase() === "style") 
			{
				continue;
			}
			element = elements[i];
//			console.info("[domNodeInsertedHandler()] " + nodeToString(element));
			for (property in FireTVPlugin.customCSSHooks) {
				if (FireTVPlugin.customCSSHooks.hasOwnProperty(property)) {
					FireTVPlugin.customCSSHooks[property].callback.apply(context, [ element, property, "[init]" ]);
				}
			}
		}
	};

	var onMutation = function (mutation) {
		try {
			// -- if mutation involves an anonymous node, an exception will be raised, so catch it
			if (mutation.type === "attributes") {
				domAttrModifiedHandler(mutation);
			} else if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
				var i;
				for (i = 0; i < mutation.addedNodes.length; i++) {
					domNodeInsertedHandler(mutation.addedNodes[i]);
				}
			}
		} catch (e) {
		}
	};
	
	var initSpecificRulesHandler = function (event) {
		if (event) {
			event.target.removeEventListener("DOMContentLoaded", initSpecificRulesHandler, false);
		}
	
		var elements = document.querySelectorAll("*");
		var i, property, l = elements.length;
		for (i = 0; i < l; i++) {
			if (!elements[i].nodeName) {
				continue; // might happen during external plugin loading
			}
			if (elements[i].nodeName.toLowerCase() === "iframe" || elements[i].nodeName.toLowerCase() === "html" || 
				elements[i].nodeName.toLowerCase() === "head" || elements[i].nodeName.toLowerCase() === "meta" || 
				elements[i].nodeName.toLowerCase() === "script" || elements[i].nodeName.toLowerCase() === "object" || 
				elements[i].nodeName.toLowerCase() === "embed" || elements[i].nodeName.toLowerCase() === "style" || 
				elements[i].firebugIgnore) 
			{
				continue;
			}
			for (property in FireTVPlugin.customCSSHooks) {
				if (FireTVPlugin.customCSSHooks.hasOwnProperty(property)) {
					FireTVPlugin.customCSSHooks[property].callback.apply(context, [ elements[i], property, "[init]" ]);
				}
			}
		}
		
		var observer = new global.MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				onMutation(mutation);
			});    
		});
		// configuration of the observer:
		var config = { 
			childList: true, 
			attributes: true, 
			characterData: false,
			subtree: true,
			attributeOldValue: true,
			characterDataOldValue: false
		};
		// pass in the target node, as well as the observer options
		observer.observe(document.documentElement, config);
		
	};

	overloadCSSStyleDeclaration();
	global.addEventListener("DOMContentLoaded", initSpecificRulesHandler, false);
})(window);
