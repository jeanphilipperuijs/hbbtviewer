/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
(function (global) {
	var debug = function () {
		var i;
		var args = ["[SVGPlayer." + debug.caller.name + "("];
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

	var SVG_CLASSNAME = "firetv-svg-player";

	function SVGPlayer() {

	}

	var svgMediaPlayerPrototype = {
		"setData" : {
			value : function setData(target, val) {
				var svgApi = this._getSVGApi(target);
				if (svgApi) {
					svgApi.data = val;
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

		"_getSVGObject" : {
			value : function _getSVGObject(target) {
				var svg = target.querySelector("." + SVG_CLASSNAME);
				if (svg) {
					return svg;
				} else {
					var pos = target.ownerDocument.defaultView.getComputedStyle(target, null).position;
					if (pos !== "absolute" && pos !== "relative") {
						target.style.position = "relative";
					}
					while (target.firstChild) {
						target.removeChild(target.firstChild);
					}
					svg = target.ownerDocument.createElement("object");
					svg.setAttribute("type", "image/svg+xml");
					svg.setAttribute("style", "width:100%; height:100%; position:relative; left:0; top:0; pointer-events: none;");
					svg.setAttribute("tabindex", "-1");
					svg.setAttribute("class", SVG_CLASSNAME);
					
					var id = SVG_CLASSNAME + "-" + ("" + Math.random()).substring(2);
					svg.setAttribute("id", id);
					svg.setAttribute("name", id);

					var that = this;
					var origTarget = target;
					var callback = function (event) {
						event.target.removeEventListener("load", callback, false);
						debug("[_svgLoadedCallback]");
						var api = that._getSVGApi(origTarget);
						if (origTarget.hasOwnProperty("_firetvPlayState")) {
							debug("[_svgLoadedCallback] updating playstate: " +  origTarget._firetvPlayState);
							api._playState = origTarget._firetvPlayState;
						}
						if (origTarget.hasOwnProperty("_firetvOnPlayStateChange")) {
							debug("[_svgLoadedCallback] updating onPlayStateChange: " +  origTarget._firetvOnPlayStateChange);
							api.onPlayStateChange = origTarget._firetvOnPlayStateChange;
						}
						if (origTarget.hasOwnProperty("_firetvData")) {
							debug("[_svgLoadedCallback] updating data: " +  origTarget._firetvData);
							api.data = origTarget._firetvData;
						}
						if (origTarget.hasOwnProperty("_firetvWantedSpeed")) {
							debug("[_svgLoadedCallback] calling play() at speed: " +  origTarget._firetvWantedSpeed);
							api.play(origTarget._firetvWantedSpeed);
						}
						if (origTarget.hasOwnProperty("_firetvQueue")) {
							var i;
							for (i = 0; i < origTarget._firetvQueue.length; i++) {
								debug("[_svgLoadedCallback] updating queue item: " +  origTarget._firetvQueue[i]);
								api.queue(origTarget._firetvQueue[i]);
							}
						}
						
						delete origTarget._firetvQueue;
						delete origTarget._firetvData;
						delete origTarget._firetvPlayState;
						delete origTarget._firetvOnPlayStateChange;
						delete origTarget._firetvWantedSpeed;
					};
					svg.addEventListener("load", callback, false);
					
					svg.setAttribute("data", "tv://?mediaplayer=true");
					svg.firebugIgnore = !FireTVPlugin.DBG;
					target.appendChild(svg);
					return svg;
				}
			},
			writable : false
		},

		"_getSVGApi" : {
			value : function _getSVGApi(target) {
				var svg = this._getSVGObject(target);
				if (svg.contentDocument) {
					return svg.contentDocument.defaultView.SVGPlayer;
				} else {
					return null;
				}
			},
			writable : false,
			enumerable : false
		},

		// -- real media player API
		"getPlayPosition" : {
			value : function getPlayPosition(target) {
				var svgApi = this._getSVGApi(target);
				if (svgApi) {
					return svgApi.playPosition;
				} else {
					return 0;
				}
			},
			writable : false,
			enumerable : true
		},
		"getPlayTime" : {
			value : function getPlayTime(target) {
				var svgApi = this._getSVGApi(target);
				if (svgApi) {
					return svgApi.playTime;
				} else {
					return undefined;
				}
			},
			writable : false,
			enumerable : true
		},
		"getPlayState" : {
			value : function getPlayState(target) {
				var svgApi = this._getSVGApi(target);
				if (svgApi) {
					return svgApi.playState;
				} else {
					if (target.hasOwnProperty("_firetvPlayState")) {
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
				var svgApi = this._getSVGApi(target);
				if (svgApi) {
					return svgApi.error;
				} else {
					if (target.hasOwnProperty("_firetvError")) {
						return target._firetvError;
					}
					return undefined;
				}
			},
			writable : false,
			enumerable : true
		},
		"getSpeed" : {
			value : function getSpeed(target) {
				var svgApi = this._getSVGApi(target);
				if (svgApi) {
					return svgApi.speed;
				} else {
					return 0;
				}
			},
			writable : false,
			enumerable : true
		},
		"getOnPlayStateChange" : {
			value : function getOnPlayStateChange(target) {
				var svgApi = this._getSVGApi(target);
				if (svgApi) {
					return svgApi.onPlayStateChange;
				} else {
					if (target.hasOwnProperty("_firetvOnPlayStateChange")) {
						return target._firetvOnPlayStateChange;
					}
					return null;
				}
			},
			writable : false,
			enumerable : true
		},
		"setOnPlayStateChange" : {
			value : function setOnPlayStateChange(target, val) {
				var svgApi = this._getSVGApi(target);
				if (svgApi) {
					svgApi.onPlayStateChange = val;
				} else {
					target._firetvOnPlayStateChange = val;
				}
			},
			writable : false,
			enumerable : true
		},
		"play" : {
			value : function play(target, speed) {
				var svgApi = this._getSVGApi(target);
				if (svgApi) {
					if (svgApi._playState !== PlayState.PAUSED && svgApi._playState !== PlayState.PLAYING) {
						svgApi._playState = PlayState.CONNECTING;
					}
					svgApi.play(speed);
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
				var svgApi = this._getSVGApi(target);
				if (svgApi) {
					svgApi.stop();
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
				var svgApi = this._getSVGApi(target);
				if (svgApi) {
					return svgApi.seek(positionInMilliseconds);
				} else {
					return false;
				}
			},
			writable : false,
			enumerable : true
		},
		"queue" : {
			value : function queue(target, uri) {
				var svgApi = this._getSVGApi(target);
				if (svgApi) {
					return svgApi.queue(uri);
				} else {
					// manage queue
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
								(target._firetvPlayState === PlayState.ERROR || 
								target._firetvPlayState === PlayState.STOPPED || 
								target._firetvPlayState === PlayState.FINISHED)) 
							{
								this.setData(target, target._firetvQueue.splice(0, 1)[0]);
								this.play(target, 1);
							}
							return true;
						}
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
				// TODO manage it directly on target
				if (fullScreen !== target.firetvFullscreen) {
					var svg = this._getSVGObject(target);
					if (fullScreen === true) {
						var bodyBounds = target.ownerDocument.body.getBoundingClientRect();
						target.style.overflow = "visible";
						svg.style.width = FireTVPlugin.profileDefinition.resolution.width + "px";
						svg.style.height = FireTVPlugin.profileDefinition.resolution.height + "px";
						svg.style.position = "fixed";
						svg.style.top = "0";
						svg.style.left = "0";
					} else {
						target.style.overflow = "visible";
						svg.style.position = "absolute";
						svg.style.width = "100%";
						svg.style.height = "100%";
						svg.style.top = "0";
						svg.style.left = "0";
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

	Object.defineProperties(SVGPlayer.prototype, svgMediaPlayerPrototype);

	FireTVPlugin.SVGPlayer = new SVGPlayer();

})(window);
