/* See license.txt for terms of usage */
(function (global) {
	
	var FireTVPlugin = global.FireTVPlugin;
	
	var debug = function () {
		var i;
		var args = ["[SVGBroadcastPlayer." + debug.caller.name + "("];
		for (i = 0; i < debug.caller["arguments"].length; i++) {
			args[0] +=  debug.caller["arguments"][i];
			args.push(debug.caller["arguments"][i]);
			if (i < debug.caller["arguments"].length - 1) {
				args[0] += ", ";
			}
		}
		args[0] += ")]";
		for (i = 0; i < arguments.length; i++) {
			args.push(arguments[i]);
		}
//		global.console.log.apply(global.console, args);
	};

	var enumerable = FireTVPlugin.DBG;
	
	function SVGBroadcastPlayer(spec) {
		this._objectSpec = spec;
	}

	SVGBroadcastPlayer.prototype = new FireTVPlugin.ObjectBroadcastPlayer();
	SVGBroadcastPlayer.prototype.constructor = SVGBroadcastPlayer;

	var svgSpec = {
		type: "image/png",
		className: "firetv-svg-broadcastplayer",
		params: {},
		delegate: {
			_rendering: false,
			createRenderer: function () {
				// -- switched to <img> instead of <object> because of : https://bugzilla.mozilla.org/show_bug.cgi?id=889821
				// TODO restore <object> once solved -> avoid broken icon while loading
				// -- solved from FF23, switched back to object
//				var renderer = document.createElement("img");
				var renderer = document.createElement("object");
				return renderer;
			},
			checkLoadStatus: function (player, object) {
//				return object.complete;
				return true;
			},
			onload: function (player, object) {
			},
			setVolume: function (player, object, volume) {
			},
			isRendering: function (player, object) {
//				var res = object.src !== "" && object.style.visibility !== "hidden";
				var res = object.data !== "" && object.style.visibility !== "hidden";
				return res;
			},
			startRendering: function (player, object, url) {
//				debug();
//				object.setAttribute("src", "tv://?ccid=" + object._firetvCurrentChannel + "&rand=" + Math.random());
				object.setAttribute("data", "tv://?ccid=" + object._firetvCurrentChannel + "&rand=" + Math.random());
				FireTVPlugin.bridge.hideOSD();
				object.style.visibility = "inherit";
				object._firetvPlayState = player.PlayState.PRESENTING;
			},
			stopRendering: function (player, object) {
//				debug();
				object.style.visibility = "hidden";
				object._firetvPlayState = player.PlayState.STOPPED;
			},
			suspendRendering: function (player, object) {
//				debug();
				object.style.visibility = "hidden";
			},
			resumeRendering: function (player, object) {
//				debug();
				object.style.visibility = "visible";
			},
			onParentChange: function (player, object, newParent) {
			}
		}
	};

	FireTVPlugin.SVGBroadcastPlayer = new SVGBroadcastPlayer(svgSpec);
})(window);
