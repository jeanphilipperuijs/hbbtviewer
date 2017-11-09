/* See license.txt for terms of usage */
/*global FireTVPlugin:false */
/**
 * This is quiet complex but it should work as long as we do not use more than 
 * one instance of <object> of a given mime-type - which is the case in most commons situation.
 * It should work with multiple instance but does not because of : https://bugzilla.mozilla.org/show_bug.cgi?id=690259
 */
(function (global) {

	var debug = function (msg) {
		var message = (msg) ? msg : "";
		var i;
		var args = "(";
		for (i = 0; i < debug.caller.arguments.length; i++) {
			args += debug.caller.arguments[i];
			if (i < debug.caller.arguments.length - 1) {
				args += ", ";
			}
		}
		args += ")";
//		console.log("[ObjectHelper." + debug.caller.name + args + "] " + message);
	};

	// -- HTMLObjectElement override
	var originalobjecttypesetter = (function () {
		return global.HTMLObjectElement.prototype.__lookupSetter__("type");
	})();
	
	var originalobjectdatasetter = (function () {
		return global.HTMLObjectElement.prototype.__lookupSetter__("data");
	})();
	
	var originalobjectdatagetter = (function () {
		return global.HTMLObjectElement.prototype.__lookupGetter__("data");
	})();
	
	var originalembedsrcsetter = (function () {
		return global.HTMLEmbedElement.prototype.__lookupSetter__("src");
	})();
	
	var originalembedsrcgetter = (function () {
		return global.HTMLEmbedElement.prototype.__lookupGetter__("src");
	})();
	
	var originalobjectstylegetter = (function () {
		return global.HTMLObjectElement.prototype.__lookupGetter__("style");
	})();
	
	var originalembedstylegetter = (function () {
		return global.HTMLEmbedElement.prototype.__lookupGetter__("style");
	})();
	
	var originalobjectclassnamegetter = (function () {
		return global.HTMLObjectElement.prototype.__lookupGetter__("className");
	})();
	
	var originalobjectclassnamesetter = (function () {
		return global.HTMLObjectElement.prototype.__lookupSetter__("className");
	})();
	
	var originalobjectgetattribute = (function () {
		return global.HTMLObjectElement.prototype.getAttribute;
	})();
	
	var originalobjectsetattribute = (function () {
		return global.HTMLObjectElement.prototype.setAttribute;
	})();
	
	var typeToId = function (type) {
		if (typeof type === "string") {
			return type.replace(/\//g, "_").replace(/\+/g, "_").replace(/-/g, "_").replace(/:/g, "_");
		}
		return "";
	};

	var proxifiedMimeTypes = [];
	var proxyMimeSuffix = "+firetv";
	var proxyMimeSuffixRegexp = new RegExp("\\+firetv$");

	function createProxy(object) {
		// -- replace original node by a new one modified to avoid original
		// mimetype plugin loading if any
		
		var p = object.parentNode;
		if (!p) {
			return null;
		}
		
		var proxyId = "firetvProxy" + ("" + Math.random()).substring(2);
		
		var isEmbed = object instanceof global.HTMLEmbedElement;
		var dataAttribute = (isEmbed) ? "src" : "data";
		
		var data = object.getAttribute(dataAttribute);
		while (object.firstChild) {
			object.removeChild(object.firstChild);
		}
		object.removeAttribute(dataAttribute);
		
		var proxy = document.createElement("object");
			
		proxy.type = object.type + proxyMimeSuffix;
		proxy.setAttribute("type", object.type + proxyMimeSuffix);
		
		proxy.setAttribute("firetv-data", data);
		if (data && data !== "" && proxy.onDataChanged) {
			proxy.onDataChanged("", data);
		}
		proxy.setAttribute("firetv-proxy-id", proxyId);
		
		var i, attr;
		for (i = 0; i < object.attributes.length; i++) {
			attr = object.attributes[i];
			if (attr.name !== "type" && attr.name !== "data" && attr.name !== "src" && attr.name !== "disabled") {
				proxy.setAttribute(attr.name, attr.value);
			}
		}
		
		object.removeAttribute("id");
		object.removeAttribute("class");
		object.setAttribute("firetv-proxy-id", proxyId);
		
		var origRemoveChild = p.removeChild;
		
		p.insertBefore(proxy, object);
		p.removeChild(object);
		
		// -- override remove child for parent to avoid error errors when app tries to remove object instead of proxy
		if (p._proxySupport) {
			p._proxifiedChildren.push(object);
			p._proxyChildren.push(proxy);
		} else {
			Object.defineProperties(p, {  
				"_proxySupport": {  
					value: true,  
					writable: true,
					enumerable: false,
					configurable: true
				},
				"_proxifiedChildren": {  
					value: [object],  
					writable: true,
					enumerable: false,
					configurable: true
				},
				"_proxyChildren": {  
					value: [proxy],  
					writable: true,
					enumerable: false,
					configurable: true
				},
				"removeChild": {  
					value: function removeChild(child) {
						var i;
						for (i = 0; i < this._proxifiedChildren.length; i++) {
							if (child === this._proxifiedChildren[i] && 
								this._proxyChildren[i] &&
								this._proxyChildren[i].parentNode === this) 
							{
								return origRemoveChild.apply(this, [this._proxyChildren[i]]);
							}
						}
						return origRemoveChild.apply(this, [child]);
					},
					writable: true,
					enumerable: false,
					configurable: true
				}
			});  
		}
		return proxy;
	}
	
	var isProxifiedType = function (object) {
		return (proxifiedMimeTypes.indexOf(object.type) > -1);
	};
	
	var isProxy = function (object) {
		return object.type.match(/\+firetv$/);
	};
	
	
	var proxies = [];
	
	var getProxy = function (object) {
		var proxy = null;
		var selector;
		if (object.hasAttribute("firetv-proxy-id")) {
			// -- effective proxies are always objects
			proxy = proxies[originalobjectgetattribute.apply(object, ["firetv-proxy-id"])];
		} else {
			proxy = createProxy(object);
			proxies[originalobjectgetattribute.apply(proxy, ["firetv-proxy-id"])] = proxy;
		}
		if (!proxy) {
			// -- proxy may be null because createProxy returns null when object is not yet insterted into dom
			return object;
		}
		return proxy;
	};

	var dataGetter = function () {
		var obj = this;
		if (this.hasAttribute("firetv-proxy-id")) {
			var selector = "object[firetv-proxy-id='" + this.getAttribute("firetv-proxy-id") + "']";
			obj = document.querySelector(selector);
		}
		var d = obj.getAttribute("firetv-data");
		if (d) {
			return d;
		}
		return originalobjectdatagetter.apply(obj, []);
	};

	global.HTMLObjectElement.prototype.__defineGetter__("data", dataGetter);
	global.HTMLObjectElement.prototype.__defineGetter__("src", dataGetter); // for replaced embeds
	global.HTMLEmbedElement.prototype.__defineGetter__("src", dataGetter); // for replaced embeds
	
	
	var dataSetter = function (val) {
		var proxy, previousVal;
		if (isProxifiedType(this)) {
			proxy = getProxy(this);
			previousVal = proxy.getAttribute("firetv-data");
			proxy.setAttribute("firetv-data", val);
			originalobjectdatasetter.apply(proxy, [""]);
			if (proxy.onDataChanged) {
				proxy.onDataChanged(previousVal, val);
			}
		} else if (isProxy(this)) {
			previousVal = this.getAttribute("firetv-data");
			this.setAttribute("firetv-data", val);
			if (this.onDataChanged) {
				this.onDataChanged(previousVal, val);
			}
		} else {
			originalobjectdatasetter.apply(this, [val]);
		}
	};
	global.HTMLObjectElement.prototype.__defineSetter__("data", dataSetter);
	global.HTMLObjectElement.prototype.__defineSetter__("src", dataSetter); // for replaced embeds
	global.HTMLEmbedElement.prototype.__defineSetter__("src", dataSetter); // for replaced embeds
	
	global.HTMLObjectElement.prototype.__defineSetter__("type", function (val) {
		var proxy, previousVal;
		if (isProxy(this)) {
			var originalType  = this.type.replace(proxyMimeSuffixRegexp, "");
			var newType = val + proxyMimeSuffix;
			if (newType !== this.type) {
				originalobjecttypesetter.apply(this, [newType]);
			}
		} else {
			originalobjecttypesetter.apply(this, [val]);
		}
	});
	
	var originalembedaddeventlistener = (function () {
		return global.HTMLEmbedElement.prototype.addEventListener;
	})();
	var originalembedremoveeventlistener = (function () {
		return global.HTMLEmbedElement.prototype.addEventListener;
	})();
	
	global.HTMLEmbedElement.prototype.addEventListener = function () {
		if (isProxifiedType(this)) {
			var args = Array.prototype.slice.call(arguments);
			args.push(this);
			return global.HTMLObjectElement.prototype.addEventListener.apply(getProxy(this), args);
		}
		return originalembedaddeventlistener.apply(this, arguments);
	};
	
	global.HTMLEmbedElement.prototype.removeEventListener = function () {
		if (isProxifiedType(this)) {
			var args = Array.prototype.slice.call(arguments);
			args.push(this);
			return global.HTMLObjectElement.prototype.removeEventListener.apply(getProxy(this), args);
		}
		return originalembedremoveeventlistener.apply(this, arguments);
	};
	
	global.HTMLObjectElement.prototype.__defineGetter__("style", function () {
		if (isProxifiedType(this)) {
			return originalobjectstylegetter.apply(getProxy(this), []);
		}
		return originalobjectstylegetter.apply(this, []);
	});
	
	global.HTMLEmbedElement.prototype.__defineGetter__("style", function () {
		if (isProxifiedType(this)) {
			return originalobjectstylegetter.apply(getProxy(this), []);
		}
		return originalembedstylegetter.apply(this, []);
	});
	
	global.HTMLObjectElement.prototype.__defineGetter__("className", function () {
		if (isProxifiedType(this)) {
			return originalobjectclassnamegetter.apply(getProxy(this), []);
		}
		return originalobjectclassnamegetter.apply(this, []);
	});
	
	global.HTMLObjectElement.prototype.__defineSetter__("className", function (value) {
		if (isProxifiedType(this)) {
			return originalobjectclassnamesetter.apply(getProxy(this), [value]);
		}
		return originalobjectclassnamesetter.apply(this, [value]);
	});
	
	var overriddenAttributes = ["style", "class"];
	
	global.HTMLObjectElement.prototype.getAttribute = function getAttribute(name) {
		if (name !== "firetv-proxy-id" && isProxifiedType(this) && overriddenAttributes.indexOf(name) !== -1) {
			return originalobjectgetattribute.apply(getProxy(this), [name]);
		}
		return originalobjectgetattribute.apply(this, [name]);
	};
	
	global.HTMLObjectElement.prototype.setAttribute = function setAttribute(name, value) {
		if (isProxifiedType(this) && overriddenAttributes.indexOf(name) !== -1) {
			return originalobjectsetattribute.apply(getProxy(this), [name, value]);
		}
		return originalobjectsetattribute.apply(this, [name, value]);
	};
	
	var definePropertiesForTypes = function definePropertiesForTypes(initialPrototype, properties, types, needsProxy) {
		var newPrototype = properties;
		var key;
		var i;
		if (needsProxy) {
			for (i = 0; i < types.length; i++) {
				if (proxifiedMimeTypes.indexOf(types[i]) === -1) {
					proxifiedMimeTypes.push(types[i]);
				}
			}
		}
		for (key in newPrototype) {
			if (newPrototype.hasOwnProperty(key)) {
				for (i = 0; i < types.length; i++) {
					// -- clean
					(function () {
						var type = (needsProxy) ? typeToId(types[i] + proxyMimeSuffix) : typeToId(types[i]);
						var prop = key;
						delete initialPrototype["__firetv__" + type + "_val_" + prop];
						delete initialPrototype["__firetv__" + type + "_get_" + prop];
						delete initialPrototype["__firetv__" + type + "_set_" + prop];
						// -- ownval is type independant
						delete initialPrototype["__firetv__ownval_" + prop];
					})();
					// -- define per-type properties + generic get/set
					(function () {
						var prop = key;
						var origDesc = newPrototype[prop];

						var initialValue = origDesc.value;
						var initialWritable = (typeof origDesc.writable !== "undefined") ? (!!origDesc.writable) : false;
						var initialGet = origDesc.get;
						var initialSet = origDesc.set;

						var type = (needsProxy) ? typeToId(types[i] + proxyMimeSuffix) : typeToId(types[i]);

						if (typeof initialValue !== "undefined") {
							Object.defineProperty(initialPrototype, "__firetv__" + type + "_val_" + prop, {
								value : initialValue,
								writable : initialWritable,
								enumerable : false, 
								configurable : true
							});
						} else {
							// -- get/set
							if (initialGet) {
								Object.defineProperty(initialPrototype, "__firetv__" + type + "_get_" + prop, {
									value : initialGet,
									writable : true,
									enumerable : false, 
									configurable : true
								});
							}
							if (initialSet) {
								Object.defineProperty(initialPrototype, "__firetv__" + type + "_set_" + prop, {
									value : initialSet,
									writable : true,
									enumerable : false, 
									configurable : true
								});
							}
						}
						// -- define non-enumerable own property (type
						// independant)
						Object.defineProperty(initialPrototype, "__firetv__ownval_" + prop, {
							value : undefined,
							writable : true,
							enumerable : false
						});
						// -- define generic wrappers get/set if not already
						// done
						if (!initialPrototype.hasOwnProperty(prop)) {
							Object.defineProperty(initialPrototype, prop, {
								get : function () {
									if (isProxifiedType(this)) {
										var proxy = getProxy(this);
										var res = proxy[prop];
										if (typeof res === "function") {
											res = res.bind(proxy);
										}
										return res;
									} else {
										var typeId = typeToId(this.type);
										if (initialPrototype.hasOwnProperty("__firetv__" + typeId + "_val_" + prop)) {
											return this["__firetv__" + typeId + "_val_" + prop];
										} else if (typeof this["__firetv__" + typeId + "_get_" + prop] === "function") {
											return this["__firetv__" + typeId + "_get_" + prop].apply(this, []);
										} else {
											// default case
											return this["__firetv__ownval_" + prop];
										}
									}
								},
								set : function (val) {
									if (isProxifiedType(this)) {
										getProxy(this)[prop] = val;
									} else {
										var typeId = typeToId(this.type);
										if (initialPrototype.hasOwnProperty("__firetv__" + typeId + "_val_" + prop)) {
											this["__firetv__" + typeId + "_val_" + prop] = val;
										} else if (typeof this["__firetv__" + typeId + "_set_" + prop] === "function") {
											this["__firetv__" + typeId + "_set_" + prop].apply(this, [ val ]);
										} else {
											this["__firetv__ownval_" + prop] = val;
										}
									}
								},
								configurable : true,
								enumerable : (prop.charAt(0) !== "_")
							// no way to make difference with property
							// overlapping (prop1 for type1 is enumerable and
							// prop1 for type2 is not) : so force it enumerable=true if not starting with an underscore
							});
						}
					})();
				}
			}
		}
	};
	
	var definePropertiesForClassid = function definePropertiesForClassid(initialPrototype, properties, classid) {
		var newPrototype = properties;
		var key;
		var i;
		for (key in newPrototype) {
			if (newPrototype.hasOwnProperty(key)) {
				
				// -- clean
				(function () {
					var type = typeToId(classid);
					var prop = key;
					delete initialPrototype["__firetv__" + type + "_val_" + prop];
					delete initialPrototype["__firetv__" + type + "_get_" + prop];
					delete initialPrototype["__firetv__" + type + "_set_" + prop];
					// -- ownval is type independant
					delete initialPrototype["__firetv__ownval_" + prop];
				})();
				// -- define per-type properties + generic get/set
				(function () {
					var prop = key;
					var origDesc = newPrototype[prop];

					var initialValue = origDesc.value;
					var initialWritable = (typeof origDesc.writable !== "undefined") ? (!!origDesc.writable) : false;
					var initialGet = origDesc.get;
					var initialSet = origDesc.set;

					var type = typeToId(classid);

					if (typeof initialValue !== "undefined") {
						Object.defineProperty(initialPrototype, "__firetv__" + type + "_val_" + prop, {
							value : initialValue,
							writable : initialWritable,
							enumerable : false, 
							configurable : true
						});
					} else {
						// -- get/set
						if (initialGet) {
							Object.defineProperty(initialPrototype, "__firetv__" + type + "_get_" + prop, {
								value : initialGet,
								writable : true,
								enumerable : false, 
								configurable : true
							});
						}
						if (initialSet) {
							Object.defineProperty(initialPrototype, "__firetv__" + type + "_set_" + prop, {
								value : initialSet,
								writable : true,
								enumerable : false, 
								configurable : true
							});
						}
					}
					// -- define non-enumerable own property (type
					// independant)
					Object.defineProperty(initialPrototype, "__firetv__ownval_" + prop, {
						value : undefined,
						writable : true,
						enumerable : false,
						configurable : true
					});
					// -- define generic wrappers get/set if not already
					// done
					if (!initialPrototype.hasOwnProperty(prop)) {
						Object.defineProperty(initialPrototype, prop, {
							get : function () {
								if (isProxifiedType(this)) {
									var proxy = getProxy(this);
									var res = proxy[prop];
									if (typeof res === "function") {
										res = res.bind(proxy);
									}
									return res;
								} else {
									var typeId = typeToId(this.getAttribute("classid"));
									if (initialPrototype.hasOwnProperty("__firetv__" + typeId + "_val_" + prop)) {
										return this["__firetv__" + typeId + "_val_" + prop];
									} else if (typeof this["__firetv__" + typeId + "_get_" + prop] === "function") {
										return this["__firetv__" + typeId + "_get_" + prop].apply(this, []);
									} else {
										// default case
										return this["__firetv__ownval_" + prop];
									}
								}
							},
							set : function (val) {
								if (isProxifiedType(this)) {
									getProxy(this)[prop] = val;
								} else {
									var typeId = typeToId(this.getAttribute("classid"));
									if (initialPrototype.hasOwnProperty("__firetv__" + typeId + "_val_" + prop)) {
										this["__firetv__" + typeId + "_val_" + prop] = val;
									} else if (typeof this["__firetv__" + typeId + "_set_" + prop] === "function") {
										this["__firetv__" + typeId + "_set_" + prop].apply(this, [ val ]);
									} else {
										this["__firetv__ownval_" + prop] = val;
									}
								}
							},
							configurable : true,
							enumerable : (prop.charAt(0) !== "_")
						// no way to make difference with property
						// overlapping (prop1 for type1 is enumerable and
						// prop1 for type2 is not) : so force it enumerable=true ?
						// (at least for debug)
						});
					}
				})();
			}
		}
		
	};
	
	var defineObjectPropertiesForTypes = function defineObjectPropertiesForTypes(properties, types, needsProxy) {
		definePropertiesForTypes(global.HTMLObjectElement.prototype, properties, types, needsProxy);
		definePropertiesForTypes(global.HTMLEmbedElement.prototype, properties, types, needsProxy);
	};
	
	var defineObjectPropertiesForClassid = function defineObjectPropertiesForClassid(properties, classid) {
		definePropertiesForClassid(global.HTMLObjectElement.prototype, properties, classid);
	};
	
	var onDOMContentLoaded = function (event) {
		event.currentTarget.removeEventListener("DOMContentLoaded", onDOMContentLoaded, false);
		if (proxifiedMimeTypes.length === 0) {
			return;
		}
		var selector = "";
		var i;
		for (i = 0; i < proxifiedMimeTypes.length; i++) {
			selector += "[type='" + proxifiedMimeTypes[i] + "']:not([firetv-proxy-id])";
			if (i < proxifiedMimeTypes.length - 1) {
				selector += ", ";
			}
		}
		var objectsToProxify = document.querySelectorAll(selector);
		for (i = 0; i < objectsToProxify.length; i++) {
			createProxy(objectsToProxify[i]);
		}
	};

	var onMutation = function (mutation) {
		
		try {
			// -- if mutation involves an anonymous node, an exception will be raised, so catch it
			var i, o, l = mutation.addedNodes.length;
			for (i = 0; i < l; i++) {
				o = mutation.addedNodes[i];
				if ((o instanceof global.HTMLObjectElement || o instanceof global.HTMLEmbedElement) && isProxifiedType(o)) {
					createProxy(o);
				}
			}
		} catch (e) {
		}
//		for (i=0; i<mutation.removedNodes.length; i++){
//			o = mutation.removedNodes[i];
//			if (o instanceof HTMLObjectElement || o instanceof HTMLEmbedElement){
//				if (o.hasAttribute("firetv-proxy-id") && (o.hasAttribute("firetv-data")||o.hasAttribute("firetv-src"))){
//					// destroy proxy ?
//				}
//			}
//		}
	};

	global.addEventListener("DOMContentLoaded", onDOMContentLoaded, false);
	
	
	var observer = new global.MutationObserver(function (mutations) {
		mutations.forEach(function (mutation) {
			onMutation(mutation);
		});    
	});
	// configuration of the observer:
	var config = { 
		childList: true, 
		attributes: false, 
		characterData: false,
		subtree: true,
		attributeOldValue: false,
		characterDataOldValue: false
	};
	// pass in the target node, as well as the observer options
	observer.observe(document.documentElement, config);
	
	Object.defineProperty(FireTVPlugin, "defineObjectPropertiesForTypes", {
		value : defineObjectPropertiesForTypes,
		writable : false,
		enumerable : false, 
		configurable : true
	});
	
	Object.defineProperty(FireTVPlugin, "defineObjectPropertiesForClassid", {
		value : defineObjectPropertiesForClassid,
		writable : false,
		enumerable : false, 
		configurable : true
	});
})(window);
