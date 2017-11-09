/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
(function (global) {
	var debug = function () {
		var i;
		var args = ["[VLCPlayer." + debug.caller.name + "("];
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

	var VLC_CLASSNAME = "firetv-vlc-player";

	function absolutize(url) {
		var a = global.document.createElement("a");
		a.href = url;
		return a.href;
	}
	
	function VLCPlayer() {

	}

	var vlcMediaPlayerPrototype = {
		"setData" : {
			value : function setData(target, val) {
				var vlcApi = this._getVLCApi(target);
				val = absolutize(val);
				if (vlcApi) {
					vlcApi.playlist.clear();
					vlcApi.playlist.addWithOptions(val, [":http-user-agent=" + target.ownerDocument.defaultView.navigator.userAgent]);
				} else {
					if (val !== target._firetvData) {
						target._firetvQueue = [];
					}
					target._firetvData = val;
				}
			},
			writable : false,
			enumerable : true
		},
		"_vlcLoadedCallback" : {
			value : function _vlcLoadedCallback(target) {
				var targetDetail = target._firetvTargetDetails;
				targetDetail.loaded = true;
			
//				debug("[_vlcLoadedCallback] target: " + target + ((target) ? " #" + target.id : ""));
				var vlcApi = null;
				try {
					vlcApi = this._getVLCApi(target);
				} catch (e) {
				}
//				debug("[_vlcLoadedCallback] vlcApi: " + vlcApi);
				if (!vlcApi) {
					return;
				}
				var value;
				if (target.hasOwnProperty("_firetvData")) {
//					debug("[_vlcLoadedCallback] updating data: " +  target._firetvData);
					value = target._firetvData;
					delete target._firetvData;
					this.setData(target, value);
				}
				if (target.hasOwnProperty("_firetvWantedSpeed")) {
//					debug("[_vlcLoadedCallback] calling play() at speed: " +  target._firetvWantedSpeed);
					value = target._firetvWantedSpeed;
					delete target._firetvWantedSpeed;
					this.play(target, value);
				}
			},
			writable : false,
			enumerable : false
		},
		"_getVLCObject" : {
			value : function _getVLCObject(target) {
				var vlc = target.querySelector("." + VLC_CLASSNAME);
				if (vlc) {
					return vlc;
				} else {
					while (target.firstChild) {
						target.removeChild(target.firstChild);
					}
					vlc = target.ownerDocument.createElement("object");
					vlc.setAttribute("type", "application/x-fb-vlc");
					vlc.setAttribute("style", "width:100%; height:100%; position:relative; left:0; top:0; pointer-events: none;");
					vlc.setAttribute("tabindex", "-1");
					vlc.setAttribute("class", VLC_CLASSNAME);
					
					var id = VLC_CLASSNAME + "-" + ("" + Math.random()).substring(2);
					vlc.setAttribute("id", id);
					vlc.setAttribute("name", id);
					
					var param;
					param = target.ownerDocument.createElement("param");
					param.setAttribute("name", "windowless");
					param.setAttribute("value", "true");
					vlc.appendChild(param);
					param = target.ownerDocument.createElement("param");
					param.setAttribute("name", "use-proxy");
					param.setAttribute("value", "true");
					vlc.appendChild(param);
					param = target.ownerDocument.createElement("param");
					param.setAttribute("name", "native-scaling");
					param.setAttribute("value", "true");
					vlc.appendChild(param);
					param = target.ownerDocument.createElement("param");
					param.setAttribute("name", "hw-accel");
					param.setAttribute("value", "true");
					vlc.appendChild(param);
					param = target.ownerDocument.createElement("param");
					param.setAttribute("name", "autoplay");
					param.setAttribute("value", "false");
					vlc.appendChild(param);
//					param = target.ownerDocument.createElement("param");
//					param.setAttribute("name", "debug");
//					param.setAttribute("value", "true");
//					vlc.appendChild(param);
					param = target.ownerDocument.createElement("param");
					param.setAttribute("name", "bgcolor");
					param.setAttribute("value", "#000000");
					vlc.appendChild(param);
					param = target.ownerDocument.createElement("param");
					param.setAttribute("name", "adjust-filter");
					param.setAttribute("value", "false");
					vlc.appendChild(param);

					var mode = "video";
					if (target.type.match(/audio\//)) {
						mode = "audio";
					}
					
					var targetDetail = {
						vlcId : id,
						loaded: false,
						error: false,
						queue: []
					};
					target._firetvTargetDetails = targetDetail;
					
					vlc.firebugIgnore = !FireTVPlugin.DBG;
					
					var that = this;
					var start = new Date().getTime();
					var interval = setInterval(function _checkPluginLoading() {
						var now = new Date().getTime();
//						debug("checking vlc at t+" + (now - start) + "ms.");
						var api = that._getVLCApi(target);
						if (api) {
							clearInterval(interval);
//							debug("vlc loaded vlc at t+" + (now - start) + "ms.");
							that._vlcLoadedCallback(target);
						}
						if ((now - start) > 6000) {
							clearInterval(interval);
							target._firetvPlayState = PlayState.ERROR;
							target._firetvError = ErrorState.UNIDENTIFIED_ERROR;
							that._callOnPlayStateChange(target);
							global.console.warn("[FireTV] VLC mediaplayer NOT loaded after 6s. Giving up.");
						}
					}, 100);
					target.appendChild(vlc);
					vlc.parentNode = target; // -- horrible hack for fbvlc firebreath plugin which hides parentNode native api
					return vlc;
				}
			},
			writable : false
		},

		"_getVLCApi" : {
			value : function _getVLCApi(target) {
				var vlc = this._getVLCObject(target);
				var targetDetail = target._firetvTargetDetails;
				if (targetDetail && targetDetail.error) {
					return null;
				}
				if (targetDetail && !targetDetail.firstAccessDate) {
					targetDetail.firstAccessDate = new Date().getTime(); 
				}
				var ready = false;
				try {
					ready = !!vlc.input;
				} catch (e) {
				}
				if (ready) {
					if (!vlc.eventsRegistered) {
						vlc.eventsRegistered = true;
						var that = this;
						var vlcEventHandler = function (target, type) {
							that._checkPlayState(target);
						};
						var getEventHandler = function (type) {
							return (function () {
								vlcEventHandler.apply(vlc, [target, type]);
							});
						};
						var registerEvent = function (type) {
							vlc.addEventListener(type, getEventHandler(type), false);
						};
//						var events = [
//							"Play", "Pause", "Stop", 
//							"MediaPlayerNothingSpecial", "MediaPlayerOpening", "MediaPlayerBuffering",
//							"MediaPlayerPlaying", "MediaPlayerPaused", "MediaPlayerForward", "MediaPlayerBackward", 
//							"MediaPlayerEncounteredError", "MediaPlayerEndReached", "MediaPlayerStopped", "MediaPlayerTimeChanged",
//							"MediaPlayerPositionChanged", "MediaPlayerSeekableChanged", "MediaPlayerPausableChanged"
//						];
						var events = [
							"MediaPlayerOpening", "MediaPlayerBuffering", "MediaPlayerPlaying", "MediaPlayerPaused", 
							"MediaPlayerEncounteredError", "MediaPlayerEndReached", "MediaPlayerStopped"
						];
						var i;
						for (i = 0; i < events.length; i++) {
							registerEvent(events[i]);
						}
					}
					return vlc;
				} else {
					return null;
				}
			},
			writable : false,
			enumerable : false
		},
		"_checkPlayState" : {
			value : function _checkPlayState(target) {
				var vlcApi = this._getVLCApi(target);
				if (vlcApi) {
					var prevState = target._firetvPlayState;
					var newState = this.getPlayState(target);
					if (newState === PlayState.PLAYING) {
						this._vlcTryResize(target);
					}
					if (prevState !== newState) {
						target._firetvPlayState = newState;
						this._callOnPlayStateChange(target);
					}
				}
			},
			writable : true,
			enumerable : false
		},
		"_vlcTryResize" : {
			value : function _vlcTryResize(target) {
				try {
					target.style.overflow = "hidden";
					var vlc = target.firstChild;
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
		},
		// -- real media player API
		"getPlayPosition" : {
			value : function getPlayPosition(target) {
				var vlcApi = this._getVLCApi(target);
				if (vlcApi) {
					return vlcApi.input.time;
				} else {
					return 0;
				}
			},
			writable : false,
			enumerable : true
		},
		"getPlayTime" : {
			value : function getPlayTime(target) {
				var vlcApi = this._getVLCApi(target);
				if (vlcApi) {
					return vlcApi.input.length;
				} else {
					return undefined;
				}
			},
			writable : false,
			enumerable : true
		},
		"getPlayState" : {
			value : function getPlayState(target) {
				var vlcApi = this._getVLCApi(target);
				if (vlcApi) {
					var vlcState = vlcApi.state;
					var ret;
					if (vlcApi.libvlc_Opening === vlcState) {
					    ret = PlayState.CONNECTING;
					} else if (vlcApi.libvlc_Buffering === vlcState) {
					    ret = PlayState.BUFFERING;
					} else if (vlcApi.libvlc_Playing === vlcState) {
					    ret = PlayState.PLAYING;
					} else if (vlcApi.libvlc_Paused === vlcState) {
					    ret = PlayState.PAUSED;
					} else if (vlcApi.libvlc_Stopped === vlcState) {
					    ret = PlayState.STOPPED;
					} else if (vlcApi.libvlc_Ended === vlcState) {
						if (target._firetvPlayState === PlayState.CONNECTING) {						
							ret = PlayState.ERROR;
							target._firetvError = ErrorState.AV_FORMAT_NOT_SUPPORTED;
						} else if (target._firetvPlayState === PlayState.ERROR) {
							ret = PlayState.ERROR;
						} else {
							if (target._firetvQueue && target._firetvQueue.length > 0) {
								vlcApi.playlist.clear();
								var uri = target._firetvQueue.splice(0, 1)[0];
								if (uri) {
									vlcApi.playlist.addWithOptions(uri, [":http-user-agent=" + target.ownerDocument.defaultView.navigator.userAgent]);
									ret = PlayState.CONNECTING;
									this.play(target);
									return;
								} 
							}
							ret = PlayState.FINISHED;
						}
					} else if (vlcApi.libvlc_Error === vlcState) {
					    ret = PlayState.ERROR;
					    target._firetvError = ErrorState.UNIDENTIFIED_ERROR;
					} else {
						ret = PlayState.STOPPED;
					}
					target._firetvPlayState = ret;
					return ret;
				} else {
					if (typeof target._firetvPlayState !== "undefined") {
						return target._firetvPlayState;
					}
					return PlayState.STOPPED;
				}
			},
			writable : false,
			enumerable : true
		},
		"getError" : {
			value : function getError(target) {
				var vlcApi = this._getVLCApi(target);
				if (vlcApi) {
					if (target.hasOwnProperty("_firetvError")) {
						return target._firetvError;
					}
					// TODO map vlc error states to ours
					return ErrorState.UNIDENTIFIED_ERROR; //vlcApi.call(this._getVLCObject(target), "get", "error");
				} else {
					if (target.hasOwnProperty("_firetvError")) {
						return target._firetvError;
					}
					return ErrorState.UNIDENTIFIED_ERROR;//return undefined;
				}
			},
			writable : false,
			enumerable : true
		},
		"getSpeed" : {
			value : function getSpeed(target) {
				var vlcApi = this._getVLCApi(target);
				if (vlcApi) {
					return vlcApi.input.rate;
				} else {
					return 0;
				}
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
				var vlcApi = this._getVLCApi(target);
				if (vlcApi) {
					if (target._firetvData) {
						this.setData(target, target._firetvData);
						delete target._firetvData;
					}
					vlcApi.playlist.play();
					vlcApi.input.rate = speed;
					if ((vlcApi.playlist.isPlaying && speed === 0) || (!vlcApi.playlist.isPlaying && speed > 0)) {
						vlcApi.playlist.togglePause();
					}
				} else {
					if (target._firetvPlayState !== PlayState.PAUSED && target._firetvPlayState !== PlayState.PLAYING) {
						target._firetvPlayState = PlayState.CONNECTING;
					}
					target._firetvWantedSpeed = speed;
				}
			},
			writable : false,
			enumerable : true
		},
		"stop" : {
			value : function stop(target) {
				var vlcApi = this._getVLCApi(target);
				if (vlcApi) {
					if (vlcApi.playlist.isPlaying) {
						vlcApi.playlist.togglePause();
					}
					vlcApi.input.time = 0;
				} else {
					delete target._firetvWantedSpeed;
					target._firetvQueue = [];
					target._firetvPlayState = PlayState.STOPPED;
				}
			},
			writable : false,
			enumerable : true
		},
		"seek" : {
			value : function seek(target, positionInMilliseconds) {
				var vlcApi = this._getVLCApi(target);
				if (vlcApi) {
					vlcApi.input.time = positionInMilliseconds;
					return true;
				} else {
					return false;
				}
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
					var vlc = this._getVLCObject(target);
					if (fullScreen === true) {
						var bodyBounds = target.ownerDocument.body.getBoundingClientRect();
						target.style.overflow = "visible";
						vlc.style.width = FireTVPlugin.profileDefinition.resolution.width + "px";
						vlc.style.height = FireTVPlugin.profileDefinition.resolution.height + "px";
						vlc.style.position = "fixed";
						vlc.style.top = "0";
						vlc.style.left = "0";
					} else {
						target.style.overflow = "hidden";
						vlc.style.position = "absolute";
						vlc.style.width = "100%";
						vlc.style.height = "100%";
						vlc.style.top = "0";
						vlc.style.left = "0";
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

	Object.defineProperties(VLCPlayer.prototype, vlcMediaPlayerPrototype);

	FireTVPlugin.VLCPlayer = new VLCPlayer();

})(window);
