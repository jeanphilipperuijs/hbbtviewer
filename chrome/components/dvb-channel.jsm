/* See license.txt for terms of usage */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("chrome://firetv-comp/content/http-channel.jsm");

var EXPORTED_SYMBOLS = [ "DVBChannel", "DVB_URI_TYPE", "scope", "FBTrace" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const CAT = "[dvb://] ";

const DVB_URI_TYPE = {
    TMPROOT : "[dvb@tmproot]",
    GLOBALROOT : "[dvb@globalroot]",
    AIT : "[dvb@ait]",
    UNKNOWN : "[dvb@unknown]"
};

const STATUS_TEXT = {
    "404" : "Not Found",
    "500" : "Internal Error"
};

const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
const observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
const mimeService = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);

// ------------- DVBChannel --
function DVBChannel(aUri, aReferrer, notifyObservers) {
    if (FBTrace.DBG_FIRETV_DVBCHANNEL) {
        FBTrace.sysout(CAT + "[DVBChannel] [constructor] ");
    }
    HttpChannel.apply(this, arguments);
    if(/^dvb:\/\/.+\.fire\.tv/.test(aUri.spec)){
        this.uriType = DVB_URI_TYPE.TMPROOT;
    } else if(/^dvb:\/\/[^\/]*\.ait\//.test(aUri.spec)){
        this.uriType = DVB_URI_TYPE.AIT;
    } else {
        this.uriType = DVB_URI_TYPE.GLOBALROOT;
    }
    
}

DVBChannel.prototype = new HttpChannel();

// -- define DVBChannel channel own properties
(function(proto) {
    Object.defineProperties(proto, {
        uriType : {
            value : DVB_URI_TYPE.UNKNOWN,
            writable : true,
            enumerable : true,
        }
    });

})(DVBChannel.prototype);

