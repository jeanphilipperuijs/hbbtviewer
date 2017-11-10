/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
(function () {
	var avControlPrototype = {
		"onDataChanged" : {
			value : function onDataChanged(prevData, newData) {
				FireTVPlugin.MediaPlayer.setData(this, newData);
			},
			enumerable : false
		},
		// -- real media player API
		"playPosition" : {
			get : function playPosition() {
				return FireTVPlugin.MediaPlayer.getPlayPosition(this);
			},
			enumerable : true
		},
		"playTime" : {
			get : function playTime() {
				return FireTVPlugin.MediaPlayer.getPlayTime(this);
			},
			enumerable : true
		},
		"playState" : {
			get : function playState() {
				return FireTVPlugin.MediaPlayer.getPlayState(this);
			},
			enumerable : true
		},
		"error" : {
			get : function error() {
				return FireTVPlugin.MediaPlayer.getError(this);
			},
			enumerable : true
		},
		"speed" : {
			get : function speed() {
				return FireTVPlugin.MediaPlayer.getSpeed(this);
			},
			enumerable : true
		},
		"onPlayStateChange" : {
			get : function onPlayStateChange() {
				return FireTVPlugin.MediaPlayer.getOnPlayStateChange(this);
			},
			set : function onPlayStateChange(val) {
				FireTVPlugin.MediaPlayer.setOnPlayStateChange(this, val);
			},
			enumerable : true
		},
		// persist : NYI
		"play" : {
			value : function play(speed) {
				FireTVPlugin.MediaPlayer.play(this, speed);
			},
			writable : false,
			enumerable : true
		},
		"stop" : {
			value : function stop() {
				FireTVPlugin.MediaPlayer.stop(this);
			},
			writable : false,
			enumerable : true
		},
		"seek" : {
			value : function seek(positionInMilliseconds) {
				return FireTVPlugin.MediaPlayer.seek(this, positionInMilliseconds);
			},
			writable : false,
			enumerable : true
		},
		"queue" : {
			value : function queue(uri) {
				return FireTVPlugin.MediaPlayer.queue(this, uri);
			},
			writable : false,
			enumerable : true
		},
		"fullScreen" : {
			get : function fullScreen() {
				return FireTVPlugin.MediaPlayer.getFullScreen(this);
			},
			enumerable : true
		},
		"onFullScreenChange" : {
			get : function onFullScreenChange() {
				return FireTVPlugin.MediaPlayer.getOnFullScreenChange(this);
			},
			set : function onFullScreenChange(val) {
				FireTVPlugin.MediaPlayer.setOnFullScreenChange(this, val);
			},
			enumerable : true
		},
		"setFullScreen" : {
			value : function setFullScreen(fullScreen) {
				FireTVPlugin.MediaPlayer.setFullScreen(this, fullScreen);
			},
			writable : false,
			enumerable : true
		}
	};
	FireTVPlugin.defineObjectPropertiesForTypes(avControlPrototype, FireTVPlugin.constants.AV_MIME_TYPES, true);
})();
