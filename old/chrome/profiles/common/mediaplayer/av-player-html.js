/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
(function (global) {
	var debug = function () {
		var i;
		var args = ["[HTMLPlayer." + debug.caller.name + "("];
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
//		global.console.log.apply(console, args);
	};

	var PlayState = {
		STOPPED : 0,
		PLAYING : 1,
		PAUSED : 2,
		CONNECTING : 3,
		BUFFERING : 4,
		FINISHED : 5,
		ERROR : 6
	};
	
	var ErrorState = {
		AV_FORMAT_NOT_SUPPORTED: 0,
		CANNOT_CONNECT_TO_SERVER: 1,
		UNIDENTIFIED_ERROR: 2
	};

	var HTML_CLASSNAME = "firetv-html-player";

	function HTMLPlayer() {

	}

	var htmlMediaPlayerPrototype = {
		"setData" : {
			value : function setData(target, val) {
				var object = this._getHTMLObject(target);
				if (val && val.trim() !== "") {
					object.src = val;
				}
				target._firetvQueue = [];
			},
			writable : false,
			enumerable : true
		},
		"_getHTMLObject" : {
			value : function _getHTMLObject(target) {
				var object = target.querySelector("." + HTML_CLASSNAME);
				if (object) {
					return object;
				} else {
					while (target.firstChild) {
						target.removeChild(target.firstChild);
					}

					var tag = "video";
					if (target.type.match(/audio\//)) {
						tag = "audio";
					}
					
					object = target.ownerDocument.createElement(tag);
					object.setAttribute("type", target.type.replace(/\+firetv$/, ""));
					object.setAttribute("style", "width:100%; height:100%; position:relative; left:0; top:0; pointer-events: none; background-color: #000000");
					object.setAttribute("tabindex", "-1");
					object.setAttribute("class", HTML_CLASSNAME);
					
					var id = HTML_CLASSNAME + "-" + ("" + Math.random()).substring(2);
					object.setAttribute("id", id);
					object.setAttribute("name", id);
					object.firebugIgnore = !FireTVPlugin.DBG;
					
					var that = this;
					var setPlayState = function (playState) {
						if (object._firetvPlayState !== playState) {
							object._firetvPlayState = playState;
							that._callOnPlayStateChange(target);
						}
					};
					
					var onPlayStateChange = function (event) {
						switch (event.type) {
						case "playing":
							setPlayState(PlayState.PLAYING);
							break;
						case "pause":
							if (object._firetvWaitingRewind) {
								return;
							}
							if (!object.ended) {
								setPlayState(PlayState.PAUSED);
							}
							break;
						case "error":
							if (object.error) {
								switch (object.error.code) {
								case object.error.MEDIA_ERR_NETWORK:
									target._firetvError = ErrorState.CANNOT_CONNECT_TO_SERVER;
									break;
								case object.error.MEDIA_ERR_DECODE:
								case object.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
									target._firetvError = ErrorState.AV_FORMAT_NOT_SUPPORTED;
									break;
//								case object.error.MEDIA_ERR_ABORTED:
								default:
									target._firetvError = ErrorState.UNIDENTIFIED_ERROR;
									break;
								}
							} else {
								target._firetvError = ErrorState.UNIDENTIFIED_ERROR;
							}
							setPlayState(PlayState.ERROR);
							break;
						case "ended":
							if (target._firetvQueue && target._firetvQueue.length > 0) {
								var uri = target._firetvQueue.splice(0, 1)[0];
								if (uri && uri.trim() !== "") {
									object.src = uri;
									setPlayState(PlayState.CONNECTING);
									this.play(target);
									return;
								} 
							}
							setPlayState(PlayState.FINISHED);
							break;
						case "waiting":
							if (object._firetvWaitingRewind) {
								return;
							}
							if (that.getPlayState(target) === PlayState.STOPPED) {
								setPlayState(PlayState.CONNECTING);
							} else {
								setPlayState(PlayState.BUFFERING);
							}
							break;
						case "seeking":
							if (object._firetvWaitingRewind) {
								return;
							}
							setPlayState(PlayState.BUFFERING);
							break;
						case "seeked":
							if (object._firetvWaitingRewind) {
								setPlayState(PlayState.STOPPED);
								object._firetvWaitingRewind = false;
							}
							break;
						default:
							break;
						}
					};
					
					object.addEventListener("playing", onPlayStateChange, true);
					object.addEventListener("pause", onPlayStateChange, true);
					object.addEventListener("error", onPlayStateChange, true);
					object.addEventListener("ended", onPlayStateChange, true);
					object.addEventListener("waiting", onPlayStateChange, true);
					object.addEventListener("seeking", onPlayStateChange, true);
					object.addEventListener("seeked", onPlayStateChange, true);
					target.appendChild(object);
					return object;
				}
			},
			writable : false
		},
		
		// -- real media player API
		"getPlayPosition" : {
			value : function getPlayPosition(target) {
				var object = this._getHTMLObject(target);
				return (!isNaN(object.currentTime)) ? object.currentTime * 1000 : 0;
			},
			writable : false,
			enumerable : true
		},
		"getPlayTime" : {
			value : function getPlayTime(target) {
				var object = this._getHTMLObject(target);
				return (object.duration !== 0) ? object.duration * 1000 : undefined;
			},
			writable : false,
			enumerable : true
		},
		"getPlayState" : {
			value : function getPlayState(target) {
				var object = this._getHTMLObject(target);
				if (object.hasOwnProperty("_firetvPlayState")) {
					return object._firetvPlayState;
				}
				return PlayState.STOPPED;
			},
			writable : false,
			enumerable : true
		},
		"getError" : {
			value : function getError(target) {
				if (target.hasOwnProperty("_firetvError")) {
					return target._firetvError;
				}
				return ErrorState.UNIDENTIFIED_ERROR;
			},
			writable : false,
			enumerable : true
		},
		"getSpeed" : {
			value : function getSpeed(target) {
				var object = this._getHTMLObject(target);
				return (this.getPlayState(target) === PlayState.PLAYING) ? object.playbackRate : 0;
			},
			writable : false,
			enumerable : true
		},
		"getOnPlayStateChange" : {
			value : function getOnPlayStateChange(target) {
				return target._firetvOnPlayStateChangeHandler || null;
			},
			writable : false,
			enumerable : true
		},
		"setOnPlayStateChange" : {
			value : function setOnPlayStateChange(target, val) {
				target._firetvOnPlayStateChangeHandler = val;
			},
			writable : false,
			enumerable : true
		},
		"_callOnPlayStateChange" : {
			value : function _callOnPlayStateChange(target) {
				var playState = this.getPlayState(target);
				switch (playState) {
				case PlayState.STOPPED:
				case PlayState.ERROR:
					global.FireTVPlugin.bridge.dispatchEvent({
						type: "firetv-broadcast-resume-request",
						reason: "stoppedOrError",
						target: target
					});
					break;
				}
				var callback = this.getOnPlayStateChange(target);
				if (callback) {
					callback();
				}
			},
			writable : false,
			enumerable : true
		},
		"play" : {
			value : function play(target, speed) {
//				debug("play", target, speed)
				var object = this._getHTMLObject(target);
				if (speed === 0) {
					object.pause();
				} else {
					object.play();
					object.playbackRate = speed;
				}
			},
			writable : false,
			enumerable : true
		},
		"stop" : {
			value : function stop(target) {
				var object = this._getHTMLObject(target);
				var playState = this.getPlayState(target);
				if (playState === PlayState.PLAYING) {
					object._firetvWaitingRewind = true;
					object.pause();
					object.currentTime = 0;
				}
			},
			writable : false,
			enumerable : true
		},
		"seek" : {
			value : function seek(target, positionInMilliseconds) {
				var object = this._getHTMLObject(target);
				var seekPosition = positionInMilliseconds;
				var res;
				if (!isNaN(seekPosition)) {
					var ranges = object.seekable;
					var i, canSeek = false;
					for (i = 0; i < ranges.length; i++) {
						if ((seekPosition >= ranges.start(i) * 1000) && (seekPosition <= ranges.end(i) * 1000)) {
							canSeek = true;
							break;
						}
					}
					if (canSeek) {
						object.currentTime = seekPosition / 1000;
						res = true;
					}
				} else {
					res = false;
				}
				return res;
			},
			writable : false,
			enumerable : true
		},
		"queue" : {
			value : function queue(target, uri) {
				if (uri === null) {
					target._firetvQueue = [];
					return true;
				} else {
					if (!target._firetvQueue) {
						target._firetvQueue = [];
					}
					if (target._firetvQueue.indexOf(uri) > -1) {
						return false;
					} else {
						if (target._firetvData && typeof target._firetvWantedSpeed === "undefined") {
							delete target._firetvData;
						}
						target._firetvQueue.push(uri);
						if (target._firetvQueue.length === 1 && 
							(target._firetvPlayState === PlayState.ERROR || target._firetvPlayState === PlayState.STOPPED || target._firetvPlayState === PlayState.FINISHED)) 
						{
							this.setData(target, target._firetvQueue.splice(0, 1)[0]);
							this.play(target, 1);
						}
						return true;
					}
				}
			},
			writable : false,
			enumerable : true
		},

		"getFullScreen" : {
			value : function getFullScreen(target) {
				if (!target.hasOwnProperty("firetvFullscreen")) {
					target.firetvFullscreen = false;
				}
				return target.firetvFullscreen;
			},
			writable : false,
			enumerable : true
		},
		"getOnFullScreenChange" : {
			value : function getOnFullScreenChange(target) {
				if (!target.hasOwnProperty("firetvOnFullScreenChange")) {
					target.firetvOnFullScreenChange = null;
				}
				return target.firetvOnFullScreenChange;
			},
			writable : false,
			enumerable : true
		},
		"setOnFullScreenChange" : {
			value : function setOnFullScreenChange(target, val) {
				target.firetvOnFullScreenChange = val;
			},
			writable : false,
			enumerable : true
		},
		"setFullScreen" : {
			value : function setFullScreen(target, fullScreen) {
				if (!target.hasOwnProperty("firetvFullscreen")) {
					target.firetvFullscreen = false;
				}
				target.setAttribute("firetv-fullscreen", fullScreen);
				
				if (fullScreen !== target.firetvFullscreen) {
					var object = this._getHTMLObject(target);
					if (fullScreen === true) {
						target.style.overflow = "visible";
						object.style.width = FireTVPlugin.profileDefinition.resolution.width + "px";
						object.style.height = FireTVPlugin.profileDefinition.resolution.height + "px";
						object.style.position = "fixed";
						object.style.top = "0";
						object.style.left = "0";
					} else {
						target.style.overflow = "hidden";
						object.style.position = "absolute";
						object.style.width = "100%";
						object.style.height = "100%";
						object.style.top = "0";
						object.style.left = "0";
					}
					target.firetvFullscreen = fullScreen;
					if (target.onFullScreenChange) {
						target.onFullScreenChange.apply(this, []);
					}
				}
			},
			writable : false,
			enumerable : true
		}
	};

	Object.defineProperties(HTMLPlayer.prototype, htmlMediaPlayerPrototype);

	FireTVPlugin.HTMLPlayer = new HTMLPlayer();

})(window);
