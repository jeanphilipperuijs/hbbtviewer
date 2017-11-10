/* See license.txt for terms of usage */
/*global window:false, alert, getFireTVPluginInstance, Components */
try {
    (function () {
        if (this.ResponseFilter) {
            return;
        }
        
        const Cc = Components.classes;
        const Ci = Components.interfaces;
        const Cr = Components.results;
        const Cu = Components.utils;
        
        var _this = this;

        var FBTrace = this.FBTrace;
        
        var rf = {};

        rf.CAT = "[ftv.responsefilter] ";

        var sheets = {};

        var clearSheet = function (uri) {
            var length = (sheets[uri]) ? sheets[uri].length : 0;
            if (FBTrace.DBG_FIRETV_RESPONSEFILTER) {
                FBTrace.sysout(rf.CAT + "Clearing already registered sheet (" + length + " rule(s)) (for " + uri + ")", (length > 0) ? sheets[uri].serialize() : "");
            }
            delete sheets[uri];
        };

        var parseCSS = function (uri, s, win, profileDefinition) {
            var res = s;
            var options = {
                filter : (profileDefinition.cssOverloads) ? profileDefinition.cssOverloads : {}
            };
            
            var sheet = _this.CSSUtils.Parser.parse(s, options);
            var i;
            if (sheet.length > 0) {
                if (!sheets[uri]) {
                    sheets[uri] = sheet;
                } else {
                    sheets[uri].addRules(sheet.rules);
                }
                if (FBTrace.DBG_FIRETV_RESPONSEFILTER) {
                    for (i = 0; i < sheet.rules.length; i++) {
                        FBTrace.sysout(rf.CAT + "[" + uri + "] Rule added : " + sheet.rules[i].serialize());
                    }
                }
            }
            var cssReplacements = (profileDefinition.cssReplacements) ? profileDefinition.cssReplacements : [];
            var replacement, regexp;
            for (i = 0; i < cssReplacements.length; i++) {
                replacement = cssReplacements[i];
                regexp = new RegExp("([\\s\\{])" + replacement.property + "\\s*:\\s*" + replacement.value + "\\s*([;}])", "g");
                res = res.replace(regexp, "$1" + replacement.property + ": " + replacement.replacement + "$2");
            }
            return res;
        };
        
        var onDOMContentLoaded = function (event) {
            var safeWin = event.currentTarget;
            var safeDoc = safeWin.document;
            var win = safeWin.wrappedJSObject;
            
            safeWin.removeEventListener("DOMContentLoaded", onDOMContentLoaded, false);
            // -- inject custom css sheet only now because we are sure that :
            // 1- FireTVPlugin object was created in content mode (and not plugin mode)
            // 2- This event handler is called before the extended-css one (which is the first one to use customSheet)
            win.FireTVPlugin.customCSSSheet = Cu.cloneInto(sheets[safeWin.location.href.toString()], win, {cloneFunctions: true});

            var isIframe = (safeWin.frameElement !== null);
            var host = (safeWin.location.protocol === "dvb:") ? "dvb:/" : (safeWin.location.protocol + "//" + safeWin.location.host);
            
            var script = safeDoc.getElementById("firetv-bootstrap");
            // -- hide bootstrap injected script from firebug
            if (script && script.wrappedJSObject) {
                script.wrappedJSObject.firebugIgnore = !win.FireTVPlugin.DBG;
            }
            
            var topWindow = win.top;
            
            if (isIframe) {
                // -- prevent arrow scrolling
                if (win) {
                    win.addEventListener('keydown', function (e) {
                        switch (e.keyCode) {
                        case 33: // PAGE_UP
                        case 34: // PAGE_DOWN
                        case 35: // END
                        case 36: // HOME
                        case 37: // ARROW LEFT
                        case 38: // ARROW_UP
                        case 39: // ARROW_RIGHT
                        case 40: // ARROW DOWN
                            e.preventDefault();
                            break;
                        default:
                            break;
                        }
                    }, true);
                }
            }
        };

        var parseJS = function (uri, s, win, profileDefinition) {
            var res = s;
            var k;
            // -----------------------------------
            // -- profile dependant replace rules
            var regexp, replaceDef;
            for (k = 0; k < profileDefinition.globalReplace.length; k++) {
            	replaceDef = profileDefinition.globalReplace[k];
              	try {
                	 regexp = new RegExp(replaceDef.pattern, replaceDef.flags || "");
                    res = res.replace(regexp, replaceDef.replacement);
                } catch (e){}
            }
            return res;
        };

        var parseHTML = function (uri, s, win, profileDefinition) {
            var res = s;
            var i, j, k;
            // -- inject profile bootstrap
            res = res.replace(/(<head[^>]*>)/im,
                    '$1<script type="text/javascript" id="firetv-bootstrap" src="firetv://js/bootstrap?profile=' + profileDefinition.name + '"></script>');
            
            // -- if top window, add firetv-class (trigger firetv-ui related bindings)
            if (win.top === win) {
                if (FBTrace.DBG_FIRETV_RESPONSEFILTER) {
                    FBTrace.sysout(rf.CAT + "Top level window, set firetv-class + firetv-profile attribute: " + win.location.href);
                }
                res = res.replace(/(<html[^>]*)>/im, '$1 firetv-class="firetv" firetv-profile="' + profileDefinition.name + '">');
            } else {
                if (FBTrace.DBG_FIRETV_RESPONSEFILTER) {
                    FBTrace.sysout(rf.CAT + "NOT a top level window, set firetv-profile attribute: " + win.location.href);
                }
                // -- setting firetv-profile attribute
                res = res.replace(/(<html[^>]*)>/im, '$1 firetv-profile="' + profileDefinition.name + '">');
            }
            win.addEventListener("DOMContentLoaded", onDOMContentLoaded, false);
            
            // -----------------------------------
            // -- profile dependant replace rules
            var regexp, replaceDef;
            for (k = 0; k < profileDefinition.globalReplace.length; k++) {
            	replaceDef = profileDefinition.globalReplace[k];
              	try {
                    regexp = new RegExp(replaceDef.pattern, replaceDef.flags || "");
                    res = res.replace(regexp, replaceDef.replacement);
                } catch (e){}
            }
            
            // -----------------------------------
            // -- manage inline styles
            var style;
            
            // -- clear already registered sheet
            clearSheet(uri);
            
            // -- processing <style> tags
            _this.utils.regexp.STYLE_TAG_CONTENT.lastIndex = 0;
            while ((style = _this.utils.regexp.STYLE_TAG_CONTENT.exec(res)) !== null) {
                if (style[1]) {
                    parseCSS(uri, style[1], win, profileDefinition);
                }
            }

            var baseRes = "";
            var indexOfBody = res.indexOf("<body");
            if (indexOfBody > -1) {
                baseRes = res.substring(0, indexOfBody);
                res = res.substring(indexOfBody);
            }
            
            // -- procressing inline styles
            _this.utils.regexp.STYLE_INLINE_CONTENT.lastIndex = 0;
            var match;
            var modifs = [];
            
            var filter = (profileDefinition.cssOverloads) ? profileDefinition.cssOverloads : {};
            
            var propertiesText, properties, replacement;
            
            var firetvStyle;
            while ((match = _this.utils.regexp.STYLE_INLINE_CONTENT.exec(res))) {
                if (match[2]) {
                    // -- remove enclosing quotes
                    propertiesText = match[2].substring(1);
                    propertiesText = propertiesText.substring(0, propertiesText.length - 1);
                    properties = _this.CSSUtils.Parser.parseProperties(propertiesText, filter);
                    if (properties.length > 0) {
                        firetvStyle = {};
                        replacement = match[1];
                        for (i = 0; i < properties.length; i++) {
                            replacement += " " + "firetv-" + 
                                properties[i].property + "=\"" + properties[i].value + "\" ";
                            firetvStyle[properties[i].property] = properties[i].value;
                        }
                        replacement += " firetv-css='" + JSON.stringify(firetvStyle) + "' ";
                        modifs.push({
                            "index" : _this.utils.regexp.STYLE_INLINE_CONTENT.lastIndex - match[1].length,
                            "length" : match[1].length,
                            "replacement" : replacement
                        });
                    }
                    
                    
                }
            }
            var parts = [];
            var index = 0;
            for (i = 0; i < modifs.length; i++) {
                parts.push(res.substring(index, modifs[i].index));
                parts.push(" " + modifs[i].replacement + " ");
                index = modifs[i].index + modifs[i].length;
                if (i === modifs.length - 1) {
                    parts.push(res.substring(index));
                }
            }
            if (parts.length > 0) {
                res = parts.join("");
            }
            
            // -- css replacements
            _this.utils.regexp.STYLE_INLINE_CONTENT.lastIndex = 0;
            modifs = [];
            var sep = '"';
            var propName, propValue, property;
            var cssReplacements = (profileDefinition.cssReplacements) ? profileDefinition.cssReplacements : [];
            while ((match = _this.utils.regexp.STYLE_INLINE_CONTENT.exec(res))) {
                if (match[2]) {
                    // -- remove enclosing quotes
                    sep = match[2].charAt(0);
                    propertiesText = match[2].substring(1);
                    propertiesText = propertiesText.substring(0, propertiesText.length - 1);
                    properties = _this.CSSUtils.Parser.parseProperties(propertiesText);
                    if (properties.length > 0) {
                        replacement = " style=" + sep;
                        for (i = 0; i < properties.length; i++) {
                            property = properties[i];
                            propName = property.property;
                            propValue = property.value;
                            for (j = 0; j < cssReplacements.length; j++) {
                                if (cssReplacements[j].property === propName && cssReplacements[j].value === propValue) {
                                    propValue = cssReplacements[j].replacement;
                                    break;
                                }
                            }
                            replacement += propName + ": " + propValue;
                            if (property.important) {
                                replacement += " !important";
                            }
                            if (i < properties.length - 1) {
                                replacement += "; ";
                            }
                        }
                        replacement += sep + " ";
                        modifs.push({
                            "index" : _this.utils.regexp.STYLE_INLINE_CONTENT.lastIndex - match[1].length,
                            "length" : match[1].length,
                            "replacement" : replacement
                        });
                    }
                }
            }
            parts = [];
            index = 0;
            for (i = 0; i < modifs.length; i++) {
                parts.push(res.substring(index, modifs[i].index));
                parts.push(" " + modifs[i].replacement + " ");
                index = modifs[i].index + modifs[i].length;
                if (i === modifs.length - 1) {
                    parts.push(res.substring(index));
                }
            }
            if (parts.length > 0) {
                res = parts.join("");
            }
            
            return baseRes + res;
        };

        rf.filter = function (request, response, contentType, profileDefinition) {
            var channel = request.QueryInterface(Ci.nsIChannel);
            var win = _this.utils.getOriginatingWindowFromChannel(channel);
            var res = null, uri;
            if (contentType === "text/html") {
                res = parseHTML(request.URI.spec, response, win, profileDefinition);
            } else if (contentType === "text/css") {
                uri = (request.referrer) ? request.referrer.spec : request.URI.spec;
                res = parseCSS(uri, response, win, profileDefinition);
            } else if (contentType === "text/javascript") {
                uri = (request.referrer) ? request.referrer.spec : request.URI.spec;
                res = parseJS(uri, response, win, profileDefinition);
            } else {
                res = response;
            }
            return res;
        };

        this.ResponseFilter = rf;
    }).apply(getFireTVPluginInstance());

} catch (exc) {
    alert("[ftv-responsefilter.js] " + exc);
}
