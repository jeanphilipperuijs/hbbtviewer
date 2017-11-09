/* See license.txt for terms of usage */
/*global FireTVPlugin:false */
(function (global) {

	var remote = {};

	var CAT = "[ftv.remote] ";

	var log = function (message, object) {
		if (typeof global.console !== "undefined" && typeof global.console.info === "function") {
			if (object) {
				global.console.info(CAT + message, object);
			} else if (typeof message === "string") {
				global.console.info(CAT + message);
			} else {
				global.console.info(message);
			}
		}
	};

	var event2Shortcut = function (e) {
		var s = '';
		if (e.ctrlKey) {
			s += 'CTRL';
		}
		if (e.altKey) {
			if (s.length > 0) {
				s += '+';
			}
			s += 'ALT';
		}
		if (e.shiftKey) {
			if (s.length > 0) {
				s += '+';
			}
			s += 'SHIFT';
		}
		if (s.length > 0) {
			s += '+';
		}
		
		var code = e.nativeKeyCode;
		if (code === 0) {
			// -- try with charCode, which is not a really good idea ->
			// eventlistener must have been registered on keypress
			code = global.KeyboardEvent["DOM_VK_" + String.fromCharCode(e.charCode).toUpperCase()];
			if (!code) {
				s = "";
				code = String.fromCharCode(e.charCode).toLowerCase();
			}
		}
		s += code;
		return s;
	};

	var mappings;
	
	var event2KeyDefinition = function (e) {
		var shortcut = event2Shortcut(e);
		var i, j, group, groupKeyDefinitions, keyDefinition;
		for (i = 0; i < mappings.length; i++) {
			group = mappings[i];
			groupKeyDefinitions = group.groupKeys;
			for (j = 0; j < groupKeyDefinitions.length; j++) {
				keyDefinition = groupKeyDefinitions[j];
				if (keyDefinition.shortcut === shortcut  || 
						(Array.isArray(keyDefinition.shortcut) && keyDefinition.shortcut.indexOf(shortcut) > -1)) {
					return keyDefinition;
				}
			}
		}
		return {
			id : "UNKNOWN"
		};
	};

	mappings = [ {
		groupId : "NAV_KEYS",
		groupKeys : [ {
			id : "LEFT",
			shortcut : "37",
			displayName : FireTVPlugin.messages["firetv.remote.key.LEFT"],
			shortcutDisplayName : "LEFT"
			
		}, // LEFT
		{
			id : "RIGHT",
			shortcut : "39",
			displayName : FireTVPlugin.messages["firetv.remote.key.RIGHT"],
			shortcutDisplayName : "RIGHT"
		}, // RIGHT
		{
			id : "UP",
			shortcut : "38",
			displayName : FireTVPlugin.messages["firetv.remote.key.UP"],
			shortcutDisplayName : "UP"
		}, // UP

		{
			id : "DOWN",
			shortcut : "40",
			displayName : FireTVPlugin.messages["firetv.remote.key.DOWN"],
			shortcutDisplayName : "DOWN"
		},// DOWN
		{
			id : "OK",
			shortcut : "13",
			displayName : FireTVPlugin.messages["firetv.remote.key.OK"],
			shortcutDisplayName : "RETURN"
		}, // ENTER
		{
			id : "BACK",
			shortcut : "8",
			preventDefault : true,
			displayName : FireTVPlugin.messages["firetv.remote.key.BACK"],
			shortcutDisplayName : "BACKSPACE"
		}, // BACKSPACE
		{
			id : "CANCEL",
			shortcut : "46",
			preventDefault : false,
			displayName : FireTVPlugin.messages["firetv.remote.key.CANCEL"],
			shortcutDisplayName : "DEL"
		}, // SUPPR
		{
			id : "EXIT",
			shortcut : "27",
			displayName : FireTVPlugin.messages["firetv.remote.key.EXIT"],
			shortcutDisplayName : "ESC"
		} // ESCAPE
		]
	}, {
		groupId : "MENU_KEYS",
		groupKeys : [ {
			id : "MENU",
			shortcut : "77",
			displayName : FireTVPlugin.messages["firetv.remote.key.MENU"],
			shortcutDisplayName : "M"
			
		}, // M
		{
			id : "VOD",
			shortcut : "86",
			displayName : FireTVPlugin.messages["firetv.remote.key.VOD"],
			shortcutDisplayName : "V"
		}, // V
		{
			id : "TV",
			shortcut : "84",
			displayName : FireTVPlugin.messages["firetv.remote.key.TV"],
			shortcutDisplayName : "T"
		}, // T
		{
			id : "GUIDE",
			shortcut : "69",
			displayName : FireTVPlugin.messages["firetv.remote.key.GUIDE"],
			shortcutDisplayName : "E"
		},// E
		{
			id : "INFO",
			shortcut : "73",
			displayName : FireTVPlugin.messages["firetv.remote.key.INFO"],
			shortcutDisplayName : "I"
		}, // I
		{
			id : "LIST",
			shortcut : "76",
			displayName : FireTVPlugin.messages["firetv.remote.key.LIST"],
			shortcutDisplayName : "L"
		}, // L
		{
			id : "MOSAIC",
			shortcut : "78",
			displayName : FireTVPlugin.messages["firetv.remote.key.MOSAIC"],
			shortcutDisplayName : "N"
		} // N
		]
	}, {
		groupId : "NUM_KEYS",
		groupKeys : [ {
			id : "0",
			shortcut : ["96", "48", "à", "0"],
			displayName : FireTVPlugin.messages["firetv.remote.key.0"],
			shortcutDisplayName : "0"
		}, // NUMPAD_0
		{
			id : "1",
			shortcut : ["97", "49", "&", "1"],
			displayName : FireTVPlugin.messages["firetv.remote.key.1"],
			shortcutDisplayName : "1"
		}, // NUMPAD_1
		{
			id : "2",
			shortcut : ["98", "50", "\u00E9", "2"],
			displayName : FireTVPlugin.messages["firetv.remote.key.2"],
			shortcutDisplayName : "2"
		}, // NUMPAD_2
		{
			id : "3",
			shortcut : ["99", "51", "\"", "3"],
			displayName : FireTVPlugin.messages["firetv.remote.key.3"],
			shortcutDisplayName : "3"
		}, // NUMPAD_3
		{
			id : "4",
			shortcut : ["100", "52", "'", "4"],
			displayName : FireTVPlugin.messages["firetv.remote.key.4"],
			shortcutDisplayName : "4"
		}, // NUMPAD_4
		{
			id : "5",
			shortcut : ["101", "53", "(", "5"],
			displayName : FireTVPlugin.messages["firetv.remote.key.5"],
			shortcutDisplayName : "5"
		}, // NUMPAD_5
		{
			id : "6",
			shortcut : ["102", "54", "-", "6"],
			displayName : FireTVPlugin.messages["firetv.remote.key.6"],
			shortcutDisplayName : "6"
		}, // NUMPAD_6
		{
			id : "7",
			shortcut : ["103", "55", "\u00E8", "7"],
			displayName : FireTVPlugin.messages["firetv.remote.key.7"],
			shortcutDisplayName : "7"
		}, // NUMPAD_7
		{
			id : "8",
			shortcut : ["104", "56", "_", "8"],
			displayName : FireTVPlugin.messages["firetv.remote.key.8"],
			shortcutDisplayName : "8"
		}, // NUMPAD_8
		{
			id : "9",
			shortcut : ["105", "57", "\u00E7", "9"],
			displayName : FireTVPlugin.messages["firetv.remote.key.9"],
			shortcutDisplayName : "9"
		} // NUMPAD_9
		]
	}, {
		groupId : "CHANNEL_KEYS",
		groupKeys : [ {
			id : "CH_UP",
			shortcut : "CTRL+38",
			displayName : FireTVPlugin.messages["firetv.remote.key.CH_UP"],
			shortcutDisplayName : "CTRL+UP"
		}, // CTRL+UP
		{
			id : "CH_DOWN",
			shortcut : "CTRL+40",
			displayName : FireTVPlugin.messages["firetv.remote.key.CH_DOWN"],
			shortcutDisplayName : "CTRL+DOWN"
		} // CTRL+DOWN
		]
	}, {
		groupId : "COLOR_KEYS",
		groupKeys : [ {
			id : "RED",
			shortcut : "82",
			displayName : FireTVPlugin.messages["firetv.remote.key.RED"],
			shortcutDisplayName : "R"
		}, // R
		{
			id : "GREEN",
			shortcut : "71",
			displayName : FireTVPlugin.messages["firetv.remote.key.GREEN"],
			shortcutDisplayName : "G"
		}, // G
		{
			id : "YELLOW",
			shortcut : "89",
			displayName : FireTVPlugin.messages["firetv.remote.key.YELLOW"],
			shortcutDisplayName : "Y"
		}, // Y
		{
			id : "BLUE",
			shortcut : "66",
			displayName : FireTVPlugin.messages["firetv.remote.key.BLUE"],
			shortcutDisplayName : "B"
		} // B
		]
	}, {
		groupId : "PLAYER_KEYS",
		groupKeys : [ {
			id : "PLAY",
			shortcut : "SHIFT+80",
			displayName : FireTVPlugin.messages["firetv.remote.key.PLAY"],
			shortcutDisplayName : "SHIFT+P"
		}, // shift+P
		{
			id : "PAUSE",
			shortcut : "CTRL+80",
			displayName : FireTVPlugin.messages["firetv.remote.key.PAUSE"],
			preventDefault : true,
			shortcutDisplayName : "CTRL+P"
		}, // control+P
		{
			id : "PLAY_PAUSE",
			shortcut : "80",
			displayName : FireTVPlugin.messages["firetv.remote.key.PLAY_PAUSE"],
			shortcutDisplayName : "P"
		}, // P
		{
			id : "STOP",
			shortcut : "83",
			displayName : FireTVPlugin.messages["firetv.remote.key.STOP"],
			shortcutDisplayName : "S"
		}, // S
		{
			id : "FORWARD",
			shortcut : ["SHIFT+60", ">"],
			displayName : FireTVPlugin.messages["firetv.remote.key.FORWARD"],
			shortcutDisplayName : ">"
		}, // >
		{
			id : "BACKWARD",
			shortcut : ["60", "<"],
			displayName : FireTVPlugin.messages["firetv.remote.key.BACKWARD"],
			shortcutDisplayName : "<"
		}, // <
		{
			id : "NEXT",
			shortcut : "35",
			displayName : FireTVPlugin.messages["firetv.remote.key.NEXT"],
			shortcutDisplayName : "End"
		}, // End
		{
			id : "PREVIOUS",
			shortcut : "36",
			displayName : FireTVPlugin.messages["firetv.remote.key.PREVIOUS"],
			shortcutDisplayName : "Orig"
		}, // Previous
		{
			id : "MUTE",
			shortcut : ["164", "186", "$"],
			displayName : FireTVPlugin.messages["firetv.remote.key.MUTE"],
			shortcutDisplayName : "Dollar"
		}
		]
	}

	];

	remote.defineProfileRemote = function (remote) {
		var keyId, i, j, group, groupKeyDefinitions, keyDefinition;
		for (keyId in remote) {
			if (remote.hasOwnProperty(keyId)) {
				for (i = 0; i < mappings.length; i++) {
					group = mappings[i];
					groupKeyDefinitions = group.groupKeys;
					for (j = 0; j < groupKeyDefinitions.length; j++) {
						keyDefinition = groupKeyDefinitions[j];
						if (keyDefinition.id === keyId) {
							keyDefinition.profileCode = remote[keyId].profileCode;
							if (remote[keyId].icon) {
								keyDefinition.icon = mappings[keyId].icon;
							}
						}
					}

				}
			}
		}
	};

	remote.__defineGetter__("profileRemoteDefinition", function () {
		var remote = [];
		var i, j, group, groupKeyDefinitions, keyDefinition, profileRemoteGroup;
		for (i = 0; i < mappings.length; i++) {
			group = mappings[i];
			groupKeyDefinitions = group.groupKeys;
			profileRemoteGroup = null;
			for (j = 0; j < groupKeyDefinitions.length; j++) {
				keyDefinition = groupKeyDefinitions[j];
				if (keyDefinition.profileCode) {
					if (profileRemoteGroup === null) {
						profileRemoteGroup = {
							groupId : group.groupId,
							groupKeys : []
						};
						remote.push(profileRemoteGroup);
					}
					keyDefinition.shortcutDisplayName = keyDefinition.shortcutDisplayName;
					profileRemoteGroup.groupKeys.push(keyDefinition);
				}
			}

		}
		return remote;
	});

	global.FireTVPlugin.UniversalRemote = remote;

	var origKeyCodeGetter = global.KeyboardEvent.prototype.__lookupGetter__("keyCode");
	global.KeyboardEvent.prototype.__defineGetter__("nativeKeyCode", origKeyCodeGetter);
	global.KeyboardEvent.prototype.__defineGetter__("keyCode", function () {
		if (this.originalTarget != this.target) {
			// -- event was raised on an anonymous node, nothing special to do and avoid future errors
			return origKeyCodeGetter.apply(this, []);
		}
		
		var nodeName = this.originalTarget.nodeName || this.originalTarget.localName;
		if (nodeName) {
			nodeName = nodeName.toLowerCase();
		}
		var type = this.originalTarget.getAttribute("type");
		if (type && type !== "") {
			type = type.toLowerCase();
		} else {
			type = "text";
		}
		var isFromInput = (nodeName === "html:input" && (type === "text" || type === "password")) || 
			(nodeName === "input" && (type === "text" || type === "password")) || 
			(nodeName === "html:textarea") || 
			(nodeName === "textarea");
		var isFromInputOrSelect = isFromInput  || nodeName === "html:select" || nodeName === "select";
		var isFromPluginUi =  isFromInputOrSelect && (/^firetv/.test(this.originalTarget.className));
		if (isFromPluginUi) {
			return origKeyCodeGetter.apply(this, []);
		} else {
			var defaultRemoteControlBehavior = true;
			var nativeCode = this.nativeKeyCode;
			var keyDefinition = event2KeyDefinition(this);
			if (keyDefinition.profileCode) {
				// -- this key has a remote control binding
				if (keyDefinition.preventDefault === true) {
					this.preventDefault();
				}
				if (isFromInput && nativeCode !== global.KeyboardEvent.DOM_VK_UP && 
					nativeCode !== global.KeyboardEvent.DOM_VK_LEFT && 
					nativeCode !== global.KeyboardEvent.DOM_VK_DOWN && 
					nativeCode !== global.KeyboardEvent.DOM_VK_RIGHT)
				{
					this.preventDefault();
				} 
				return parseInt(keyDefinition.profileCode, 10);
			} else {
				// -- this key has no remote control binding (VK_SPACE is for activating IME)
				if (isFromInput && nativeCode !== global.KeyboardEvent.DOM_VK_SPACE) {
					this.stopPropagation();
					this.preventDefault();
				} 
				return nativeCode;
			}
		} 
	});
	
	global.KeyboardEvent.prototype.__defineGetter__("which", function () {
		return this.keyCode;
	});
})(window);
