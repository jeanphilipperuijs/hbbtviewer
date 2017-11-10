/* See license.txt for terms of usage */
(function (global) {
	
	var FireTVPlugin = global.FireTVPlugin;
	
	var debug = function () {
		var i;
		var args = ["[ObjectBroadcastPlayer." + debug.caller.name + "("];
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

	var DEFAULT_CLASSNAME = "firetv-object-broadcastplayer";

	function ObjectBroadcastPlayer() {

	}

	var enumerable = FireTVPlugin.DBG;
	
	function getBackgroundTV() {
		var bgtv = null;
		try {
			bgtv = FireTVPlugin.bridge.getBackgroundTV();
			var id = bgtv.id; // test security error that might happen on cross-domain
		} catch (e) {
			bgtv = null;
		}
		return bgtv;
	}
	
	
	var objectBroadcastPlayerPrototype = {
		"PlayState" : { value : PlayState, writable : false, enumerable : true },
		"ErrorState" : { value : ErrorState, writable : false, enumerable : true },
		
		"_volume" : { value : 50, writable : true, enumerable : false },
		"_object": { value : null, writable : true, enumerable : false },
		"_objectSpec": { value : {}, writable : true, enumerable : false },
		"_objectReady": { value : false, writable : true, enumerable : false },
		
		"_initializeTarget" : {
			value : function _initializeTarget(target) {
				var that = this;
				if (!target._firetvInitialized) {
					Object.defineProperties(target, {
						"_firetvInitialized" : { value : true, writable : false, enumerable : enumerable },
						"_firetvPlayStateInternal" : { value : PlayState.UNREALIZED, writable : true, enumerable : enumerable },
						"_firetvPlayState" : { 
							get : function _firetvPlayState() {
								return this._firetvPlayStateInternal;
							},
							set : function _firetvPlayState(val) {
								if (val === this._firetvPlayStateInternal) {
									return;
								}
								if (val === PlayState.STOPPED && target._firetvIgnoreStopEvent) {
									target._firetvIgnoreStopEvent = false;
									return;
								}
								if (val !== PlayState.STOPPED || FireTVPlugin.bridge.getCurrentTVChannel().ccid !== "ccid:-1") {
									// -- we just dont want to trigger playStateChange to STOPPED after channel change to ccid:-1
									this._firetvPlayStateInternal = val;
									that._callOnPlayStateChange(target);
								}
								if (val === PlayState.PRESENTING) {
									that._callOnChannelChangeSucceeded(that._object.parentNode);
									that._object._firetvPreviousParent = that._object.parentNode;
								}
								if (val === PlayState.PRESENTING) {
									that._firetvApplyFullScreen(target);
								}
							},
							enumerable : enumerable
						},
						"_firetvPreviousWrapperWasBgtv" : { value : false, writable : true, enumerable : enumerable },
						"_firetvIgnoreStopEvent" : { value : false, writable : true, enumerable : enumerable },
						"_firetvNeedsApplyFullScreen" : { value : false, writable : true, enumerable : false },
						"_firetvOnPlayStateChangeHandler" : { value : null, writable : true, enumerable : enumerable },
						"_firetvOnChannelChangeSucceededHandler" : { value : null, writable : true, enumerable : enumerable },
						"_firetvOnChannelChangeErrorHandler" : { value : null, writable : true, enumerable : enumerable },
						"_firetvOnFullScreenChangeHandler" : { value : null, writable : true, enumerable : enumerable }
					});
					if (target._initialize) {
						//  allow to pass control to profile specific initialization
						target._initialize();
					}
				}
			},
			writable : false,
			enumerable : false
		},
		"_initializeObject" : {
			value : function _initializeObject(target) {
				if (this._object) {
					return;
				}
				var spec = this._objectSpec;
				var delegate = spec.delegate;
				var topObject = null;
				try {
					topObject = global.top.FireTVPlugin.BroadcastPlayer._object;
				} catch (e) {
				}
				if (topObject) { 
					this._object = topObject;
					this._objectReady = true;
				} else {
					// -- object does not exist, creates it
					var className = (spec.className || DEFAULT_CLASSNAME);
					var id = className + "-" + ("" + Math.random()).substring(2);
					var that = this;
					var renderer = delegate.createRenderer();
					renderer = delegate.createRenderer();
					renderer.setAttribute("tabindex", "-1");
					renderer.setAttribute("alt", " ");
					renderer.setAttribute("class", className);
					renderer.setAttribute("id", id);
					renderer.setAttribute("name", id);
					renderer.firebugIgnore = !FireTVPlugin.DBG;
					Object.defineProperties(renderer, {
						"_firetvCurrentChannel" : { value : FireTVPlugin.bridge.getCurrentTVChannel().ccid, writable : true, enumerable : enumerable },
						"_firetvErrorState" : { value : -1, writable : true, enumerable : enumerable },
						"_firetvStreamUrl" : { value : null, writable : true, enumerable : enumerable },
						"_firetvPlayStateInternal" : { value : PlayState.UNREALIZED, writable : true, enumerable : enumerable },
						"_firetvPlayState" : {
							get : function _firetvPlayState() {
								return this._firetvPlayStateInternal;
							},
							set : function _firetvPlayState(val) {
								var target = this.parentNode;
								target._firetvPlayState = val; // forward to target which is not necessarly in the same state
								if (this._firetvPlayStateInternal === val) {
									return;
								}
								this._firetvPlayStateInternal = val;	
							},
							enumerable : enumerable
						}
					});
					FireTVPlugin.bridge.addEventListener("firetv-broadcast-suspend-request", function (event) {
						that._onSuspendResumeRequest(event);
					});
					FireTVPlugin.bridge.addEventListener("firetv-broadcast-resume-request", function (event) {
						that._onSuspendResumeRequest(event);
					});
					
					// -- populate configured params
					var params = spec.params || {}, param;
					for (var name in params) {
						if (params.hasOwnProperty(name)) {
							param = global.document.createElement("param");
							param.setAttribute("name", name);
							param.setAttribute("value", params[name]);
							renderer.appendChild(param);
						}
					}

					this._object = renderer;
					target.appendChild(renderer);
					// TODO remove this timeout when firebreath is no more broken 
					setTimeout(function () {
						delegate.onParentChange(that, that._object, target);
					}, 0);
					this._resetObjectStyle(renderer);
					
					// -- launch check routine
					var delay = delegate.checkInterval || 50;
					var start = new Date().getTime();
					var interval = setInterval(function _checkObjectLoadStatus() {
						var now = new Date().getTime();
						var object = that._object;
						if (delegate.checkLoadStatus(that, object)) {
							that._objectReady = true;
							clearInterval(interval);
							delegate.onload(that, object);
							// -- onload may be delayed, check if we should start rendering 
							if (object.parentNode && object.parentNode._firetvPlayState !== PlayState.STOPPED) {
								if (!delegate.isRendering(that, object)) {
									delegate.startRendering(that, object);
								}
							}
							return;
						}
						if ((now - start) > 6000) {
							clearInterval(interval);
							that._objectReady = false;
							object._firetvPlayState = PlayState.UNREALIZED;
							object._firetvErrorState = ErrorState.UNIDENTIFIED_ERROR;
							var callback = that.getOnPlayStateChange(object.parentNode);
							if (callback) {
								callback();
							}
						}
					}, delay);
					FireTVPlugin.bridge.addEventListener("firetv-channel-change", function (event) {
						if (FireTVPlugin.bridge.getCurrentTVChannel().ccid === "ccid:-1") {
							// special to stop broadcast playback when changing combo to "no channel"
							if (delegate.isRendering(that, that._object)) {
								delegate.stopRendering(that, that._object);
							}
						}
					});
//					FireTVPlugin.bridge.addEventListener("firetv-stream-change", function (event) {
////							that._attachTo(that._object.parentNode, true);
////						that._attachTo(that._object.parentNode, true);
//					});
				}
			},
			writable : false,
			enumerable : false
		},
		"_attachTo": {
			value : function _attachTo(target) {
				var bgtv = getBackgroundTV();
				var delegate = this._objectSpec.delegate;
				var currCcid = this._object._firetvCurrentChannel;
				if (target.firstChild !== this._object) {
					this._object.style.visibility = "hidden";
					this._object._firetvPreviousParent = this._object.parentNode;
					target.appendChild(this._object);
					delegate.onParentChange(this, this._object, target);
				}
			},
			writable : false,
			enumerable : false
		},
		"_onRenderingError" : {
			value : function _onRenderingError() {
//				debug(this._object._firetvCurrentChannel, FireTVPlugin.bridge.getCurrentTVChannel().ccid)
				this._callOnChannelChangeError(this._object.parentNode);
				var that = this;
				if (this._object._firetvCurrentChannel !== FireTVPlugin.bridge.getCurrentTVChannel().ccid) {
					var bgtv = getBackgroundTV();
					var previousParent = this._object._firetvPreviousParent;
					var currentParent = this._object.parentNode;
					var wasUnrealized = currentParent._firetvPreviousWrapperWasBgtv;
					var delegate = this._objectSpec.delegate;
					if (bgtv === null) {
						// -- we are in cross domain situation
						if (wasUnrealized) {
							FireTVPlugin.bridge.showBackgroundTV();
							if (delegate.isRendering(this, this._object)) {
								currentParent._firetvIgnoreStopEvent = true;
								delegate.stopRendering(this, this._object); 
							}
						} else {
							this.setChannel(this._object._firetvPreviousParent, FireTVPlugin.bridge.getCurrentTVChannel().ccid);
						}
					} else {
						this.setChannel(this._object._firetvPreviousParent, FireTVPlugin.bridge.getCurrentTVChannel().ccid);
					}
					if (wasUnrealized) {
						currentParent._firetvPlayState = PlayState.UNREALIZED;
					}
				} else {
					FireTVPlugin.bridge.displayOSDMessage(" - No signal - ");
				}
			},
			writable : false,
			enumerable : false
		},
		"_suspendResumeStatus" : {
			value : {
				status: "resumed",
				lastRequester: null
			},
			writable : true,
			enumerable : false
		},
		"_onSuspendResumeRequest" : {
			value : function _onSuspendResumeRequest(event) {
				if (!this._objectReady) {
					return;
				}
				var request = (event.type === "firetv-broadcast-suspend-request") ? "suspend" : "resume";
				var status = this._suspendResumeStatus.status;
				var delegate = this._objectSpec.delegate;
				var that = this;
				var msg = "#" + request + " (status=" + status + ") " + "[delegate._status=" + delegate._status + "]" + "[reason=" + event.reason + "]";
				switch (request) {
				case "suspend":
					if (status !== "suspended" && status !== "suspending") {
						this._suspendResumeStatus.status = "suspended";
						this._object.style.visibility = "hidden";
						setTimeout(function () {
							delegate.suspendRendering(that, that._object);
						}, 0);//  -- delay the call to delegate as it seems that it has no effect else (event loop and dispatchEvent ?)
					}
					this._suspendResumeStatus.lastRequester = event.target;
					break;
				case "resume":
					if (this._suspendResumeStatus.lastRequester !== event.target) {
						msg += " -> dead player, ignore request";
					} else if (status === "resuming" || status === "resumed") {
						msg += " -> already resumed, ignore request";
					} else {
						if (status === "suspending" || status === "suspended") {
							var resuming = true;
							try {
								var target = this._object.parentNode;
								var playState = this.getPlayState(target);
								if (playState === this.PlayState.STOPPED) {
									resuming = false;
								}
							} catch (e) {
							}
							if (resuming) {
								setTimeout(function () {
									delegate.resumeRendering(that, that._object);
								}, 0); //  -- delay the call to delegate as it seems that it has no effect else (event loop and dispatchEvent ?)
								this._object.style.visibility = "visible";
							}
							this._suspendResumeStatus.status = "resumed";
						}
						this._suspendResumeStatus.lastRequester = event.target;
					}
					break;
				}
//				global.console.info(msg);
			},
			writable : true,
			enumerable : false
		},
		
		"_resetObjectStyle" : {
			value : function _resetObjectStyle(object) {
				object.style.position = "absolute";
				object.style.top = "0px";
				object.style.left = "0px";
				object.style.width = "100%";
				object.style.height = "100%";
				object.style.minWidth = "1px";
				object.style.minHeight = "1px";
				object.style.transformOrigin = "50% 50%";
				object.style.visibility = "hidden";
				var wrapper = object.parentNode;
				if (wrapper) {
					var pos = wrapper.ownerDocument.defaultView.getComputedStyle(wrapper, null).position;
					if (pos !== "absolute" && pos !== "relative") {
						wrapper.style.position = "relative";
					}
				}
			},
			writable : false,
			enumerable : false
		},
		
		// -- real broadcast player API
		"getPlayState" : {
			value : function getPlayState(target) {
				return target._firetvPlayState;
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
				var callback = this.getOnPlayStateChange(target);
				if (callback) {
					callback(this.getPlayState(target));
				}
			},
			writable : false,
			enumerable : true
		},
		"getCurrentChannel" : {
			value : function getCurrentChannel(target) {
				return FireTVPlugin.bridge.getCurrentTVChannel().ccid;
			},
			writable : false,
			enumerable : true
		},
		"setChannel" : {
			value : function setChannel(target, val) {
				var delegate = this._objectSpec.delegate;
				var currentCcid = FireTVPlugin.bridge.getCurrentTVChannel().ccid;
				this._object._firetvCurrentChannel = val;
				var bgtv = getBackgroundTV();
				if (bgtv === null) {
					FireTVPlugin.bridge.hideBackgroundTV();
				}
				this._attachTo(target);
				var forceChange = false;
				FireTVPlugin.bridge.hideOSD();
				if (val === "ccid:-1") {
					target._firetvPlayState = PlayState.UNREALIZED;
					// -- succesfull set channel to null, _callOnChannelChangeSucceeded will set current ccid ti ccid:-1 
					// --> will stop automatically rendering
					this._callOnChannelChangeSucceeded(target);  
					return;
				} else if (val !== currentCcid) {
					if (target._firetvPlayState === PlayState.UNREALIZED) {
						target._firetvPreviousWrapperWasBgtv = true;
					} else {
						target._firetvPreviousWrapperWasBgtv = false;
					}
					forceChange = true;
					target._firetvPlayState = PlayState.CONNECTING;
				}
				var channel = FireTVPlugin.bridge.getTVChannelByCcid(this._object._firetvCurrentChannel);
				if (channel) {
					var url = channel.stream;
					if (url !== this._object._firetvStreamUrl || forceChange) {
						this._object._firetvStreamUrl = url;
						delegate.startRendering(this, this._object, url);
					} else {
						if (delegate.isRendering(this, this._object)) {
							target._firetvPlayState = PlayState.PRESENTING;
						} else {
							delegate.startRendering(this, this._object);
						}
					}
					this._object.style.visibility = "inherit";
				} else {
					this._callOnChannelChangeError(target);
				}
			},
			writable : false,
			enumerable : true
		},
		"stop" : {
			value : function stop(target) {
				var delegate = this._objectSpec.delegate;
				if (target.playState === PlayState.UNREALIZED) {
					FireTVPlugin.bridge.hideBackgroundTV();
					target._firetvPlayState = PlayState.STOPPED;
				} else {
					if (!this._objectReady) {
						this._object._firetvPlayState = PlayState.STOPPED;
						return;
					}
					if (delegate.isRendering(this, this._object)) {
						delegate.stopRendering(this, this._object); // 
					} else {
						target._firetvPlayState = PlayState.STOPPED;
					}
				}
			},
			writable : false,
			enumerable : true
		},
		"release" : {
			value : function release(target) {
				var bgtv = getBackgroundTV();
				var delegate = this._objectSpec.delegate;
				if (target === bgtv && target.firstChild === this._object) {
					// -- special case, coming bridge.hideBackgroundTV() -> stop background tv rendering
					if (delegate.isRendering(this, this._object)) {
						delegate.stopRendering(this, this._object); 
					} else {
						target._firetvPlayState = PlayState.UNREALIZED;
					}
					return;
				}
				if (!this._objectReady) {
					this._object._firetvPlayState = PlayState.UNREALIZED;
					return;
				}
				if (target._firetvPlayState === PlayState.UNREALIZED) {
					return;
				}
				// -- give control back to background tv
				FireTVPlugin.bridge.showBackgroundTV();
				if (bgtv === null) {
					if (delegate.isRendering(this, this._object)) {
						target._firetvIgnoreStopEvent = true;
						delegate.stopRendering(this, this._object); 
					}
				}
				target._firetvPlayState = PlayState.UNREALIZED;
			},
			writable : false,
			enumerable : true
		},
		"getOnChannelChangeSucceeded" : {
			value : function getOnChannelChangeSucceeded(target) {
				return target._firetvOnChannelChangeSucceededHandler || null;
			},
			writable : false,
			enumerable : true
		},
		"setOnChannelChangeSucceeded" : {
			value : function setOnChannelChangeSucceeded(target, val) {
				target._firetvOnChannelChangeSucceededHandler = val;
			},
			writable : false,
			enumerable : true
		},
		"_callOnChannelChangeSucceeded" : {
			value : function _callOnChannelChangeSucceeded(target) {
				var currentCcid = FireTVPlugin.bridge.getCurrentTVChannel().ccid;
				if (this._object._firetvCurrentChannel !== currentCcid) {
					var callback = this.getOnChannelChangeSucceeded(target);
					FireTVPlugin.bridge.setCurrentTVChannel(this._object._firetvCurrentChannel);
					if (callback) {
						callback(this._object._firetvCurrentChannel);
					}
				}
			},
			writable : false,
			enumerable : true
		},
		"getOnChannelChangeError" : {
			value : function getOnChannelChangeError(target) {
				return target._firetvOnChannelChangeErrorHandler || null;
			},
			writable : false,
			enumerable : true
		},
		"setOnChannelChangeError" : {
			value : function setOnChannelChangeError(target, val) {
				target._firetvOnChannelChangeErrorHandler = val;
			},
			writable : false,
			enumerable : true
		},
		"_callOnChannelChangeError" : {
			value : function _callOnChannelChangeError(target) {
				var callback = this.getOnChannelChangeError(target);
				if (callback) {
					callback(this._object._firetvCurrentChannel, this._object._firetvErrorState);
				}
			},
			writable : false,
			enumerable : true
		},
		"getVolume" : {
			value : function getVolume(target) {
				return this._volume;
			},
			writable : false,
			enumerable : true
		},
		"setVolume" : {
			value : function setVolume(target, val) {
				if (typeof val === "number" && val >= 0 && val <= 100) {
					if (this._volume !== val) {
						this._volume = val;
						var delegate = this._objectSpec.delegate;
						if (this._objectReady) {
							delegate.setVolume(this, this._object, val);
						}
					}
					return true;
				}
				return false;
			},
			writable : false,
			enumerable : true
		},
		"getFullScreen" : {
			value : function getFullScreen(target) {
				return !!target._firetvFullScreen;
			},
			writable : false,
			enumerable : true
		},
		"getOnFullScreenChange" : {
			value : function getOnFullScreenChange(target) {
				return target._firetvOnFullScreenChangeHandler || null;
			},
			writable : false,
			enumerable : true
		},
		"setOnFullScreenChange" : {
			value : function setOnFullScreenChange(target, val) {
				target._firetvOnFullScreenChangeHandler = val;
			},
			writable : false,
			enumerable : true
		},
		"_callOnFullScreenChange" : {
			value : function _callOnFullScreenChange(target) {
				var callback = this.getOnFullScreenChange(target);
				if (callback) {
					callback();
				}
			},
			writable : false,
			enumerable : true
		},
		"setFullScreen" : {
			value : function setFullScreen(target, fullScreen) {
				if (fullScreen !== target._firetvFullScreen) {
					var that = this;
					setTimeout(function () {
						target._firetvFullScreen = fullScreen;
						target._firetvNeedsApplyFullScreen = true;
						that._callOnFullScreenChange(target);
						if (target._firetvPlayState === PlayState.PRESENTING) {
							that._firetvApplyFullScreen(target);
						}
					}, 100);
				}
				return false;
			},
			writable : false,
			enumerable : true
		},
		"_firetvApplyFullScreen" : {
			value : function _firetvApplyFullScreen(target) {
				if (target.firstChild !== this._object) {
					return;
				}
				var style;
				if (target._firetvFullScreen === true) {
					target.style.overflow = "visible";
					this._object.style.position = "fixed";
					this._object.style.width =  FireTVPlugin.profileDefinition.resolution.width + "px";
					this._object.style.height =  FireTVPlugin.profileDefinition.resolution.height + "px";
				} else {
					target.style.overflow = "hidden";
					this._object.style.position = "absolute";
					this._object.style.width =  "100%";
					this._object.style.height =  "100%";
				}
				this._firetvNeedsApplyFullScreen = false;
			},
			writable : false,
			enumerable : false
		}
	};

	Object.defineProperties(ObjectBroadcastPlayer.prototype, objectBroadcastPlayerPrototype);

	FireTVPlugin.ObjectBroadcastPlayer = ObjectBroadcastPlayer;
	
	var initBackgroundTV = function (event) {
		if (event) {
			event.target.removeEventListener("DOMContentLoaded", initBackgroundTV, false);
		}
		var bgTv = global.document.createElement("div");
		bgTv.id = "firetv-background-tv";
		bgTv.setAttribute("style", "pointer-events: none !important; position:absolute !important; background-color: black !important; background-image: none");
		bgTv.firebugIgnore = !FireTVPlugin.DBG;
		global.document.documentElement.insertBefore(bgTv, global.document.body);
	};
	if (global.top === global) {
		global.addEventListener("DOMContentLoaded", initBackgroundTV, false);
	}
	
	// -- background tv
	FireTVPlugin.bridge.getBackgroundTV = function () {
		return global.top.document.getElementById("firetv-background-tv");
	};
	
	FireTVPlugin.bridge.showBackgroundTV = function () {
		global.top.FireTVPlugin.BroadcastPlayer.setChannel(FireTVPlugin.bridge.getBackgroundTV(), global.top.FireTVPlugin.bridge.getCurrentTVChannel().ccid);
	};
	
	FireTVPlugin.bridge.hideBackgroundTV = function () {
		var backgroundTv = FireTVPlugin.bridge.getBackgroundTV();
		global.top.FireTVPlugin.BroadcastPlayer.release(backgroundTv);
	};

})(window);
