/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
// -- available functions :
//       -> this.nodeToString(node)
//       -> this.getComputedCustomCSSValue(node, property)
(function (global) {
	if (!FireTVPlugin.customCSSHooks) {
		FireTVPlugin.customCSSHooks = {};
	}

	var parseRGBA =  function (color) {
		if (color === "transparent") {
			return [255, 255, 255, 0];
		}
		var bits = /^rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(,\s*(\d?\.?\d*))?\)$/.exec(color);
		if (bits) {
			var rgba = [bits[1] >> 0, bits[2] >> 0, bits[3] >> 0, (bits[5]) ? Math.round(parseFloat(bits[5]) * 100) / 100 : 1];
			return rgba;
		} else {
			return color;
	    }
	};
	
	FireTVPlugin.customCSSHooks["transparency"] = {
		"property" : "transparency",
		"listenTo" : [ "background-color", "background" ],
		"callback" : function (node, property, triggeredBy) {
			var oldVal = node.getAttribute("firetv-" + property);
			var val = this.getComputedCustomCSSValue(node, property);
			if (val !== null) {
				if (node.style.backgroundColor && node.style.backgroundColor !== "" && node.style.getPropertyPriority("background-color") !== "important") {
					this.setCustomStyle(node, "background-color", node.style.backgroundColor);
				} else {
					this.setCustomStyle(node, "background-color", "");
				}
//				console.info("[" + property + ".callback] triggered by " +
//				triggeredBy + " [val=" + val + "] on " + 
//				this.nodeToString(node));
				if(oldVal !== val) {
					node.setAttribute("firetv-" + property, val);
				}
			} else {
				if(oldVal !== val) {
					node.removeAttribute("firetv-" + property);
				}
			}
			
			if (oldVal === val) {
				var bgc = global.getComputedStyle(node, "from-binding").backgroundColor;
				var bgc2 = global.getComputedStyle(node).backgroundColor;
				var rgba = parseRGBA(bgc);
				var color;
				if (rgba instanceof Array) {
					var alpha;
					if (val === null) {
						alpha = rgba[3];
					} else {
						var v;
						var regex = /\%$/;
						if (regex.test(val)) {
							v = val.replace(regex, "") >> 0;
						} else {
							v = Math.round((val >> 0) * 100 / 256);
						}
						alpha = ((100 - v) / 100) * 1;
					}
					color = "rgb(" + rgba[0] + ", " + rgba[1] + ", " + rgba[2] + ")";
					if (color !== bgc2 || triggeredBy === "background-color") {
						if (val !== null) {
							this.setCustomStyle(node, "background-color", color);
						}
					}
	            }
			}
		},
		"getter" : function () {
			var node = FireTVPlugin.lastStyleAccessOnNode;
			var transparency = node.getAttribute("firetv-transparency");
			if (transparency) {
				return transparency;
			} else {
				return 255;
			}
		},
		"setter" : function (t) {
			var node = FireTVPlugin.lastStyleAccessOnNode;
			this.setCustomStyle(node, "transparency", t);
			FireTVPlugin.customCSSHooks["transparency"].callback.apply(this, [ node, "transparency", "transparency" ]);
		}
	};
})(window);
