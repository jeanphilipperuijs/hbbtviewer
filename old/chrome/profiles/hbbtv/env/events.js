/* See license.txt for terms of usage */
/*global FireTVPlugin: false */
(function (global) {
	var StreamEventStatus = {
		TRIGGER : "trigger",
		ERROR : "error"
	};
	// return eventData
	// .charCodeAt(index);

	var hexEncode = function (s) {
		var hex = "", i;
		for (i = 0; i < s.length; i++) {
			hex += s.charCodeAt(i).toString(16);
		}
		return hex;
	};

	function StreamEvent(name, text, status) {
		this._name = name;
		this._text = (text) ? text : "";
		this._status = status;
		this._data = hexEncode(this._text);
	}

	Object.defineProperties(StreamEvent.prototype, {
		"_name" : {
			value : null,
			writable : true,
			enumerable : false,
			configurable: false
		},
		"_text" : {
			value : null,
			writable : true,
			enumerable : false,
			configurable: false
		},
		"_status" : {
			value : null,
			writable : true,
			enumerable : false,
			configurable: false
		},
		"type" : {
			value : "StreamEvent",
			writable : false,
			enumerable : true,
			configurable: false
		},
		"name" : {
			get : function name() {
				return this._name;
			},
			enumerable : true,
			configurable: false
		},
		"data" : {
			get : function data() {
				return this._data;
			},
			enumerable : true,
			configurable: false
		},
		"text" : {
			get : function text() {
				return this._text;
			},
			enumerable : true,
			configurable: false
		},
		"status" : {
			get : function status() {
				return this._status;
			},
			enumerable : true,
			configurable: false
		}
	});

	var listeners = {};

	var onStreamEvent = function (event) {
		var eventName = event.name;
		var eventValue = event.value;
		if (!listeners[eventName]) {
			return;
		}
		var i;
		for (i = 0; i < listeners[eventName].length; i++) {
			listeners[eventName][i]
					.apply(global, [ new StreamEvent(eventName, eventValue, StreamEventStatus.TRIGGER) ]);
		}
	};

	var broadcastAdditionalPrototype = {
		"_xhr" : {
			value : null,
			writable : true,
			enumerable : false
		},
		"_asyncAddStreamEventListener" : {
			value : function _asyncAddStreamEventListener(targetURL, eventName, listener) {
				if (this._xhr) {
					this._xhr.abort();
				}
				this._xhr = new XMLHttpRequest();
				this._xhr.open("GET", targetURL, true);
				this._xhr.onreadystatechange = this._asyncAddStreamEventListenerCallback.bind({context: this, eventName: eventName, listener: listener});
				this._xhr.send(null);
			},
			writable : false,
			enumerable : false
		},
		"_asyncAddStreamEventListenerCallback" : {
			value : function _asyncAddStreamEventListenerCallback() {
				// -- 'this' is an object with the following properties 
				// * context : current video/broadcast object
				// * eventName : the event name
				// * listener : the listener to be registered
				
				var success = false;
				switch (this.context._xhr.readyState) {
				case 1:
					break;
				case 2:
					break;
				case 3:
					break;
				case 4:
					try {
						var dsmcc = this.context._xhr.responseXML;
						var dsmccNS = "urn:dvb:mis:dsmcc:2009";
						var streamEvents = dsmcc.getElementsByTagNameNS(dsmccNS, "stream_event");
						var i, streamEvent, eventName;
						for (i = 0; i < streamEvents.length; i++) {
							streamEvent = streamEvents[i];
							eventName = streamEvent.getAttributeNS(null, "stream_event_name");
							if (eventName === this.eventName) {
								if (!listeners[eventName]) {
									listeners[eventName] = [];
								}
								listeners[eventName].push(this.listener);
								success = true;
								break;
							}
						}
						// xml stream events definition has been successfully parsed but with not match, trigger error event
						if (!success) {
							this.listener.apply(global, [ new StreamEvent(this.eventName, "", StreamEventStatus.ERROR) ]);
						}
						return;
					} catch (e) {
					}
					// -- not an xml stream events definition, force registration to ease development
					if (!listeners[this.eventName]) {
						listeners[this.eventName] = [];
					}
					listeners[this.eventName].push(this.listener);
					break;
				default:
					break;
				}
				
			},
			writable : false,
			enumerable : false
		},
		"addStreamEventListener" : {
			value : function addStreamEventListener(targetURL, eventName, listener) {
				this._asyncAddStreamEventListener(targetURL, eventName, listener);
			},
			writable : false,
			enumerable : true
		},

		"removeStreamEventListener" : {
			value : function addStreamEventListener(targetURL, eventName, listener) {
				if (!listeners[eventName]) {
					return;
				}
				var i;
				for (i = listeners[eventName].length - 1; i >= 0; i--) {
					if (listeners[eventName][i] === listener) {
						listeners[eventName].splice(i, 1);
					}
				}
			},
			writable : false,
			enumerable : true
		}
	};

	FireTVPlugin.defineObjectPropertiesForTypes(broadcastAdditionalPrototype, [ "video/broadcast" ]);
	
	FireTVPlugin.bridge.addEventListener("firetv-streamevent", onStreamEvent);

})(window);