// Override BaseChannel
(function(proto) {
    Object.defineProperties(proto, {
        
        prepareFileInputStream : {
            value : function makeFileInputStream(file){
                var isDir = file.isDirectory();
                if (FBTrace.DBG_FIRETV_DVBCHANNEL) {
                    FBTrace.sysout(CAT + "[DVBChannel.makeFileInputStream] isDir: " + isDir);
                }
                var inputStream, res;
                if (isDir){
                    // -- make a comma separated text directory listing
                    var entries = file.directoryEntries;
                    var entry, filename, result="";
                    while (entries.hasMoreElements()) {
                        entry = entries.getNext();
                        entry.QueryInterface(Ci.nsIFile);
                        filename = entry.leafName;
                        result += filename + ",";
                    }
                    if (result.length > 0){
                        result = result.substring(0, result.length-1);
                    }
                    inputStream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);
                    inputStream.data = result;
                    res = {inputStream: inputStream, streamLength:result.length, contentType: "text/plain"};
                    return res;
                } else {
                    // -- open the file 
                    inputStream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
                    inputStream.init(file, -1,-1, 0);
                    var contentType = "text/plain";  // by default;
                    // try to guess 
                    try {
                        contentType = mimeService.getTypeFromFile(file);
                    } catch(e){
                    }
                    if (contentType == "text/html"){
                        contentType = "application/xhtml+xml";
                    }
                    res = {inputStream: inputStream, streamLength:file.fileSize, contentType: contentType};
                    return res;
                }
            },
            enumerable : true
        },
        
        makeErrorInputStream : {
            value : function makeErrorInputStream(status, title, message){
                var inputStream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);
                var responseBody = "";
                responseBody += '<html>\n';
                responseBody += '<body style="background-color: white">';
                responseBody += '<h1>Not Found : "' + this.URI.spec + '"</h1>\n';
                responseBody += '<h3>' + title.replace(/</g,"&lt;").replace(/>/g,"&gt;")  + '</h3>\n';
                responseBody += '<p>' + message.replace(/</g,"&lt;").replace(/>/g,"&gt;")+ '</p>\n';
                responseBody += '<hr/>\n'; 
                responseBody += '<p><i>FireTV DVB Server at ' + this.URI.hostPort +'</i></p>\n';
                responseBody += '</body>';
                responseBody += '</html>';
                inputStream.data = responseBody;
                this.contentLength = responseBody.length;
                this.contentType = "text/html";
                this.contentCharset = "utf-8";
                this.responseStatus = status;
                this.responseStatusText = STATUS_TEXT[status];
                HttpChannel.prototype.openContentStream.apply(this, []);
                return inputStream;
            },
            enumerable : true
        },
        
        getOriginatingTab : {
            value : function getOriginatingTab(){
                try {
                    var aBrowser = scope.FireTVPlugin.utils.getBrowserFromChannel(this);
                    var aTab = scope.FireTVPlugin.TabManager.getTabForBrowser(aBrowser);
                    return aTab
                } catch (e) {
                }
                return null;
            },
            enumerable : true
        },
        
        openContentStream : {
            value :  function openContentStream() {
                    if (FBTrace.DBG_FIRETV_DVBCHANNEL) {
                        FBTrace.sysout(CAT + "[DVBChannel.openContentStream] for " + this.URI.spec + " " + this.uriType);
                    }
                    var globalDVBRoot = scope.FireTVPlugin.PreferenceManager.getGlobalDVBRoot();
                    var firetvDVBRoot = null;
                    var errorTitle, errorMessage;
                    if(this.uriType == DVB_URI_TYPE.TMPROOT){
                        var aTab = this.getOriginatingTab();
                        if(!aTab){
                            // -- if we don't have the tab, do the best effort by taking the currently active tab
                            // This may happen, when Firebug network panel try to do its own requests (i.e to display an image)
                            aTab = scope.document.getElementById("content").selectedTab;
                        }
                        if (aTab){
                            firetvDVBRoot = aTab.getAttribute("firetv-dvbroot");
                        }
                        if (!firetvDVBRoot || firetvDVBRoot == ""){
                            errorTitle = "Your temporary dvb root has expired";
                            errorMessage = "URI of the form dvb://xxx.fire.tv/... must be triggered by the plugin " +
                                "itsself and are sticked with the tab in which they are opened " +
                                "(as long as the tab is opened and dvb navigation is not broken).";
                            return this.makeErrorInputStream(404, errorTitle, errorMessage);
                        }
                    } else if(this.uriType == DVB_URI_TYPE.GLOBALROOT){
                        var hostPort = this.URI.hostPort;
                        var index = hostPort.lastIndexOf(".");
                        var ctagPath = "";
                        if(index > -1){
                            ctagPath = "/" + hostPort.substring(index+1);
                        }
                        if(globalDVBRoot){
                            firetvDVBRoot = "file:///" + globalDVBRoot.path + ctagPath;
                        } else {
                            errorTitle = "No DVB Root defined. Please choose your local <DVB_ROOT_DIR>.";
                            errorMessage = "Once defined, to access this URI, the following file should exists : <DVB_ROOT_DIR>" + ctagPath + this.URI.path;
                            return this.makeErrorInputStream(404, errorTitle, errorMessage);
                        }
                    } else if(this.uriType == DVB_URI_TYPE.AIT){
                        if (!globalDVBRoot){
                            errorTitle = "No DVB Root defined. Please choose your local <DVB_ROOT_DIR>.";
                            errorMessage = "Once defined, to access this URI, the following plain text file should exists : <DVB_ROOT_DIR>" + this.URI.path + 
                                " and contains the URL of the given application (either an http(s) or file url).";
                            return this.makeErrorInputStream(404, errorTitle, errorMessage);
                        }
                        var orgIdAppId = this.URI.path.trim();
                        if(orgIdAppId.length>0){
                            // remove leading slash
                            orgIdAppId = orgIdAppId.substring(1);
                        }
                        if (orgIdAppId.length == 0){
                            errorTitle = "Invalid dvb uri (with ait specifier). The <orgId>.<appId> is empty.";
                            errorMessage = "dvb uri with ait specifier must be of the form : dvb://xxx.ait/<orgId>.<appId>";
                            return this.makeErrorInputStream(404, errorTitle, errorMessage);
                        }
                        var orgId = null;
                        var appId = null;
                        var arr = /^([0-9a-fA-F]+)\.([0-9a-fA-F]+)(?:\??(.*))$/.exec(orgIdAppId);
                        var queryString = "";
                        if(arr.length >= 3){
                            orgId = arr[1];
                            appId = arr[2];
                            queryString = arr[3] || "";
                        }
                         if (FBTrace.DBG_FIRETV_DVBCHANNEL) {
	                        FBTrace.sysout(CAT + "[DVBChannel.openContentStream] orgId= " + orgId + ", appId=" + appId + ", queryString=" + queryString);
	                    }
                        if(!orgId || !appId){
                            errorTitle = "Invalid dvb uri (with ait specifier). Invalid <orgId>.<appId>.";
                            errorMessage = "dvb uri with ait specifier must be of the form : dvb://xxx.ait/<orgId>.<appId>";
                            return this.makeErrorInputStream(404, errorTitle, errorMessage);
                        }
                        // -- now a valid orgId/appId
                        var appRootFileUrlSpec = "file:///" + globalDVBRoot.path + "/" + orgIdAppId;
                        var appRootFileUrl = ioService.newURI(appRootFileUrlSpec, null, null).QueryInterface(Ci.nsIFileURL);
                        var appRootFile = appRootFileUrl.file;
                        if(!appRootFile.exists()){
                            errorTitle = "Invalid dvb uri (with ait specifier).";
                            errorMessage = "The following plain text file should exists : " + appRootFile.path + 
                                " and contains the URL of the given application (either an http(s) or file url).";
                            return this.makeErrorInputStream(404, errorTitle, errorMessage);
                        } else{
                            var appUriSpec = scope.FireTVPlugin.FileUtils.getResourceAsString(appRootFileUrlSpec).trim();
                            var appUri = null;
                            try {
                                appUri = ioService.newURI(appRootFileUrlSpec, null, null);
                                if(appUri.scheme != "file" && appUri.scheme != "http" && appUri.scheme != "https" && appUri.scheme != "dvb"){
                                    appUri = null;
                                }
                            }catch(e){
                            }
                            if (!appUri){
                                errorTitle = "Invalid application url spec :" + appUriSpec;
                                errorMessage = "Unable to handle the given url! URI must be either an http(s), file or dvb url.";
                                return this.makeErrorInputStream(404, errorTitle, errorMessage);                            }
                            if (FBTrace.DBG_FIRETV_DVBCHANNEL) {
                                FBTrace.sysout(CAT + "[DVBChannel.openContentStream] Found related application uri : " + appUriSpec);
                            }
                            var urlBase = appUriSpec.substring(0,appUriSpec.lastIndexOf("/") +1);
                            var urlPath = appUriSpec.substring(appUriSpec.lastIndexOf("/")+1);
                            var xmlait = this.getXMLAIT(orgId, appId, urlBase, urlPath, queryString);
                            if (FBTrace.DBG_FIRETV_DVBCHANNEL) {
                                FBTrace.sysout(CAT + "[DVBChannel.openContentStream] Generated XML AIT:" , xmlait);
                            }
                            // returns xml ait
                            var inputStream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);
                            inputStream.data = xmlait;
                            this.contentLength = xmlait.length;
                            this.contentType = "application/vnd.dvb.ait+xml";
                            HttpChannel.prototype.openContentStream.apply(this, []);
                            return inputStream;
                        }
                        
                        throw Cr.NS_ERROR_NOT_IMPLEMENTED;
                    }
                    var fileUri = ioService.newURI(firetvDVBRoot + this.URI.path, null, null).QueryInterface(Ci.nsIFileURL);
                    
                    var file = fileUri.file;
                    if (FBTrace.DBG_FIRETV_DVBCHANNEL) {
                        FBTrace.sysout(CAT + "[DVBChannel.openContentStream] related file: " + file.path);
                    }
                    
                    var exists = file.exists();
                    if (FBTrace.DBG_FIRETV_DVBCHANNEL) {
                        FBTrace.sysout(CAT + "[DVBChannel.openContentStream] exists: " + exists);
                    }
                    if(!exists){
                        errorTitle = "The related file was not found in your <DVB_ROOT_DIR>";
                        errorMessage = "Please check " + file.path + " existency.";
                        return this.makeErrorInputStream(404, errorTitle, errorMessage);
                    }
                    
                    // -- file was found and exists, send response
                    this.setResponseHeader("Last-Modified", new Date(file.lastModifiedTime).toString());
                    try {
                        var streamProperties = this.prepareFileInputStream(file);
                        this.contentLength = streamProperties.streamLength;
                        this.contentType = streamProperties.contentType;
                        HttpChannel.prototype.openContentStream.apply(this, arguments);
                        return streamProperties.inputStream;
                    } catch (e) {
                        if (FBTrace.DBG_FIRETV_DVBCHANNEL || FBTrace.DBG_FIRETV_ERROR) {
                            FBTrace.sysout(CAT
                                    + "[DVBChannel.openContentStream] ERROR while opening content stream", e);
                        }
                        throw e;
                    }
            },
            enumerable : true
        },
        
        getXMLAIT : {
            value : function getXMLAIT(orgId, appId, urlBase, urlPath, queryString){
                var xml = '';
                xml += '<?xml version="1.0" encoding="UTF-8"?>\n'; 
                xml += '<mhp:ServiceDiscovery xmlns:mhp="urn:dvb:mhp:2009" xmlns:ipi="urn:dvb:metadata:iptv:sdns:2008-1" xmlns:tva="urn:tva:metadata:2005" xmlns:mpeg7="urn:tva:mpeg7:2005" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:dvb:mhp:2009 mis_xmlait.xsd">\n'; 
                xml += '<mhp:ApplicationDiscovery DomainName="mit-xperts.com">\n'; 
                xml += '    <mhp:ApplicationList>\n'; 
                xml += '        <mhp:Application>\n'; 
                xml += '            <mhp:appName Language="deu">HbbTV Testsuite XML AIT Test</mhp:appName>\n'; 
                xml += '            <mhp:applicationIdentifier>\n'; 
                xml += '                <mhp:orgId>'+orgId+'</mhp:orgId>\n'; 
                xml += '                <mhp:appId>'+appId+'</mhp:appId>\n'; 
                xml += '            </mhp:applicationIdentifier>\n'; 
                xml += '            <mhp:applicationDescriptor>\n'; 
                xml += '                <mhp:type>\n'; 
                xml += '                    <mhp:OtherApp>application/vnd.hbbtv.xhtml+xml</mhp:OtherApp>\n'; 
                xml += '                </mhp:type>\n'; 
                xml += '                <mhp:controlCode>AUTOSTART</mhp:controlCode>\n'; 
                xml += '                <mhp:visibility>VISIBLE_ALL</mhp:visibility>\n'; 
                xml += '                <mhp:serviceBound>false</mhp:serviceBound>\n'; 
                xml += '                <mhp:priority>5</mhp:priority>\n'; 
                xml += '                <mhp:version>00</mhp:version>\n'; 
                xml += '                <mhp:mhpVersion>\n'; 
                xml += '                    <mhp:profile>0</mhp:profile>\n'; 
                xml += '                    <mhp:versionMajor>1</mhp:versionMajor>\n'; 
                xml += '                    <mhp:versionMinor>1</mhp:versionMinor>\n'; 
                xml += '                    <mhp:versionMicro>1</mhp:versionMicro>\n'; 
                xml += '                </mhp:mhpVersion>\n'; 
                xml += '            </mhp:applicationDescriptor>\n'; 
                xml += '            <mhp:applicationBoundary>\n'; 
                xml += '            </mhp:applicationBoundary>\n'; 
                xml += '            <mhp:applicationTransport xsi:type="mhp:HTTPTransportType">\n'; 
                xml += '                <mhp:URLBase>'+urlBase+'</mhp:URLBase>\n'; 
                xml += '            </mhp:applicationTransport>\n'; 
                if (queryString && queryString !== ""){
                	if(urlPath.indexOf("?") > -1) {
                		xml += '            <mhp:applicationLocation>'+urlPath + '&amp;' + queryString.replace(/&/g, "&amp;") + '</mhp:applicationLocation>\n';
                	} else {
                		xml += '            <mhp:applicationLocation>'+urlPath + '?' + queryString.replace(/&/g, "&amp;") + '</mhp:applicationLocation>\n';
                	}
                } else {
                	xml += '            <mhp:applicationLocation>'+urlPath+'</mhp:applicationLocation>\n';
                }
                xml += '        </mhp:Application>\n'; 
                xml += '    </mhp:ApplicationList>\n'; 
                xml += '</mhp:ApplicationDiscovery>\n'; 
                xml += '</mhp:ServiceDiscovery>\n';
                return xml;
            },
            writable: false,
            enumerable: true
        }
    });
})(DVBChannel.prototype);

