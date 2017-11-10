/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
(function (global) {

	var debug = function (msg) {
		var message = (msg) ? msg : "";
		var i;
		var args = "(";
		for (i = 0; i < debug.caller.arguments.length; i++) {
			args += debug.caller.arguments[i];
			if (i < debug.caller.arguments.length - 1) {
				args += ", ";
			}
		}
		args += ")";
//		console.log("[internal][SVGPlayer." + debug.caller.name + args + "] " + message);
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

	// milliseconds
//	var VIDEO_PLAYTIME = 300000;
	var VIDEO_PLAYTIME = 60000;
//	var VIDEO_PLAYTIME = 10000;
	var REFRESH_SPEED = 500;

	var SVG_NS = "http://www.w3.org/2000/svg";
	var XLINK_NS = "http://www.w3.org/1999/xlink";
	var XHTML_NS = "http://www.w3.org/1999/xhtml";

	function SVGPlayer() {

	}

	var svgMediaPlayerPrototype = {
		"_data" : {
			value : null,
			writable : true,
			enumerable : false
		},

		"_intervalId" : {
			value : -1,
			writable : true,
			enumerable : false
		},
		"_speed" : {
			value : 0,
			writable : true,
			enumerable : false
		},
		"_playStateInternal" : {
			value : PlayState.STOPPED,
			writable : true
		},
		"_playState" : {
			get : function _playState() {
				return this._playStateInternal;
			},
			set : function _playState(val) {
				if (val !== this._playStateInternal) {
					if (val === PlayState.BUFFERING || val === PlayState.PLAYING) {
						this._playTimeAvailable = true;
					}
					this._playStateInternal = val;
					this._updatePlayerControlVideoStatus();
					switch (val) {
					case PlayState.STOPPED:
					case PlayState.ERROR:
						global.FireTVPlugin.bridge.dispatchEvent({
							type: "firetv-broadcast-resume-request",
							reason: "stoppedOrError",
							target: global
						});
						break;
					}
					
					if (this.onPlayStateChange) {
						this.onPlayStateChange.apply(this, []);
					}
				}
			}
		},
		"_playPosition" : {
			value : 0,
			writable : true,
			enumerable : false
		},
		"_queue" : {
			value : [],
			writable : true,
			enumerable : false
		},
		"_updatePlayPosition" : {
			value : function _updatePlayPosition(reverse) {
				var newPosition = this._playPosition + (this.speed * REFRESH_SPEED);
				newPosition = Math.max(0, Math.min(newPosition, VIDEO_PLAYTIME));
				this._playPosition = newPosition;
				this._updatePlayerControlVideoPlayPosition();
				if (newPosition === 0) {
					this.stop();
				}
				if (newPosition === VIDEO_PLAYTIME) {
					clearInterval(this._intervalId);
					this._playState = PlayState.FINISHED;
					if (this._queue.length > 0) {
						// -- direct _data update to avoid clearing the queue
						this._data = this._queue.splice(0, 1)[0];
						this._updatePlayerControlVideoUrl();
						if (this._data) {
							this._playState = PlayState.CONNECTING;
						} 
						this._playPosition = 0;
						this.play(1);
					}
				}
			},
			writable : true,
			enumerable : false
		},
		"data" : {
			get : function data() {
				return this._data;
			},
			set : function data(val) {
				this._queue = [];
				this._data = val;
				this._playTimeAvailable = false;
				this._updatePlayerControlVideoUrl();
			},
			enumerable : true
		},

		"_setPlayerControlDisplay" : {
			value : function _setPlayerControlsDisplay(display) {
				if (display === true) {
					this._setPlayerControlDisplay(false);
					var viewBox = document.documentElement.getAttributeNS(null, "viewBox");
					var viewBoxHeight = parseInt(viewBox.split(" ")[3], 10);
					var gEl = document.createElementNS(SVG_NS, "g");
					gEl.setAttributeNS(null, "id", "PlayerControl");
					gEl.setAttributeNS(null, "transform", "translate(0," + (viewBoxHeight - 110) + ")");
					var useEl = document.createElementNS(SVG_NS, "use");
					useEl.setAttributeNS(XLINK_NS, "href", "#PlayerControlDef");
					gEl.appendChild(useEl);
					document.documentElement.appendChild(gEl);
				} else {
					var playerControl = document
							.getElementById("PlayerControl");
					if (playerControl) {
						playerControl.parentNode.removeChild(playerControl);
					}
				}
			},
			writable : false,
			enumerable : false
		},
		"_updatePlayerControlVideoStatus" : {
			value : function _updatePlayerControlsDisplay() {
				var videoStatus = document.getElementById("videoStatus");
				var status = "";
				switch (this.playState) {
				case PlayState.BUFFERING:
				case PlayState.CONNECTING:
				case PlayState.ERROR:
					status = "";
					break;
				case PlayState.STOPPED:
				case PlayState.FINISHED:
					status = "Stop";
					break;
				case PlayState.PAUSED:
					status = "Pause";
					break;
				case PlayState.PLAYING:
					if (this.speed < 0) {
						status = "FRwd";
					} else if (this.speed > 1) {
						status = "FFwd";
					} else {
						status = "Play";
					}
					break;
				default:
					break;
				}
				videoStatus.setAttributeNS(XLINK_NS, "href", "#" + status);
			},
			writable : false,
			enumerable : false
		},

		"_getFormattedTime" : {
			value : function getFormattedTime(milliseconds) {
				var total_secs = Math.floor(milliseconds / 1000);
				var hours = Math.floor(total_secs / 3600);
				var minutes = Math.floor((total_secs - hours * 3600) / 60);
				var seconds = Math.floor(total_secs - hours * 3600 - minutes * 60);
				var output = "";
				if (hours > 0 || this.playTime > 3600 * 1000) {
					output = hours + ":";
				}
				if (minutes > 9) {
					output += minutes + ":";
				} else {
					output += "0" + minutes + ":";
				}
				if (seconds > 9) {
					output += seconds;
				} else {
					output += "0" + seconds;
				}
				return output;
			},

			writable : false,
			enumerable : false
		},
		"_updatePlayerControlVideoPlayPosition" : {
			value : function _updatePlayerControlVideoPlayPosition() {
				var videoPlayPosition = document.getElementById("videoPlayPosition");
				var formatted = this._getFormattedTime(this.playPosition) + "/" + this._getFormattedTime(this.playTime);
				while (videoPlayPosition.firstChild) {
					videoPlayPosition.removeChild(videoPlayPosition.firstChild);
				}
				var videoPlayPositionVal = document.createTextNode(formatted);
				videoPlayPosition.appendChild(videoPlayPositionVal);
			},
			writable : false,
			enumerable : false
		},

		"_updatePlayerControlVideoUrl" : {
			value : function _updatePlayerControlVideoUrl() {
				var videoUrl = document.getElementById("videoUrl");
				while (videoUrl.firstChild) {
					videoUrl.removeChild(videoUrl.firstChild);
				}
				var videoUrlVal = document.createTextNode(this.data);
				videoUrl.appendChild(videoUrlVal);
			},
			writable : false,
			enumerable : false
		},
		"_playTimeAvailable" : {
			value : false,
			writable : true,
			enumerable : false
		},

		// -- media player api
		"playPosition" : {
			get : function playPosition() {
				return this._playPosition;
			},
			enumerable : true
		},

		"playTime" : {
			get : function playTime() {
				if (this._playTimeAvailable) {
					return VIDEO_PLAYTIME;
				} 
				return undefined;
			},
			enumerable : false
		},
		"playState" : {
			get : function playState() {
				return this._playState;
			},
			enumerable : false
		},

		"speed" : {
			get : function speed() {
				return this._speed;

			},
			enumerable : true
		},
		"onPlayStateChange" : {
			value : null,
			writable : true,
			enumerable : true
		},
		"play" : {
			value : function play(speed) {
				this._speed = speed;
				this._setPlayerControlDisplay(true);
				var delay = 200; // -- simulate a brief delay on actions;
				var that = this;
				if (speed === 0) {
					clearInterval(this._intervalId);
					if (this._playState !== PlayState.PAUSED) {
						setTimeout(function () {
							that._playState = PlayState.PAUSED;
						}, delay);
					}
				} else {
//					if (speed == this._speed){
//						return;
//					}
					if (this.playState === PlayState.CONNECTING) {
						// -- increase delay to simultae connection
						delay = 4000;
					}
					setTimeout(function () {
						clearInterval(that._intervalId);
						that._intervalId = setInterval(function () {
							that._updatePlayPosition();
						}, REFRESH_SPEED);
						that._updatePlayerControlVideoStatus();
						that._playState = PlayState.PLAYING;
					}, delay);
				}
			},
			enumerable : true
		},
		"stop" : {
			value : function stop() {
				clearInterval(this._intervalId);
				this._queue = [];
				this._playPosition = 0;
				this._speed = 0;
				this._playState = PlayState.STOPPED;
			},
			enumerable : true
		},
		"seek" : {
			value : function seek(positionInMilliseconds) {
				if (positionInMilliseconds >= 0 && positionInMilliseconds <= VIDEO_PLAYTIME) {
					this._playPosition = positionInMilliseconds;
					return true;
				}
				return false;
			},
			enumerable : true
		},
		"queue" : {
			value : function queue(uri) {
				if (uri === null) {
					this._queue = [];
					return true;
				} else {
					if (this._queue.indexOf(uri) > -1) {
						return false;
					} else {
						this._queue.push(uri);
						if (this._queue.length === 1 && (
							this.playState === PlayState.ERROR || 
							this.playState === PlayState.STOPPED || 
							this.playState === PlayState.FINISHED)) 
						{
							this.data = this._queue.splice(0, 1)[0];
							this.play(1);
						}
						return true;
					}
				}
			},
			writable : false,
			enumerable : true
		}
	};

	Object.defineProperties(SVGPlayer.prototype, svgMediaPlayerPrototype);

	global.SVGPlayer = new SVGPlayer();

})(window);
