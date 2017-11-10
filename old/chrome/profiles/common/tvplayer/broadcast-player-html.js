/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
(function (global) {
	
	var FireTVPlugin = global.FireTVPlugin;
	
	var debug = function () {
		var i;
		var args = ["[HTMLBroadcastPlayer." + debug.caller.name + "("];
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
	
	function HTMLBroadcastPlayer(spec) {
		this._objectSpec = spec;
	}

	HTMLBroadcastPlayer.prototype = new FireTVPlugin.ObjectBroadcastPlayer();
	HTMLBroadcastPlayer.prototype.constructor = HTMLBroadcastPlayer;

	var htmlSpec = {
		type: "video/mp4",
		className: "firetv-html-broadcastplayer",
		params: {},
		delegate: {
			_status: "normal",
			_playing: false,
			_pauseCalledExplicitly: false,
			createRenderer: function createRenderer() {
				var renderer = document.createElement("video");
				renderer.type = "video/mp4";
				renderer.setAttribute("loop", "true");
				renderer.setAttribute("autoplay", "false");
				return renderer;
			},
			checkLoadStatus: function checkLoadStatus(player, object) {
				return true;
			},
			onload: function onload(player, object) {
//				debug(object);
				var that = this;
				function onPlayStateChange(event) {
					switch (event.type) {
					case "playing":
						that._playing = true;
						that._pauseCalledExplicitly = false;
						if (that._status === "resuming") {
							that._status = "normal";
							return;
						} else if (that._status !== "normal") {
							return;
						}
						var looping = !!object.firstPlayingEvent;
						if (!looping) {
							FireTVPlugin.bridge.hideOSD();
							object.volume = player.getVolume() / 100;
							object.style.visibility = "inherit";
							object._firetvPlayState = player.PlayState.PRESENTING;

							// -- delayed checks for crypted channels
							clearTimeout(player._timeout);
							player._timeout = setTimeout(function () {
								if (that._status === "normal" && !that.isRendering(player, object)) {
									//  -- false positive, maybe a crypted channel or an invalid pid (no error is raised by vlc in that case
									object.style.visibility = "hidden";
									that.stopRendering(player, object);
									player._onRenderingError();
								}
							}, 10000);
						} else {
							object.style.visibility = "inherit";
							object._firetvPlayState = player.PlayState.PRESENTING;
						}
						if (!object.firstPlayingEvent) {
							object.firstPlayingEvent = true;
						}
						break;
					case "pause":
						clearTimeout(player._timeout);
						that._playing = false;
						if (that._status === "suspending") {
							that._status = "suspended";
							return;
						} else if (that._status !== "normal") {
							return;
						}
						if (!that._pauseCalledExplicitly) {
							// -- pause state must have been triggered by a DOM move, restart it instantly and return;
							object.play();
							return;
						}
						try {
							object._firetvPlayState = player.PlayState.STOPPED;
						} catch (e) {
						}
						break;
					case "error":
						clearTimeout(player._timeout);
						that._playing = false;
						if (that._status !== "normal") {
							return;
						} 
						object.style.visibility = "hidden";
						player._onRenderingError();
						break;
					}
				}
				object.addEventListener("playing", onPlayStateChange, true);
				object.addEventListener("pause", onPlayStateChange, true);
				object.addEventListener("error", onPlayStateChange, true);
			},
			setVolume: function setVolume(player, object, volume) {
				object.volume = volume / 100;
			},
			isRendering: function isRendering(player, object) {
				return this._playing;
			},
			startRendering: function startRendering(player, object, url) {
//				debug();
				clearTimeout(player._timeout);
				if (url) {
					object.firstPlayingEvent = false;
					object.src = url;
				}
				if (this._status === "suspending" || this._status === "suspended") {
					return;
				}
				var that = this;
				setTimeout(function () {
					if (url) {
						// -- reset url becaus eof strange behaviour when restarting rendering after an error
						object.firstPlayingEvent = false;
						object.src = url;
					}
					if (!url && that._playing && object._firetvPlayState !== player.PlayState.PRESENTING) {
						object._firetvPlayState = player.PlayState.PRESENTING;
					} else {
						object.play();
					}
				}, 0); // keep it in a timeout because it seems to be blocking in some case
			},
			stopRendering: function stopRendering(player, object) {
//				debug();
				clearTimeout(player._timeout);
				this._pauseCalledExplicitly = true;
				object.pause();
				object.style.visibility = "hidden";
			},
			suspendRendering: function suspendRendering(player, object) {
//				debug();
				clearTimeout(player._timeout);
				this._status = "suspending";
				this._pauseCalledExplicitly = true;
				object.style.visibility = "hidden";
				object.pause();
			},
			resumeRendering: function resumeRendering(player, object) {
//				debug();
				clearTimeout(player._timeout);
				this._status = "resuming";
				object.style.visibility = "inherit";
				object.play();
			},
			onParentChange: function (player, object, newParent) {
			}
		}
	};

	FireTVPlugin.HTMLBroadcastPlayer = new HTMLBroadcastPlayer(htmlSpec);
})(window);
