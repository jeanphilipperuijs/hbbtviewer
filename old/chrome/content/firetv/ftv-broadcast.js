/* See license.txt for terms of usage */
/*global window:false, alert, getFireTVPluginInstance, Components */
try {
	(function () {
		if (this.Broadcast) {
			return;
		}
		
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cr = Components.results;
		
		var _this = this;

		var FBTrace = this.FBTrace;
		
		var broadcast = {};

		broadcast.CAT = "[ftv.broadcast] ";

		broadcast.defaultChannelList = [];
		broadcast.customChannelList = [];

		broadcast.getCurrentChannelList = function () {
			return (_this.PreferenceManager.customChannelListSelected()) ? broadcast.customChannelList : broadcast.defaultChannelList;
		}
		
		broadcast.getChannelByCcid = function (ccid) {
			var channelList = broadcast.getCurrentChannelList()
			var i;
			for (i = 0; i < channelList.length; i++) {
				if (channelList[i].ccid === ccid) {
					return channelList[i];
				}
			}
			return null;
		};

		broadcast.parseChannelList = function (url) {
			var chanListSrc = null;
			if (FBTrace.DBG_FIRETV_BROADCAST) {
				FBTrace.sysout(broadcast.CAT + "[parseChannelList] url : " + url);
			}
			try {
				chanListSrc = _this.FileUtils
					.getResourceAsString(url);
			} catch (e1) {
				if (FBTrace.DBG_FIRETV_BROADCAST || FBTrace.DBG_FIRETV_ERROR) {
					FBTrace.sysout(broadcast.CAT + "[parseChannelList] ERROR reading channel list file!", e1);
				}
				throw _this.Messages.getMessage("firetv.channelList.unableToLoadFile");
			}
			var parser = new window.DOMParser();
			var chanList = [];
			var invalid = false;
			var details = "\n";
			var i;
			try {
				var chanListXml = parser.parseFromString(chanListSrc, "text/xml");
				if (FBTrace.DBG_FIRETV_BROADCAST) {
					FBTrace.sysout(broadcast.CAT + "[parseChannelList] channel list parsing result xml:", chanListXml);
				}
				// -- currently parseFromString does not generate error bu return a parsererror document
				// - see bug https://bugzilla.mozilla.org/show_bug.cgi?id=45566
				// Keeps the surrounding try/catch for future evolutions
				// Calls querySelector instead of looking documentElement tagName as it seems to be fetched asynchronously ??
				var xmldetails = chanListXml.querySelectorAll("parsererror, sourcetext");
				if (xmldetails.length > 0) {
					invalid = true;
					for (i = 0; i < xmldetails.length; i++) {
						details += xmldetails[i].textContent;
					}
				} else {
					var chan, channels = chanListXml.getElementsByTagName('Channel');
					var stream;
					for (i = 0; i < channels.length; i++) {
						chan = channels[i];
						stream = chan.getElementsByTagName('Stream')[0];
						chanList.push({
							ccid : chan.getAttribute('ccid'),
							onid : parseInt(chan.getElementsByTagName('ONID')[0].textContent, 10),
							tsid : parseInt(chan.getElementsByTagName('TSID')[0].textContent, 10),
							sid : parseInt(chan.getElementsByTagName('SID')[0].textContent, 10),
							name : chan.getElementsByTagName('Name')[0].textContent,
							stream:  (stream) ? stream.textContent : false
						});
					}
				}
			} catch (e2) {
				if (FBTrace.DBG_FIRETV_BROADCAST || FBTrace.DBG_FIRETV_ERROR) {
					FBTrace.sysout(broadcast.CAT + "[parseChannelList] ERROR while parsing channel list!", e2);
					details = e2;
				}
				invalid = true;
			}
			invalid = invalid || chanList.length === 0;
			if (invalid) {
				throw _this.Messages.getMessage("firetv.channelList.invalidFormat") + details;
			}
			chanList.unshift({
				ccid : "ccid:-1",
				onid : 0,
				tsid : 0,
				sid : 0,
				name : _this.Messages.getMessage("firetv.tvImage.noChannel")
			});
			return chanList;
		};

		broadcast.init = function () {
			if (FBTrace.DBG_FIRETV_BROADCAST) {
				FBTrace.sysout(broadcast.CAT + "[init]");
			}
			broadcast.defaultChannelList = broadcast.parseChannelList("chrome://firetv-channels/content/ChannelList-fr.xml");
			if (_this.FileUtils.userChannelListFileExists()) {
				broadcast.customChannelList = broadcast.parseChannelList("firetv://xml/channels");
			}
			if (FBTrace.DBG_FIRETV_BROADCAST) {
				FBTrace.sysout(broadcast.CAT + "[done]");
			}
		};

		broadcast.shutdown = function () {
			if (FBTrace.DBG_FIRETV_BROADCAST) {
				FBTrace.sysout(broadcast.CAT + "[shutdown]");
			}

			if (FBTrace.DBG_FIRETV_BROADCAST) {
				FBTrace.sysout(broadcast.CAT + "[done]");
			}
		};

		this.Broadcast = broadcast;

	}).apply(getFireTVPluginInstance());

} catch (exc) {
	alert("[ftv-broadcast.js] " + exc);
}
