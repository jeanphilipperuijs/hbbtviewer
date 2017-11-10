/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
(function (global) {

	// HbbTV remote control keys constants definitions.
	// In theory, we could just affect any value to these constants (as the 
	// application should only use the constants as the norm says), but experiment
	// proves that a lot of application use the hardcoded values instead.
	// So affect them values as defined in CE-HTML norm (CEA-2014)
	
	global.KeyEvent.VK_RED   = global.VK_RED    = 403; // "RED";
	global.KeyEvent.VK_GREEN = global.VK_GREEN  = 404; // "GREEN";
	global.KeyEvent.VK_YELLOW = global.VK_YELLOW = 405; // "YELLOW";
	global.KeyEvent.VK_BLUE  = global.VK_BLUE   = 406; // "BLUE";
	
	global.KeyEvent.VK_0 = global.VK_0 = 48; // "0";
	global.KeyEvent.VK_1 = global.VK_1 = 49; // "1";
	global.KeyEvent.VK_2 = global.VK_2 = 50; // "2";
	global.KeyEvent.VK_3 = global.VK_3 = 51; // "3";
	global.KeyEvent.VK_4 = global.VK_4 = 52; // "4";
	global.KeyEvent.VK_5 = global.VK_5 = 53; // "5";
	global.KeyEvent.VK_6 = global.VK_6 = 54; // "6";
	global.KeyEvent.VK_7 = global.VK_7 = 55; // "7";
	global.KeyEvent.VK_8 = global.VK_8 = 56; // "8";
	global.KeyEvent.VK_9 = global.VK_9 = 57; // "9";
	
	global.KeyEvent.VK_UP    = global.VK_UP    = 38; // "UP";
	global.KeyEvent.VK_DOWN  = global.VK_DOWN  = 40; // "DOWN";
	global.KeyEvent.VK_LEFT  = global.VK_LEFT  = 37; // "LEFT";
	global.KeyEvent.VK_RIGHT = global.VK_RIGHT = 39;
	global.KeyEvent.VK_BACK  = global.VK_BACK  = 461;// "BACK";
	global.KeyEvent.VK_ENTER = global.VK_ENTER = 13; // "OK";
	
	global.KeyEvent.VK_STOP       = global.VK_STOP       = 413; // "STOP";
	global.KeyEvent.VK_PLAY_PAUSE = global.VK_PLAY_PAUSE = "PLAY_PAUSE";
	global.KeyEvent.VK_PLAY       = global.VK_PLAY       = 415; // "PLAY";
	global.KeyEvent.VK_PAUSE      = global.VK_PAUSE      = 19; // "PAUSE";
	
	global.KeyEvent.VK_FAST_FWD   = global.VK_FAST_FWD   = 412; // "FORWARD";
	global.KeyEvent.VK_REWIND     = global.VK_REWIND     = 417; // "BACKWARD";
	
	/*** optional values, or unavailable to applications
	global.KeyEvent.VK_NEXT = 425;//"NEXT";
	global.KeyEvent.VK_PREV = 424;//"PREV";
	global.KeyEvent.VK_HOME = "HOME";
	global.KeyEvent.VK_MENU = "MENU";
	global.KeyEvent.VK_GUIDE= "GUIDE";
	global.KeyEvent.VK_TELETEXT     = "TELETEXT";
	global.KeyEvent.VK_SUBTITLES    = "SUBTITLES";
	global.KeyEvent.VK_CHANNEL_UP   = "CHANNEL_UP";
	global.KeyEvent.VK_CHANNEL_DOWN = "CHANNEL_DOWN";
	global.KeyEvent.VK_VOLUME_UP    = "VOLUME_UP";
	global.KeyEvent.VK_VOLUME_DOWN  = "VOLUME_DOWN";
	global.KeyEvent.VK_MUTE         = "MUTE";
	***/
	
	global.KeySet = {
		RED : 0x1,
		GREEN : 0x2,
		YELLOW : 0x4,
		BLUE : 0x8,
		NAVIGATION : 0x10,
		VCR : 0x20,
		SCROLL : 0x40,
		INFO : 0x80,
		NUMERIC : 0x100,
		ALPHA : 0x200,
		OTHER : 0x400,
		value : 0x3ff,
		
		setValue : function setValue(value, otherKeys) {
			this.value = value;
			// otherKeys ignored in hbbtv
		},
		
		filter : function filter(e) {
			var forward = true;
	
			switch (e.keyCode) {
			case global.KeyEvent.VK_RED:
				forward = global.KeySet.value & global.KeySet.RED;
				break;
			case global.KeyEvent.VK_GREEN:
				forward = global.KeySet.value & global.KeySet.GREEN;
				break;
			case global.KeyEvent.VK_YELLOW:
				forward = global.KeySet.value & global.KeySet.YELLOW;
				break;
			case global.KeyEvent.VK_BLUE:
				forward = global.KeySet.value & global.KeySet.BLUE;
				break;
	
			case global.KeyEvent.VK_0:
			case global.KeyEvent.VK_1:
			case global.KeyEvent.VK_2:
			case global.KeyEvent.VK_3:
			case global.KeyEvent.VK_4:
			case global.KeyEvent.VK_5:
			case global.KeyEvent.VK_6:
			case global.KeyEvent.VK_7:
			case global.KeyEvent.VK_8:
			case global.KeyEvent.VK_9:
				forward = global.KeySet.value & global.KeySet.NUMERIC;
				break;
	
			case global.KeyEvent.VK_UP:
			case global.KeyEvent.VK_DOWN:
			case global.KeyEvent.VK_LEFT:
			case global.KeyEvent.VK_RIGHT:
			case global.KeyEvent.VK_BACK:
			case global.KeyEvent.VK_ENTER:
				forward = global.KeySet.value & global.KeySet.NAVIGATION;
				break;
	
			case global.KeyEvent.VK_STOP:
			case global.KeyEvent.VK_PLAY_PAUSE:
			case global.KeyEvent.VK_PLAY:
			case global.KeyEvent.VK_PAUSE:
			case global.KeyEvent.VK_FAST_FWD:
			case global.KeyEvent.VK_REWIND:
				forward = global.KeySet.value & global.KeySet.VCR;
				break;
			}
			if (!forward) {
				if (e.type === "keydown" && typeof global.console !== "undefined" && typeof global.console.info === "function") {
					global.console.info("[KeySet] KeyEvent " + e.keyCode + " filtered");
				}
				e.stopPropagation();
			}
		}
	};
	
	global.addEventListener("keypress", global.KeySet.filter, true);
	global.addEventListener("keydown", global.KeySet.filter, true);

})(window);
