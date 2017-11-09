/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
(function (global) {

	var debug = function (msg) {
		var i;
		var args = [ "[FireTVMediaPlayer." + debug.caller.name + "(" ];
		for (i = 0; i < debug.caller.arguments.length; i++) {
			args[0] += debug.caller.arguments[i];
			args.push(debug.caller.arguments[i]);
			if (i < debug.caller.arguments.length - 1) {
				args[0] += ", ";
			}
		}
		args[0] += ")]";
		for (i = 0; i < arguments.length; i++) {
			args.push(arguments[i]);
		}
//		console.log.apply(console, args);
	};

	function FireTVMediaPlayer() {
	}

	var impl = FireTVPlugin.bridge.getMediaPlayer().value;
	
	var mediaPlayerPrototype = {
		"_impl" : {
			get : function _impl() {
				return FireTVPlugin[impl];
			}
		},
		"setData" : {
			value : function setData(target, val) {
				this._impl.setData(target, val);
			},
			enumerable : true
		},

		// -- real media player API
		"getPlayPosition" : {
			value : function getPlayPosition(target) {
				return this._impl.getPlayPosition(target);
			},
			writable : false,
			enumerable : true
		},
		"getPlayTime" : {
			value : function getPlayTime(target) {
				return this._impl.getPlayTime(target);
			},
			writable : false,
			enumerable : true
		},
		"getPlayState" : {
			value : function getPlayState(target) {
				return this._impl.getPlayState(target);
			},
			writable : false,
			enumerable : true
		},
		"getError" : {
			value : function getError(target) {
				return this._impl.getError(target);
			},
			enumerable : true
		},
		"getSpeed" : {
			value : function getSpeed(target) {
				return this._impl.getSpeed(target);
			},
			writable : false,
			enumerable : true
		},
		"getOnPlayStateChange" : {
			value : function getOnPlayStateChange(target) {
				return this._impl.getOnPlayStateChange(target);
			},
			writable : false,
			enumerable : true
		},
		"setOnPlayStateChange" : {
			value : function setOnPlayStateChange(target, val) {
				return this._impl.setOnPlayStateChange(target, val);
			},
			writable : false,
			enumerable : true
		},
		"play" : {
			value : function play(target, speed) {
				if (typeof speed === "undefined") {
					speed = 1;
				}
				var playState = this.getPlayState(target);
				this._impl.play(target, speed);
				var STOPPED = 0, ERROR = 6;
				if (playState === STOPPED || playState === ERROR) {
					global.FireTVPlugin.bridge.dispatchEvent({
						type: "firetv-broadcast-suspend-request",
						reason: "tryPlaying",
						target: target
					});
				}
			},
			writable : false,
			enumerable : true
		},
		"stop" : {
			value : function stop(target) {
				this._impl.stop(target);
			},
			writable : false,
			enumerable : true
		},
		"seek" : {
			value : function seek(target, positionInMilliseconds) {
				return this._impl.seek(target, positionInMilliseconds);
			},
			writable : false,
			enumerable : true
		},
		"queue" : {
			value : function queue(target, uri) {
				return this._impl.queue(target, uri);
			},
			writable : false,
			enumerable : true
		},
		"getFullScreen" : {
			value : function getFullScreen(target) {
				return this._impl.getFullScreen(target);
			},
			writable : false,
			enumerable : true
		},
		"getOnFullScreenChange" : {
			value : function getOnFullScreenChange(target) {
				return this._impl.getOnFullScreenChange(target);
			},
			writable : false,
			enumerable : true
		},
		"setOnFullScreenChange" : {
			value : function setOnFullScreenChange(target, val) {
				return this._impl.setOnFullScreenChange(target, val);
			},
			writable : false,
			enumerable : true
		},
		"setFullScreen" : {
			value : function setFullScreen(target, fullScreen) {
				this._impl.setFullScreen(target, fullScreen);
			},
			writable : false,
			enumerable : true
		}
	};

	Object.defineProperties(FireTVMediaPlayer.prototype, mediaPlayerPrototype);
	FireTVPlugin.MediaPlayer = new FireTVMediaPlayer();
	
	
	var observer;
	var onMutation = function (mutation) {
		var node, msg, i, j, players;
		try {
			// -- if mutation involves an anonymous node, an exception will be raised, so catch it
			if (mutation.removedNodes) {
				for (i = 0; i < mutation.removedNodes.length; i++) {
					node = mutation.removedNodes[i];
					players = (node.querySelectorAll) ? node.querySelectorAll('[type="application/x-fb-vlc"],.firetv-svg-player,.firetv-flash-player,.firetv-vlc-player') : [];
					for (j = 0; j < players.length; j++) {
						if (players[j].parentNode) {
							global.FireTVPlugin.bridge.dispatchEvent({
								type: "firetv-broadcast-resume-request",
								reason: "destroy",
								target: players[j].parentNode
							});
						}
					}
				}
			}
		} catch (e) {
		}
	};
	observer = new global.MutationObserver(function (mutations) {
		mutations.forEach(function (mutation) {
			onMutation(mutation);
		});    
	});
	var config = { 
		childList: true, 
		attributes: false, 
		characterData: false,
		subtree: true,
		attributeOldValue: false,
		characterDataOldValue: false
	};
	observer.observe(document.documentElement, config);
	
})(window);
