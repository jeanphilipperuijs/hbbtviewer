/* See license.txt for terms of usage */
/*global window:false, btoa, atob, alert, getFireTVPluginInstance, Components */
try {
	(function () {
		if (this.FileUtils) {
			return;
		}

		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cr = Components.results;
		
		var _this = this;
		
		var FBTrace = this.FBTrace;
		
		var fu = {};

		fu.CAT = "[ftv.filetutils] ";

		fu.getResourceAsString = function (url) {
			if (FBTrace.DBG_FIRETV_FILEUTILS) {
				FBTrace.sysout(fu.CAT + "[getResourceAsString] " + url);
			}
			var ioService = Cc["@mozilla.org/network/io-service;1"]
					.getService(Ci.nsIIOService);
			var channel = ioService.newChannel(url, "UTF-8", null);
			var input = channel.open();
			var charset = "UTF-8";
			var replacementChar = Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;
			var is = Cc["@mozilla.org/intl/converter-input-stream;1"]
					.createInstance(Ci.nsIConverterInputStream);
			is.init(input, charset, 1024, replacementChar);
			var str = {};
			var res = "";
			while (is.readString(4096, str) !== 0) {
				res += str.value;
			}
			is.close();
			input.close();
			return res;
		};

		fu.getResourceAsDataURI = function (url, contentType) {
			if (FBTrace.DBG_FIRETV_FILEUTILS) {
				FBTrace.sysout(fu.CAT + "[getResourceAsDataURI] " + url + " [content-type=" + contentType + "]");
			}
			var ioService = Cc["@mozilla.org/network/io-service;1"]
					.getService(Ci.nsIIOService);
			var binaryInputStream = Cc["@mozilla.org/binaryinputstream;1"]
					.createInstance(Ci.nsIBinaryInputStream);
			var channel = ioService.newChannel(url, null, null);
			var channelInputStream = channel.open();
			binaryInputStream.setInputStream(channelInputStream);
			var encoded = btoa(binaryInputStream.readBytes(binaryInputStream.available()));
			channelInputStream.close();
			binaryInputStream.close();
			return "data:" + contentType + ";base64," + encoded;
		};

		fu.getExtensionStorageDirectory = function () {
			var ioService = Cc["@mozilla.org/network/io-service;1"]
					.getService(Ci.nsIIOService);
			var file = Cc["@mozilla.org/file/directory_service;1"].getService(
					Ci.nsIProperties).get("ProfD", Ci.nsIFile);
			file.append("extensions");
			file.append(_this.utils.PLUGIN_ID);
			if (file.isFile()) {
				// -- extension has been loaded with addon developper helper,
				// reads the real path in the file
				var uri = ioService.newFileURI(file).spec;
				var dirpath = fu.getResourceAsString(uri);
				file = Cc["@mozilla.org/file/local;1"]
						.createInstance(Ci.nsIFile);
				file.initWithPath(dirpath);
			}
			return file;
		};

		fu.getUserStorageDirectory = function () {
			var directory = Cc["@mozilla.org/file/directory_service;1"].getService(
					Ci.nsIProperties).get("ProfD", Ci.nsIFile);
			directory.append(_this.utils.PLUGIN_ID);
			if (!directory.exists()) {
				directory.create(Ci.nsIFile.DIRECTORY_TYPE, 0755);
			}
			if (FBTrace.DBG_FIRETV_FILEUTILS) {
				FBTrace.sysout(fu.CAT + "[getUserStorageDirectory] -> " + directory.path);
			}
			return directory;
		};
		
		fu.chooseLocalFile = function (dialogTitle, filter) {
			var nsIFilePicker = Ci.nsIFilePicker;
			var fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
			if (filter) {
				fp.appendFilters(filter);
			}
			fp.init(window, dialogTitle, nsIFilePicker.modeOpen);
			var res = fp.show();
			if (res === nsIFilePicker.returnOK) {
				return fp.file;
			}
			return null;
		};

		fu.chooseLocalDirectory = function (initialDirectory, dialogTitle) {

			initialDirectory = (initialDirectory) ? initialDirectory : "";
			var nsIFilePicker = Ci.nsIFilePicker;
			var fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
				
			var initialDirExists = false;
			try {
				var aInitialDir = Cc["@mozilla.org/file/local;1"]
					.createInstance(Ci.nsIFile);
				aInitialDir.initWithPath(initialDirectory);
				if (aInitialDir.exists()) {
					fp.displayDirectory = aInitialDir;
				}
			} catch (e) {
			}
			
			fp.init(window, dialogTitle, nsIFilePicker.modeGetFolder);
			var res = fp.show();
			if (res === nsIFilePicker.returnOK) {
				return fp.file;
			}
			return null;
		};

		fu.copyFile = function (sourcefile, destdir, name) {
			// get a component for the file to copy
			var aFile = Cc["@mozilla.org/file/local;1"]
					.createInstance(Ci.nsIFile);
			if (!aFile) {
				return false;
			}

			// get a component for the directory to copy to
			var aDir = Cc["@mozilla.org/file/local;1"]
					.createInstance(Ci.nsIFile);
			if (!aDir) {
				return false;
			}
			// next, assign URLs to the file components
			aFile.initWithPath(sourcefile);
			aDir.initWithPath(destdir);

			// finally, copy the file, without renaming it
			try {
				aFile.copyTo(aDir, name);
				return true;
			} catch (ex) {
				// file already exists.
				// add error logging lib here
				return false;
			}

		};

		fu.deleteFile = function (file) {
			if (!file) {
				return true;
			}
			if (!file.exists()) {
				return true;
			}
			try {
				file.remove(false);
				return true;
			} catch (ex) {
				if (FBTrace.DBG_FIRETV_FILEUTILS || FBTrace.DBG_FIRETV_ERROR) {
					FBTrace.sysout(fu.CAT + "[deleteFile] ERROR : " + file, ex);
				}
				return false;
			}
		};

		fu.getUserImageFile = function () {
			var file = fu.getUserStorageDirectory();
			file.append("tv");
			if (FBTrace.DBG_FIRETV_FILEUTILS) {
				FBTrace.sysout(fu.CAT + "[getUserImageFile] -> " + file.path);
			}
			return file;
		};
		
		fu.getUserChannelListFile = function () {
			var file = fu.getUserStorageDirectory();
			file.append("channels");
			if (FBTrace.DBG_FIRETV_FILEUTILS) {
				FBTrace.sysout(fu.CAT + "[getUserChannelListFile] -> " + file.path);
			}
			return file;
		};

		fu.userImageExists = function () {
			return fu.getUserImageFile().exists();
		};
		
		fu.userChannelListFileExists = function () {
			return fu.getUserChannelListFile().exists();
		};

		this.FileUtils = fu;

	}).apply(getFireTVPluginInstance());

} catch (exc) {
	alert("[ftv-fileutils.js] " + exc);
}
