/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
// -- Channel class
(function (global) {
	function Channel(ccid, onid, tsid, sid, name) {
	    this.onid = onid;
	    this.tsid = tsid;
	    this.sid  = sid;
	    this.ccid = ccid;
	    this.name = this.longname = this.description = name;
	}
	
	Object.defineProperties(Channel, {
		"TYPE_TV"   : { value: 0,  writable: false, enumerable: true },
	    "TYPE_RADIO": { value: 1,  writable: false, enumerable: true },
	    "TYPE_OTHER": { value: 2,  writable: false, enumerable: true },
	    "ID_ANALOG" : { value: 0,  writable: false, enumerable: true },
	    "ID_DVB_C"  : { value: 10, writable: false, enumerable: true },
	    "ID_DVB_S"  : { value: 11, writable: false, enumerable: true },
	    "ID_DVB_T"  : { value: 12, writable: false, enumerable: true },
	    "ID_DVB_SI_DIRECT" : { value: 13, writable: false, enumerable: true },
	    "ID_DVB_C2" : { value: 14, writable: false, enumerable: true },
	    "ID_DVB_S2" : { value: 15, writable: false, enumerable: true },
	    "ID_DVB_T2" : { value: 16, writable: false, enumerable: true },
	    "ID_ISDB_C" : { value: 20, writable: false, enumerable: true },
	    "ID_ISDB_S" : { value: 21, writable: false, enumerable: true },
	    "ID_ISDB_T" : { value: 22, writable: false, enumerable: true },
	    "ID_ATSC_T" : { value: 30, writable: false, enumerable: true },
	    "ID_IPTV_SDS" : { value: 40, writable: false, enumerable: true },
	    "ID_IPTV_URI" : { value: 41, writable: false, enumerable: true },
	    "channelType" : { value: 0, writable: false, enumerable: true }, // TYPE_TV
	    "idType" : { value: 12, writable: false, enumerable: true }, // ID_DVB_T
	    "favourite" : { value: false, writable: false, enumerable: true }
	    //, "toString" : { value : function() { return this.name; }}
	});
	global.Channel = Channel;
})(window);

// -- ChannelList class
(function (global) {
	function ChannelList() {
		this._list = [];
		var i, c;
		// -- starts at index 1 to ignore null channel
		var list = FireTVPlugin.bridge.getTVChannels()
		for (i = 1; i < list.length; i++) {
			c = list[i];
			this._list.push(new global.Channel(c.ccid, c.onid, c.tsid, c.sid, c.name));
		}
	}

	Object.defineProperties(ChannelList.prototype, {
		"_list" : { 
			value: null, 
			writable: true, 
			enumerable: false 
		},
		"length": { 
			get: function length() {
				return this._list.length;
			}, 
			enumerable: false 
		},
		"item" : { 
			value : function item(index) {
				return this._list[index];
			}, 
			enumerable: true
		},
		"getChannel" : { 
			value : function getChannel(channelID) {
				for (var i = 0; i < this._list.length; i++) {
					if (this._list[i].ccid === channelID) {
						return this._list[i];
					}
				}
				return null;
			}, 
			enumerable: true
		},
		"getChannelByTriplet" : { 
			value : function getChannelByTriplet(onid, tsid, sid) {
				for (var i = 0; i < this._list.length; i++) {
					if (this._list[i].sid === sid && 
						this._list[i].tsid === tsid && 
						this._list[i].onid === onid) {
						return this._list[i];
					}
				}
				return null;
			}, 
			enumerable: true
		}
	});
	global.ChannelList = ChannelList;
})(this);

// -- Channel Config
(function (global) {
	function ChannelConfig() {
	}
	
	Object.defineProperties(ChannelConfig.prototype, {
		channelList : { 
			value : new global.ChannelList(), 
			enumerable: true 
		},
		favouriteLists : { 
			value : null, 
			enumerable: true 
		},
		currentFavouriteList : { 
			value : "", 
			enumerable: true 
		}
	});
	global.ChannelConfig = new ChannelConfig();
})(window);


