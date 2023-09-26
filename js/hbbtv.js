/*******************************************************************************

    ChromeTvViewer - a browser extension to open HbbTV,CE-HTML,BML,OHTV webpages
    instead of downloading them. A mere simulator is also provided.

    Copyright (C) 2015 Karl Rousseau

    MIT License:
    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the "Software"),
    to deal in the Software without restriction, including without limitation
    the rights to use, copy, modify, merge, publish, distribute, sublicense,
    and/or sell copies of the Software, and to permit persons to whom the
    Software is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.

    See the MIT License for more details: http://opensource.org/licenses/MIT

    HomePage: https://github.com/karl-rousseau/ChromeHybridTvViewer
*/
/* global Application, oipfObjectFactory, oipfApplicationManager, oipfConfiguration, oipfCapabilities */

// If the extension is not activated for this web page then we do nothing and
// wait for the user to click on the extension icon ...
var pageActivated = localStorage.getItem('hbbtvActive') == 'true';
if (pageActivated) {

    window.oipf = window.oipf || {};

    // 7.1 Object factory API ------------------------------------------------------

    (function(oipfObjectFactory) {

        oipfObjectFactory.isObjectSupported = function(mimeType) {
            return mimeType === "video/broadcast" ||
                mimeType === "video/mpeg";
            //  mimeType === "application/oipfApplicationManager" ||
            //  mimeType === "application/oipfCapabilities" ||
            //  mimeType === "application/oipfConfiguration" ||
            //  mimeType === "application/oipfDrmAgent" ||
            //  mimeType === "application/oipfParentalControlManager" ||
            //  mimeType === "application/oipfSearchManager";
        };
        oipfObjectFactory.createVideoBroadcastObject = function() {
            return null;
        };
        oipfObjectFactory.createVideoMpegObject = function() {
            return null;
        };
        oipfObjectFactory.onLowMemory = function() {
            // FIXME: see when we can generate this event (maybe inside the Web Inspector panel)
        };

    })(window.oipfObjectFactory || (window.oipfObjectFactory = {}));

    // 7.2.1  The application/oipfApplicationManager embedded object ---------------

    (function(oipfApplicationManager) {
        Object.defineProperties(window.Document.prototype, {
            "_application": {
                value: undefined,
                writable: true,
                enumerable: false
            }
        });

        oipfApplicationManager.onLowMemory = function() {
            // FIXME: see when we can generate this event
        };

        oipfApplicationManager.getOwnerApplication = function(document) {
            return window.Document._application || (window.Document._application = new window.Application(document));
        };

    })(window.oipfApplicationManager || (window.oipfApplicationManager = {}));

    // 7.2.2  The Application class ------------------------------------------------

    window.Application = {};
    (function(window) {
        function Application(doc) {
            this._document = doc;
        }
        Application.prototype.visible = undefined;
        Application.prototype.privateData = {};
        Application.prototype.privateData.keyset = {};
        var keyset = Application.prototype.privateData.keyset;
        keyset.RED = 0x1;
        keyset.GREEN = 0x2;
        keyset.YELLOW = 0x4;
        keyset.BLUE = 0x8;
        keyset.NAVIGATION = 0x10;
        keyset.VCR = 0x20;
        keyset.SCROLL = 0x40;
        keyset.INFO = 0x80;
        keyset.NUMERIC = 0x100;
        keyset.ALPHA = 0x200;
        keyset.OTHER = 0x400;
        keyset.value = null;
        keyset.setValue = function(value) {
            keyset.value = value;
        };
        Object.defineProperties(Application.prototype.privateData, {
            "_document": {
                value: null,
                writable: true,
                enumerable: false
            }
        });
        Object.defineProperties(Application.prototype.privateData, {
            "currentChannel": {
                enumerable: true,
                get: function currentChannel() {
                    var currentCcid = window.oipf.getCurrentTVChannel().ccid; // FIXME: ccid is platform-dependent
                    return window.oipf.channelList.getChannel(currentCcid) || {};
                }
            }
        });
        Application.prototype.privateData.getFreeMem = function() {
            // FIXME: better use https://developer.chrome.com/extensions/examples/api/processes/process_monitor/popup.js
            return ((window.performance && window.performance.memory.usedJSHeapSize) || -1);
        };

        Application.prototype.show = function() {
            if (this._document) {
                this._document.body.style.visibility = "visible";
                return (this._visible = true);
            }
            return false;
        };

        Application.prototype.hide = function() {
            if (this._document) {
                this._document.body.style.visibility = "hidden";
                this._visible = false;
                return true;
            }
            return false;
        };

        Application.prototype.createApplication = function(uri, createChild) {
            this._applicationUrl = uri;
        };

        Application.prototype.destroyApplication = function() {
            delete this._applicationUrl;
        };

        window.Application = Application;
    })(window /*.Application || (window.Application = {})*/ );

    // 7.3.1  The application/oipfConfiguration embedded object --------------------

    (function(oipfConfiguration) {
        oipfConfiguration.configuration = {};
        oipfConfiguration.configuration.preferredAudioLanguage = "FRA";
        oipfConfiguration.configuration.preferredSubtitleLanguage = "ENG,FRA";
        oipfConfiguration.configuration.preferredUILanguage = "ENG,FRA";
        oipfConfiguration.configuration.countryId = "FRA";
        //oipfConfiguration.configuration.regionId = 0;
        //oipfConfiguration.localSystem = {};
        oipfConfiguration.getText = function(key) {

        };

        oipfConfiguration.setText = function(key, value) {

        };
    })(window.oipfConfiguration || (window.oipfConfiguration = {}));

    // 7.15.3 The application/oipfCapabilities embedded object ---------------------

    (function(oipfCapabilities) {
        var storedCapabilities = localStorage.getItem("hbbtv_capabilities"); // FIXME: postMessage to retrieve this value from Chrome extension
        var currentCapabilities = storedCapabilities ||
            '<profilelist>' +
            '<ui_profile name="OITF_HD_UIPROF+META_SI+META_EIT+TRICKMODE+RTSP+AVCAD+DRM+DVB_T">' +
            '<ext>' +
            '<colorkeys>true</colorkeys>' +
            '<video_broadcast type="ID_DVB_T" scaling="arbitrary" minSize="0">true</video_broadcast>' +
            '<parentalcontrol schemes="dvb-si">true</parentalcontrol>' +
            '</ext>' +
            '<drm DRMSystemID="urn:dvb:casystemid:19219">TS MP4</drm>' +
            '<drm DRMSystemID="urn:dvb:casystemid:1664" protectionGateways="ci+">TS</drm>' +
            '</ui_profile>' +
            '<audio_profile name=\"MPEG1_L3\" type=\"audio/mpeg\"/>' +
            '<audio_profile name=\"HEAAC\" type=\"audio/mp4\"/>' +
            '<video_profile name=\"TS_AVC_SD_25_HEAAC\" type=\"video/mpeg\"/>' +
            '<video_profile name=\"TS_AVC_HD_25_HEAAC\" type=\"video/mpeg\"/>' +
            '<video_profile name=\"MP4_AVC_SD_25_HEAAC\" type=\"video/mp4\"/>' +
            '<video_profile name=\"MP4_AVC_HD_25_HEAAC\" type=\"video/mp4\"/>' +
            '<video_profile name=\"MP4_AVC_SD_25_HEAAC\" type=\"video/mp4\" transport=\"dash\"/>' +
            '<video_profile name=\"MP4_AVC_HD_25_HEAAC\" type=\"video/mp4\" transport=\"dash\"/>' +
            '</profilelist>';
        var videoProfiles = currentCapabilities.split('video_profile');
        oipfCapabilities.xmlCapabilities = (new window.DOMParser()).parseFromString(currentCapabilities, "text/xml");
        oipfCapabilities.extraSDVideoDecodes = videoProfiles.length > 1 ? videoProfiles.slice(1).join().split('_SD_').slice(1).length : 0;
        oipfCapabilities.extraHDVideoDecodes = videoProfiles.length > 1 ? videoProfiles.slice(1).join().split('_HD_').slice(1).length : 0;
        oipfCapabilities.hasCapability = function(capability) {
            return !!~new XMLSerializer().serializeToString(oipfCapabilities.xmlCapabilities).indexOf(capability.toString() || "??");
        };
    })(window.oipfCapabilities || (window.oipfCapabilities = {}));

    // 7.4.3 The application/oipfDownloadManager embedded object (+DL) -------------


    // 7.6.1 The application/oipfDrmAgent embedded object (+DRM and CI+) -----------


    // 7.9.1 The application/oipfParentalControlManager embedded object ------------


    // 7.10.1 The application/oipfRecordingScheduler embedded object (+PVR) --------


    // 7.12.1 The application/oipfSearchManager embedded object --------------------


    // 7.13.1 The video/broadcast embedded object ----------------------------------

    (function(oipfCapabilities) {
        window.oipf.channelList = {};
        window.oipf.channelList._list = [];
        window.oipf.channelList._list.push({
            'id': '0',
            'idType' : 12,
            'name': 'channel0',
            'ccid': 'ccid:dvbt.0'
        });
        window.oipf.channelList.getChannel = function (id) {
            return window.oipf.channelList._list[id];
        };
        window.oipf.getCurrentTVChannel = function () {
            return window.oipf.channelList.getChannel(0);
        };

    })(window.oipf || (window.oipf = {}));

    // 7.13.9 Extensions to video/broadcast for channel list -----------------------


    // 7.13.6 Extensions to video/broadcast for DRM rights errors ------------------


    // 7.13.21 Extensions to video/broadcast for synchronization -------------------


    // 7.16.2.4 DVB-SI extensions to Programme -------------------------------------


    // 7.16.5 Extensions for playback of selected media components -----------------


    // Listening to external messages ----------------------------------------------

    (function(document) {
        window.addEventListener("message", function(event) {
            console.log("hbbtv event received: ", event);

        });
    })(window.document);

    console.log("HbbTV emulator added !");
}
