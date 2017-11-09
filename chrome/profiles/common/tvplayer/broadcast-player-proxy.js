/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
(function (global) {

	var debug = function () {
		var i;
		var args = ["[FireTVBroadcastPlayer." + debug.caller.name + "("];
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
	function FireTVBroadcastPlayer() {
	}

	var impl = FireTVPlugin.bridge.getBroadcastPlayer().value;
	var broadcastPlayerPrototype = {
		"_impl" : {
			get : function _impl() {
				return FireTVPlugin[impl];
			},
			enumerable : false
		},
		"_object" : {
			get : function _object() {
				return this._impl._object;
			},
			enumerable : false
		},
		"_prepareTarget" : {
			value : function _prepareTarget(target) {
				this._impl._initializeTarget(target);
				this._impl._initializeObject(target);
			},
			writable : false,
			enumerable : false
		},
		// -- real broadcast player API
		"getPlayState" : {
			value : function getPlayState(target) {
				this._prepareTarget(target);
				return this._impl.getPlayState(target);
			},
			writable : false,
			enumerable : true
		},
		"getOnPlayStateChange" : {
			value : function getOnPlayStateChange(target) {
				this._prepareTarget(target);
				return this._impl.getOnPlayStateChange(target);
			},
			writable : false,
			enumerable : true
		},
		"setOnPlayStateChange" : {
			value : function setOnPlayStateChange(target, val) {
				this._prepareTarget(target);
				return this._impl.setOnPlayStateChange(target, val);
			},
			writable : false,
			enumerable : true
		},
		"getCurrentChannel" : {
			value : function getCurrentChannel(target) {
				this._prepareTarget(target);
				this._impl.getCurrentChannel(target);
			},
			writable : false,
			enumerable : true
		},
		"setChannel" : {
			value : function setChannel(target, val) {
				this._prepareTarget(target);
				this._impl.setChannel(target, val);
			},
			writable : false,
			enumerable : true
		},
		"getOnChannelChangeSucceeded" : {
			value : function getOnChannelChangeSucceeded(target) {
				this._prepareTarget(target);
				return this._impl.getOnChannelChangeSucceeded(target);
			},
			writable : false,
			enumerable : true
		},
		"setOnChannelChangeSucceeded" : {
			value : function setOnChannelChangeSucceeded(target, val) {
				this._prepareTarget(target);
				return this._impl.setOnChannelChangeSucceeded(target, val);
			},
			writable : false,
			enumerable : true
		},
		"getOnChannelChangeError" : {
			value : function getOnChannelChangeError(target) {
				this._prepareTarget(target);
				return this._impl.getOnChannelChangeError(target);
			},
			writable : false,
			enumerable : true
		},
		"setOnChannelChangeError" : {
			value : function setOnChannelChangeError(target, val) {
				this._prepareTarget(target);
				return this._impl.setOnChannelChangeError(target, val);
			},
			writable : false,
			enumerable : true
		},
		"stop" : {
			value : function stop(target) {
				this._prepareTarget(target);
				this._impl.stop(target);
			},
			writable : false,
			enumerable : true
		},
		"release" : {
			value : function release(target) {
				this._prepareTarget(target);
				this._impl.release(target);
			},
			writable : false,
			enumerable : true
		},
		"getVolume" : {
			value : function getVolume(target) {
				this._prepareTarget(target);
				return this._impl.getVolume(target);
			},
			writable : false,
			enumerable : true
		},
		"setVolume" : {
			value : function setVolume(target, val) {
				this._prepareTarget(target);
				return this._impl.setVolume(target, val);
			},
			writable : false,
			enumerable : true
		},
		"getFullScreen" : {
			value : function getFullScreen(target) {
				this._prepareTarget(target);
				return this._impl.getFullScreen(target);
			},
			writable : false,
			enumerable : true
		},
		"getOnFullScreenChange" : {
			value : function getOnFullScreenChange(target) {
				this._prepareTarget(target);
				return this._impl.getOnFullScreenChange(target);
			},
			writable : false,
			enumerable : true
		},
		"setOnFullScreenChange" : {
			value : function setOnFullScreenChange(target, val) {
				this._prepareTarget(target);
				return this._impl.setOnFullScreenChange(target, val);
			},
			writable : false,
			enumerable : true
		},
		"setFullScreen" : {
			value : function setFullScreen(target, fullScreen) {
				this._prepareTarget(target);
				this._impl.setFullScreen(target, fullScreen);
			},
			writable : false,
			enumerable : true
		}
	};

	Object.defineProperties(FireTVBroadcastPlayer.prototype, broadcastPlayerPrototype);

	FireTVPlugin.BroadcastPlayer = new FireTVBroadcastPlayer();
	
	if (global.top === global) {
		global.addEventListener("DOMContentLoaded", FireTVPlugin.bridge.updateStreamInfos, false);
		global.FireTVPlugin.bridge.addEventListener("firetv-channel-change", FireTVPlugin.bridge.updateStreamInfos);
	}
	
})(window);
