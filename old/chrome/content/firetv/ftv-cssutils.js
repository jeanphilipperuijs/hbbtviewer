/* See license.txt for terms of usage */
/*global window:false, alert, getFireTVPluginInstance, Components */
try {
	(function () {
		if (this.CSSUtils) {
			return;
		}

		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cr = Components.results;
		
		var _this = this;
		
		var FBTrace = this.FBTrace;

		var cssutils = {};

		cssutils.CAT = "[ftv.cssutils] ";

		var CSS_VALUE_IMPORTANT = /\s*([^!]*)(\s*\!\s*important)?/;

		var PSEUDO_CLASSES = [
			":link",
			":visited",
			":hover",
			":active",
			":focus",
			":target",
			":lang",
			":enabled",
			":disabled",
			":checked",
			":indeterminate",
			":root",
			":nth-child",
			":nth-last-child",
			":nth-of-type",
			":nth-last-of-type",
			":first-child",
			":last-child",
			":first-of-type",
			":last-of-type",
			":only-child",
			":only-of-type",
			":empty",
			":contains",
			":not"
		];

		var PSEUDO_ELEMENTS = [ ":before", ":after", ":first-line", ":first-letter", ":selection" ];

		var TAGS = [
			"a",
			"abbr",
			"acronym",
			"address",
			"applet",
			"area",
			"b",
			"base",
			"basefont",
			"bgsound",
			"bdo",
			"big",
			"blink",
			"blockquote",
			"body",
			"br",
			"button",
			"caption",
			"center",
			"cite",
			"code",
			"col",
			"colgroup",
			"comment",
			"dd",
			"del",
			"dfn",
			"dir",
			"div",
			"dl",
			"dt",
			"em",
			"embed",
			"fieldset",
			"font",
			"form",
			"frame",
			"frameset",
			"h",
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6",
			"head",
			"hr",
			"html",
			"i",
			"iframe",
			"img",
			"input",
			"ins",
			"isindex",
			"kbd",
			"label",
			"legend",
			"li",
			"link",
			"listing",
			"map",
			"marquee",
			"menu",
			"meta",
			"multicol",
			"nextid",
			"nobr",
			"noframes",
			"noscript",
			"object",
			"ol",
			"optgroup",
			"option",
			"p",
			"param",
			"plaintext",
			"pre",
			"q",
			"s",
			"samp",
			"script",
			"select",
			"server",
			"small",
			"sound",
			"spacer",
			"span",
			"strike",
			"strong",
			"style",
			"sub",
			"sup",
			"table",
			"tbody",
			"td",
			"textarea",
			"textflow",
			"tfoot",
			"th",
			"thead",
			"title",
			"tr",
			"tt",
			"u",
			"ul",
			"var",
			"wbr",
			"xmp"
		];

		var countOccurences = function (s, toSearch) {
			var index = 0, count = 0, l = toSearch.length;
			while ((index = s.indexOf(toSearch, index)) !== -1) {
				index += l;
				count++;
			}
			return count;
		};

		var toString = function (node) {
			var res = "";
			res += node.nodeName.toLowerCase();
			if (node.id) {
				res += "#" + node.id;
			}
			if (node.className) {
				var classes = node.className.split(/\s+/);
				for (var j = 0; j < classes.length; j++) {
					res += "." + classes[j];
				}
			}
			return res;
		};

		var computeSelectorWeight = function (sel) {
			var weight = 0, i, cleaned;
			weight += countOccurences(sel, '#') * 100;
			weight += countOccurences(sel, '.') * 10;
			weight += countOccurences(sel, '[') * 10;
			for (i in PSEUDO_CLASSES) {
				if (PSEUDO_CLASSES.hasOwnProperty(i)) {
					weight += countOccurences(sel, PSEUDO_CLASSES[i]) * 10;
				}
			}
			for (i in PSEUDO_ELEMENTS) {
				if (PSEUDO_ELEMENTS.hasOwnProperty(i)) {
					weight += countOccurences(sel, PSEUDO_ELEMENTS[i]) * 10;
				}
			}
			cleaned = sel.replace(":", " ");
			cleaned = cleaned.replace("+", " ");
			cleaned = cleaned.replace(">", " ");
			cleaned = cleaned.replace("\\*", " ");
			cleaned = cleaned.replace("\\.", " ");
			cleaned = cleaned.replace("#", " ");
			cleaned = cleaned.split(" ");
			for (i in cleaned) {
				if (cleaned.hasOwnProperty(i)) {
					if (TAGS.indexOf(cleaned[i].toLowerCase()) > -1) {
						weight++;
					}
				}
			}
			return weight;
		};

		function Property(property, value, important) {
			this.property = property;
			this.value = value;
			this.important = (important === true) ? true : false;
		}

		Property.prototype.serialize = function () {
			return this.property + ": " + this.value + ((this.important) ? " !important" : "") + ";";
		};

		function Rule(selector) {
			this.selector = selector;
			this.properties = [];
			this.propertiesByName = {};
			this.length = 0;
		}
		
		Rule.prototype.addProperty = function (property) {
			if (this.propertiesByName[property.property]) {
				// -- overrides previously declared property
				this.propertiesByName[property.property].value = property.value;
				this.propertiesByName[property.property].important = property.important;
			} else {
				this.propertiesByName[property.property] = property;
				this.properties.push(property);
				this.length++;
			}
		};

		Rule.prototype.addProperties = function (properties) {
			var i;
			for (i = 0; i < properties.length; i++) {
				this.addProperty(properties[i]);
			}
		};

		Rule.prototype.serialize = function () {
			var i;
			var s = this.selector + " {";

			for (i = 0; i < this.length; i++) {
				s += this.properties[i].serialize();
			}
			s += "}";
			return s;
		};

		function Sheet() {
			this.rules = [];
			this.length = 0;
		}
		
		Sheet.prototype.addRule = function (rule) {
			this.rules.push(rule);
			this.length++;
		};

		Sheet.prototype.addRules = function (rules) {
			var i;
			for (i = 0; i < rules.length; i++) {
				this.addRule(rules[i]);
			}
		};

		Sheet.prototype.serialize = function () {
			var i, s = "";
			for (i = 0; i < this.length; i++) {
				s += this.rules[i].serialize() + "\n";
			}
			return s;
		};
		
		Sheet.prototype.prefixSelector = function (prefix) {
			prefix = prefix.trim();
			var i, j, rule, selector, selectors, newsel;
			for (i = 0; i < this.length; i++) {
				rule = this.rules[i];
				selector = rule.selector;
				selectors = selector.split(",");
				newsel = "";
				for (j = 0; j < selectors.length; j++) {
					if (selectors[j].substring(0, prefix.length) === prefix) {
						newsel += selectors[j];
					} else {
						newsel += prefix + " " + selectors[j];
					}
					if (j < selectors.length - 1) {
						newsel += ", ";
					}
				}
				rule.selector = newsel;
			}
		};
		
		Sheet.prototype.prioritize = function () {
			var i, j, rule, prop;
			for (i = 0; i < this.length; i++) {
				rule = this.rules[i];
				for (j = 0; j < rule.length; j++) {
					prop = rule.properties[j];
					prop.important = true;
				}
			}
		};

		Sheet.prototype.getComputedValue = function (node, property) {
			var rules = this.rules.filter(function (rule, index, array) {
				return (typeof (rule.propertiesByName[property]) !== "undefined");
			}).sort(function (ruleA, ruleB) {
				if (ruleA.propertiesByName[property].important === ruleB.propertiesByName[property].important) {
					return 0;
				}
				if (ruleA.propertiesByName[property].important && !ruleB.propertiesByName[property].important) {
					return 1;
				}
				return -1;
			});
			var higherPriorityRule = null;
			var higherRuleWeight = 0;
			var i, rule, l = rules.length;
			for (i = 0; i < l; i++) {
				rule = rules[i];
				if (node.mozMatchesSelector(rule.selector)) {
					var ruleWeight = computeSelectorWeight(rule.selector);
					if (ruleWeight >= higherRuleWeight) {
						higherRuleWeight = ruleWeight;
						higherPriorityRule = rule;
					}
				}
			}
			if (higherPriorityRule !== null) {
				return higherPriorityRule.propertiesByName[property].value;
			}
			return null;
		};

		var clean = function (s) {
			s = s.replace(/\/\*[^*]*\*+([^\/][^*]*\*+)*\//g, "");
			s = s.replace(/\r/g, "").replace(/\s*\n\s*/g, "").replace(/\t/g, "").replace(/\s+$/, "");
			return s;
		};

		var parseProperties = function (propertiesText, filter) {
			var propertiesArray = propertiesText.split(/\s*;\s*/);
			var i, property, keyValue, key, value, valueImportant, add, properties = [];
			for (i = 0; i < propertiesArray.length; i++) {
				keyValue = propertiesArray[i].split(/\s*:\s*/);
				if (keyValue[1]) {
					key = clean(keyValue.shift()).trim();
					if (!filter) {
						valueImportant = CSS_VALUE_IMPORTANT.exec(clean(keyValue.join(":").trim()));
						properties
								.push(new Property(key, valueImportant[1].trim(), (valueImportant[2]) ? true : false));
					} else {
						valueImportant = CSS_VALUE_IMPORTANT.exec(clean(keyValue.join(":").trim()));
						add = filter[key] && ((!filter[key].propertyValues) || (filter[key].propertyValues.indexOf(valueImportant[1].trim()) > -1));
						if (add) {
							properties.push(new Property(key, valueImportant[1].trim(), (valueImportant[2]) ? true
									: false));
						}
					}
				}
			}
			return properties;
		};
		
		var parseDeclaration = function (selectorsText, propertiesText, filter) {
			var rules = [];
			var rule;
			var selectors = selectorsText.split(/\s*,\s*/);
			var properties = parseProperties(propertiesText, filter);
			if (properties.length === 0) {
				return rules;
			}
			var i;
			for (i = 0; i < selectors.length; i++) {
				rule = new Rule(selectors[i].trim());
				rule.addProperties(properties);
				rules.push(rule);
			}
			return rules;
		};
		
		var parseSheet = function (sheetText, options) {
			var sheet = (options && options.sheet) ? options.sheet : new Sheet();
			var filter = (options && options.filter) ? options.filter : false;
			if (FBTrace.DBG_FIRETV_CSSUTILS) {
				FBTrace.sysout(cssutils.CAT + "[parseSheet] text", sheetText);
			}
			var css = clean(sheetText);
			if (FBTrace.DBG_FIRETV_CSSUTILS) {
				FBTrace.sysout(cssutils.CAT + "[parseSheet] cleaned text", css);
			}
			var beginBraceIndex, endBraceIndex;
			var selectorsText, propertiesText;
			var rules;
			while (css) {
				beginBraceIndex = css.indexOf('{');
				endBraceIndex = css.indexOf('}', beginBraceIndex);
				if (beginBraceIndex > -1 && endBraceIndex > -1) {
					selectorsText = clean(css.substr(0, beginBraceIndex));
					propertiesText = clean(css.substring(beginBraceIndex + 1, endBraceIndex));
					css = css.substr(endBraceIndex + 1);
					if (propertiesText) {
						rules = parseDeclaration(selectorsText, propertiesText, filter);
						sheet.addRules(rules);
					}
				} else {
					css = false;
				}
			}
			return sheet;
		};

		cssutils.Parser = {
			parse : function (cssText, options) {
				return parseSheet(cssText, options);
			},
			parseProperties : function (propertiesText, filter) {
				return parseProperties(propertiesText, filter);
			}
		};

		this.CSSUtils = cssutils;

	}).apply(getFireTVPluginInstance());
} catch (exc) {
	alert("[ftv-cssutils.js] " + exc);
}