(function (global) {
	var PlayState = {
		UNREALIZED : 0,
		CONNECTING : 1,
		PRESENTING : 2,
		STOPPED : 3
	};

	var ErrorState = {
		CHANNEL_NOT_SUPPORTED_BY_TUNER : 0,
		NO_SIGNAL : 1,
		TUNER_LOCKED_BY_OTHER_OBJECT : 2,
		PARENTAL_LOCK_ON_CHANNEL : 3,
		ENCRYPTED_CHANNEL_WITHOUT_KEY_MODULE : 4,
		UNKNOWN_CHANNEL : 5,
		CHANNEL_SWITCH_INTERRUPTED : 6,
		CANNOT_CHANGED_BECAUSE_RECORDING : 7,
		CANNOT_RESOLVE_URI_OF_IP_CHANNEL : 8,
		INSUFFICIENT_BANDWIDTH : 9,
		NO_CHANNEL_LIST : 10,
		INSUFFICIENT_RESOURCES : 11,
		CHANNEL_NOT_FOUND : 12,
		UNIDENTIFIED_ERROR : 100
	};

	var enumerable = FireTVPlugin.DBG;
	
	var broadcastControlPrototype = {
		"_initialize" : {
			value : function _initialize() {
				Object.defineProperties(this, {
					"_currentChannel" : {
						value : undefined,
						writable : true,
						enumerable : enumerable
					},
					"_onChannelChangeSucceededHandler" : {
						value : function _onChannelChangeSucceededHandler(ccid) {
							if (this.onChannelChangeSucceeded) {
								var channel = (ccid) ? global.ChannelConfig.channelList.getChannel(ccid) : null;
								this.onChannelChangeSucceeded(channel);
							}
						},
						writable : true,
						enumerable : enumerable
					},
					"_onChannelChangeErrorHandler" : {
						value : function _onChannelChangeErrorHandler(ccid, errorState) {
							// restore previous channel to be synchronised, else, currentChannel would return the failed channel
							var currCcid = FireTVPlugin.bridge.getCurrentTVChannel().ccid;
							this._currentChannel = global.ChannelConfig.channelList.getChannel(currCcid);
							if (!this._currentChannel) {
								this._currentChannel = null; // null channel is ok, undefined, no.
							}
							if (this.onChannelChangeError) {
								var channel = (ccid) ? global.ChannelConfig.channelList.getChannel(ccid) : null;
								this.onChannelChangeError(channel, errorState);
							}
						},
						writable : true,
						enumerable : enumerable
					},
					"_onPlayStateChangeHandler" : {
						value : function _onPlayStateChangeHandler(playState) {
							if (this.onPlayStateChange) {
								this.onPlayStateChange(playState);
							}
						},
						writable : true,
						enumerable : enumerable
					},
					"_onFullScreenChangeHandler" : {
						value : function _onFullScreenChangeHandler() {
							if (this.onFullScreenChange) {
								this.onFullScreenChange();
							}
						},
						writable : true,
						enumerable : enumerable
					}
				});
				FireTVPlugin.BroadcastPlayer.setOnChannelChangeSucceeded(this, this._onChannelChangeSucceededHandler.bind(this));
				FireTVPlugin.BroadcastPlayer.setOnChannelChangeError(this, this._onChannelChangeErrorHandler.bind(this));
				FireTVPlugin.BroadcastPlayer.setOnPlayStateChange(this, this._onPlayStateChangeHandler.bind(this));
				FireTVPlugin.BroadcastPlayer.setOnFullScreenChange(this, this._onFullScreenChangeHandler.bind(this));
			},
			writable : true,
			enumerable : false
		},
		"playState" : {
			get : function playState() {
				return  FireTVPlugin.BroadcastPlayer.getPlayState(this);
			},
			enumerable : true
		},
		"onPlayStateChange" : {
			value : null,
			writable : true,
			enumerable : true
		},
		"fullScreen" : {
			get : function fullScreen() {
				return FireTVPlugin.BroadcastPlayer.getFullScreen(this);
			},
			enumerable : true
		},
		
		"setFullScreen" : {
			value : function setFullScreen(fullScreen) {
				FireTVPlugin.BroadcastPlayer.setFullScreen(this, fullScreen);
			},
			writable : false,
			enumerable : true
		},
		"currentChannel" : {
			get : function currentChannel() {
				if (typeof this._currentChannel === "undefined") {
					// -- first call
					var currCcid = FireTVPlugin.bridge.getCurrentTVChannel().ccid;
					this._currentChannel = global.ChannelConfig.channelList.getChannel(currCcid);
					if (!this._currentChannel) {
						this._currentChannel = null; // null channel is ok, undefined, no.
					}
				}
				return this._currentChannel;
			},
			enumerable : true
		},
		
		"setChannel" : {
			value : function setChannel(channel, trickplay) {
				if (channel === null) {
					this._currentChannel = null;
				} else {
					var knownChannel = global.ChannelConfig.channelList.getChannel(channel.ccid);
					if (!knownChannel) {
						if (this.onChannelChangeError) {
							this.onChannelChangeError.apply(this, [channel, ErrorState.CHANNEL_NOT_FOUND]);
						}
						return;
					}
					if (this.playState === PlayState.PRESENTING && this._currentChannel === knownChannel) {
						return;
					}
					this._currentChannel = knownChannel;
				}
				FireTVPlugin.BroadcastPlayer.setChannel(this, (channel) ? channel.ccid : "ccid:-1");
			},
			writable : false,
			enumerable : true
		},
		"onChannelChangeSucceeded" : {
			value : null,
			writable : true,
			enumerable : true
		},
		"onChannelChangeError" : {
			value : null,
			writable : true,
			enumerable : true
		},
		"nextChannel" : {
			value : function nextChannel() {
				var currentChannel = this.currentChannel;
				var i, index;
				for (i = 0; i < global.ChannelConfig.channelList.length; i++) {
					if (global.ChannelConfig.channelList.item(i).ccid === currentChannel.ccid) {
						index = (global.ChannelConfig.channelList.length + (i + 1)) % global.ChannelConfig.channelList.length;
						break;
					}
				}
				var newChannel = global.ChannelConfig.channelList.item(index);
				this.setChannel(newChannel, true);
			},
			writable : false,
			enumerable : true
		},
		
		"prevChannel" : {
			value : function nextChannel() {
				var currentChannel = this.currentChannel;
				var i, index;
				for (i = 0; i < global.ChannelConfig.channelList.length; i++) {
					if (global.ChannelConfig.channelList.item(i).ccid === currentChannel.ccid) {
						index = (global.ChannelConfig.channelList.length + (i - 1)) % global.ChannelConfig.channelList.length;
						break;
					}
				}
				var newChannel = global.ChannelConfig.channelList.item(index);
				this.setChannel(newChannel, true);
			},
			writable : false,
			enumerable : true
		},
		"bindToCurrentChannel" : {
			value : function bindToCurrentChannel() {
				if (this.currentChannel) {
					this.setChannel(this.currentChannel);
					return this.currentChannel;
				}
				throw "Unable to bind to currentChannel : application is in broadcast independant state";
			},
			writable : false,
			enumerable : true
		},

		"getChannelConfig" : {
			value : function getChannelConfig() {
				return global.ChannelConfig;
			},
			writable : false,
			enumerable : true
		},
		"createChannelObject" : {
			value : function createChannelObject(idType, onid, tsid, sid, _sourceID, _ipBroadcastID) {
				if (idType !== global.Channel.ID_DVB_T) {
					throw "ERROR createChannelObject : Unsupported idType : " + idType + " (must be " + global.Channel.ID_DVB_T + ")";
				}
				var knownChannel = global.ChannelConfig.channelList.getChannelByTriplet(onid, tsid, sid);
				if (knownChannel) {
					return knownChannel;
				}
				// -- best effort
				var channel = new global.Channel("ccid:" + ("" + Math.random()).substring(2), onid, tsid, sid);
				return channel;
			},
			writable : false,
			enumerable : true
		},
		"release" : {
			value : function release() {
				FireTVPlugin.BroadcastPlayer.release(this);
			},
			writable : false,
			enumerable : true
		},
		"stop" : {
			value : function stop() {
				FireTVPlugin.BroadcastPlayer.stop(this);
			},
			writable : false,
			enumerable : true
		},
		"setVolume" : {
			value : function setVolume(volume) {
				return FireTVPlugin.BroadcastPlayer.setVolume(this, volume);
			},
			writable : false,
			enumerable : true
		},
		"getVolume" : {
			value : function getVolume() {
				return FireTVPlugin.BroadcastPlayer.getVolume(this);
			},
			writable : false,
			enumerable : true
		}
	};

	FireTVPlugin.defineObjectPropertiesForTypes(broadcastControlPrototype, [ "video/broadcast" ]);

	var initBackgroundTV = function (event) {
		event.target.removeEventListener("DOMContentLoaded", initBackgroundTV, false);
		FireTVPlugin.bridge.showBackgroundTV();
	};
	if (global.top === global) {
		global.addEventListener("DOMContentLoaded", initBackgroundTV, false);
	}
})(window);
