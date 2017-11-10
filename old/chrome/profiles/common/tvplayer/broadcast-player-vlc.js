/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
(function (global) {
	
	var FireTVPlugin = global.FireTVPlugin;
	
	var debug = function () {
		var i;
		var args = ["[VLCBroadcastPlayer." + debug.caller.name + "("];
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
	
	function absolutize(url) {
		var a = global.document.createElement("a");
		a.href = url;
		return a.href;
	}
	
	function VLCBroadcastPlayer(spec) {
		this._objectSpec = spec;
	}

	VLCBroadcastPlayer.prototype = new FireTVPlugin.ObjectBroadcastPlayer();
	VLCBroadcastPlayer.prototype.constructor = VLCBroadcastPlayer;

	var vlcSpec = {
		type: "application/x-fb-vlc",
		className: "firetv-vlc-broadcastplayer",
		params: {
			"windowless": "true",
			"use-proxy": "true",
			"native-scaling": "true",
			"hw-accel": "true",
			"loop": "true",
			"autoplay": "false",
			"bgcolor": "#000000",
			"adjust-filter": "false"
		},
		delegate: {
			_status: "normal",
			createRenderer: function createRenderer() {
				var renderer = document.createElement("object");
				renderer.type = "application/x-fb-vlc";
				return renderer;
			},
			checkLoadStatus: function checkLoadStatus(player, object) {
				return !!object.playlist;
			},
			onload: function onload(player, object) {
//				debug(object);
				var that = this;
				function vlcEventHandler(type) {
//					debug(type, object.id);
					switch (type) {
					case "MediaPlayerPlaying":
						if (that._status === "resuming") {
							that._status = "normal";
							return;
						} else if (that._status !== "normal") {
							return;
						}
						var looping = !!object.firstPlayingEvent;
						if (!looping) {
							FireTVPlugin.bridge.hideOSD();
							if (object.audio) {
								object.audio.volume = player.getVolume();
							}
							player._vlcTryResize();
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
					case "MediaPlayerEncounteredError":
						clearTimeout(player._timeout);
						if (that._status !== "normal") {
							return;
						} 
						object.style.visibility = "hidden";
						player._onRenderingError();
						break;
					case "MediaPlayerStopped":
						clearTimeout(player._timeout);
						if (that._status === "suspending") {
							that._status = "suspended";
							return;
						} else if (that._status !== "normal") {
							return;
						}
						try {
							object._firetvPlayState = player.PlayState.STOPPED;
						} catch (e) {
						}
						break;
					default: 
						break;
					}
				}
				
				function getEventHandler(type) {
					return (function () {
						vlcEventHandler.apply(object, [type]);
					});
				}
				
				function registerEvent(type) {
					object.addEventListener(type, getEventHandler(type), false);
				}
				
				var events = [ "MediaPlayerPlaying", "MediaPlayerEncounteredError", "MediaPlayerStopped" ];
				for (var i = 0; i < events.length; i++) {
					registerEvent(events[i]);
				}
			},
			setVolume: function setVolume(player, object, volume) {
				if (object.audio) {
					object.audio.volume = volume;
				}
			},
			isRendering: function isRendering(player, object) {
				var rendering = false;
				try {
					rendering = object.input.hasVout;
					if (rendering) {
						player._vlcTryResize();
					}
				} catch (e) {
				}
				return rendering;
			},
			startRendering: function startRendering(player, object, url) {
//				debug();
				clearTimeout(player._timeout);
				var options = [":http-user-agent=" + global.navigator.userAgent];
				if (url) {
					url = absolutize(url);
					var res = url.match(/[?&]program=([^&]*)/);
					if (res && res[1]) {
						options.push(":program=" + res[1]);
					}
					object.firstPlayingEvent = false;
					object.playlist.clear();
					object.playlist.addWithOptions(url, options);
				}
				if (this._status === "suspending" || this._status === "suspended") {
					return;
				}
				setTimeout(function () {
					if (object.playlist) {
						if (url) {
							// -- reset url becaus eof strange behaviour when restarting rendering after an error
							object.firstPlayingEvent = false;
							object.playlist.clear();
							object.playlist.addWithOptions(url, options);
						}
						var vlcPlaying = object.libvlc_Playing;
						var playing = object.state === vlcPlaying;
						if (!url && playing && object._firetvPlayState !== player.PlayState.PRESENTING) {
							object._firetvPlayState = player.PlayState.PRESENTING;
						} else {
							object.playlist.play();
							object.input.rate = 1;
						}
					}
				}, 0); // keep it in a timeout because it seems to be blocking in some case
			},
			stopRendering: function stopRendering(player, object) {
//				debug();
				clearTimeout(player._timeout);
				if (object.playlist) {
					object.playlist.stop();
				}
				object.style.visibility = "hidden";
			},
			suspendRendering: function suspendRendering(player, object) {
//				debug();
				clearTimeout(player._timeout);
				if (object.playlist) {
					this._status = "suspending";
					object.playlist.stop();
				} else {
					this._status = "suspended";	
				}
			},
			resumeRendering: function resumeRendering(player, object) {
//				debug();
				clearTimeout(player._timeout);
				this._status = "resuming";
				if (object.playlist) {
					object.playlist.play();
					object.input.rate = 1;
				}
			},
			onParentChange: function onParentChange(player, object, newParent) {
				clearTimeout(player._timeout);
				// -- horrible hack for fbvlc firebreath plugin which hides parentNode native api
				object.parentNode = newParent;
				player._vlcTryResize();
			}
		}
	};

	FireTVPlugin.VLCBroadcastPlayer = new VLCBroadcastPlayer(vlcSpec);
	
	Object.defineProperties(FireTVPlugin.VLCBroadcastPlayer, {
		"_vlcTryResize" : {
			value : function _vlcTryResize() {
				try {
					var vlc = this._object;
					var width = parseInt(vlc.video.width, 10);
					var height = parseInt(vlc.video.height, 10);
					if (width === 0 || height === 0) {
						// force 16:11 ?
//						vlc.style.transform = "scale(1.4545, 1)";
						vlc.style.transform = "";
					} else {
						var playerRatio = vlc.parentNode.clientWidth / vlc.parentNode.clientHeight;
						var videoRatio = width / height;
						if (videoRatio < playerRatio) {
							//  avoid black squares on the sides
							vlc.style.transform = "scale(" + (playerRatio / videoRatio) + ", 1)";
						} else {
							vlc.style.transform = "";
						}
					}
				} catch (e) {
					// -- best effort to have a stretched video 
				}
			},
			writable : false,
			enumerable : false
		}
	});

})(window);
