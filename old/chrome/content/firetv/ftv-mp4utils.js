/* See license.txt for terms of usage */
/*global window:false, alert, getFireTVPluginInstance, Components, Uint8Array */
// MP4 atom parsing is greatly inspired by Renaun Erickson as3 code.
// See below for licence
////////////////////////////////////////////////////////////////////////////////
// 
//  Copyright (c) 2010 Renaun Erickson <renaun.com>
// 
//  Permission is hereby granted, free of charge, to any person
//  obtaining a copy of this software and associated documentation
//  files (the "Software"), to deal in the Software without
//  restriction, including without limitation the rights to use,
//  copy, modify, merge, publish, distribute, sublicense, and/or sell
//  copies of the Software, and to permit persons to whom the
//  Software is furnished to do so, subject to the following
//  conditions:
// 
//  The above copyright notice and this permission notice shall be
//  included in all copies or substantial portions of the Software.
// 
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
//  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
//  OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
//  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
//  HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
//  WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
//  OTHER DEALINGS IN THE SOFTWARE.
// 
////////////////////////////////////////////////////////////////////////////////
try {
	(function () {
		if (this.MP4Utils) {
			return;
		}
		
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cr = Components.results;
		
		const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

		var _this = this;

		var FBTrace = this.FBTrace;

		var mp4 = {};
		
		mp4.CAT = "[ftv.mp4utils] ";
		
		const MOOV_ATOM = "moov";
		const CMOV_ATOM = "cmov";
		const FTYP_ATOM = "ftyp";
		const CO64_ATOM = "co64";
		const STCO_ATOM = "stco";
		
		const read4String = function(array, index) {
			return String.fromCharCode(array[index]) + String.fromCharCode(array[index+1]) + String.fromCharCode(array[index+2]) + String.fromCharCode(array[index+3]);
		};

		const read8 = function(array, index) {
			return (array[index]) ;
		};
		
		const read32 = function(array, index) {
			return ((read8(array, index)  << 24) | 
				(read8(array, index+1) << 16) | 
				(read8(array, index+2) << 8)  | 
				(read8(array, index+3)));
		};
		
		// mp4firstChunkOfData : nsIStorageStream
		// callbackHandler
		function MP4MoovAtomChecker(mp4url, mp4Length, mp4firstChunkOfData, callbackHandler) {
			this.mp4url = mp4url;
			this.mp4Length = mp4Length;
			this.origStorageStream = mp4firstChunkOfData;
			this.callbackHandler = callbackHandler;
			this.origAtomsDesc = [];
			this.moovAtomDetected = false;
		}
		
		MP4MoovAtomChecker.prototype.mp4url = undefined;
		MP4MoovAtomChecker.prototype.mp4Length = undefined;
		MP4MoovAtomChecker.prototype.bytesRangeOffset = undefined;
		
		MP4MoovAtomChecker.prototype.origStorageStream = undefined;
		
		MP4MoovAtomChecker.prototype.origAtomsDesc = undefined;
		
		MP4MoovAtomChecker.prototype.callbackHandler = undefined;
		
		MP4MoovAtomChecker.prototype.moovAtomDetected = undefined;
		MP4MoovAtomChecker.prototype.moovBytes = undefined;
		
		
		
		//  from storage stream
		MP4MoovAtomChecker.prototype.checkMoovAtom = function () {
			var binaryInputStream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);
			var offset = 0;
			var atom;
			var atomCode, atomSize, atomReceivedSize;
			var atomSizeHigh, atomSizeLow;
			while (offset < this.origStorageStream.length) {
				binaryInputStream.setInputStream(this.origStorageStream.newInputStream(offset));
				atomSize = binaryInputStream.read32();
				atomCode = String.fromCharCode.apply(null,
						binaryInputStream.readByteArray(4));
				if (atomSize === 1) {
					// 64-bit size
					binaryInputStream.setInputStream(this.origStorageStream.newInputStream(offset + 8));
					atomSizeHigh = binaryInputStream.read32();
					atomSizeLow = binaryInputStream.read32();
					if (atomSizeHigh === 0) {
						atomSize = atomSizeLow;
					} else {
						// real 64-bit size give up
						if (FBTrace.DBG_FIRETV_MP4UTILS) {
							FBTrace.sysout(mp4.CAT + "[checkMoovAtom] -> [code: " + atom.code + "] size is real 64-bit highpart=" + atomSizeHigh + ", lowpart=" + atomSizeLow + ". Give up.");
						}
						break;
					}
				} else if (atomSize === 0) {
					// - denotes that atom goes to the EOF
					if (this.mp4Length !== -1) {
						atomSize =	this.mp4Length - offset;
					} else {
						if (FBTrace.DBG_FIRETV_MP4UTILS) {
							FBTrace.sysout(mp4.CAT + "[checkMoovAtom] -> [code: " + atom.code + "] EOF-size atom and we don't known response contentLength. Give up.");
						}
						break;
					}
				}
				if (offset + atomSize > this.origStorageStream.length) {
					// truncated atom
					atomReceivedSize = this.origStorageStream.length - offset;
				} else {
					atomReceivedSize = atomSize;
				}
				atom = {
					offset: offset, 
					size: atomSize,
					receivedSize: atomReceivedSize,
					code: atomCode
				};
				if (atom.code === MOOV_ATOM) {
					this.moovAtomDetected = true;
				}
				this.origAtomsDesc.push(atom);
				if (FBTrace.DBG_FIRETV_MP4UTILS) {
					FBTrace.sysout(mp4.CAT + "[checkMoovAtom] -> [code: " + atom.code + ", size: " + atom.size + ", offset: " + atom.offset + ", receivedSize: " + atom.receivedSize + "]");
				}
				offset += atomSize;
			}
			
			if (this.moovAtomDetected || this.origAtomsDesc.length === 0) {
				// -- nothing to do call callback
				if (FBTrace.DBG_FIRETV_MP4UTILS) {
					FBTrace.sysout(mp4.CAT + "[checkMoovAtom] moov atom already at the beginning of the stream or no atom detected, give back control");
				}
				this.callbackHandler.handleResult(this.origStorageStream.newInputStream(0));
				return;
			}
			// -- moov atom not detected, tries to find it
			this.searchForMoovAtom();
		};
		
		//  from byte buffer
		MP4MoovAtomChecker.prototype.checkNewMoovAtom = function () {
			var offset = 0;
			var atom;
			var atomCode, atomSize, atomReceivedSize;
			var atomSizeHigh, atomSizeLow;
			while (offset < this.moovBytes.length) {
				atomSize = read32(this.moovBytes, offset);
				atomCode = read4String(this.moovBytes, offset + 4);
				
				if (atomSize === 1) {
					// 64-bit size
					atomSizeHigh = read32(this.moovBytes, offset + 8);
					atomSizeLow = read32(this.moovBytes, offset + 12);
					if (atomSizeHigh === 0) {
						atomSize = atomSizeLow;
					} else {
						// real 64-bit size give up
						if (FBTrace.DBG_FIRETV_MP4UTILS) {
							FBTrace.sysout(mp4.CAT + "[checkNewMoovAtom] -> [code: " + atom.code + "] size is real 64-bit highpart=" + atomSizeHigh + ", lowpart=" + atomSizeLow + ". Give up.");
						}
						return false;
					}
				} else if (atomSize === 0) {
					// - denotes that atom goes to the EOF
					if (this.mp4Length !== -1) {
						atomSize =	this.mp4Length - this.bytesRangeOffset - offset;
					} else {
						if (FBTrace.DBG_FIRETV_MP4UTILS) {
							FBTrace.sysout(mp4.CAT + "[checkNewMoovAtom] -> [code: " + atom.code + "] EOF-size atom and we don't known response contentLength. Give up.");
						}
						break;
					}
				}
				
				if (offset + atomSize > this.moovBytes.length) {
					// truncated atom
					atomReceivedSize = this.moovBytes.length - offset;
				} else {
					atomReceivedSize = atomSize;
				}
				atom = {
					offset: offset, 
					size: atomSize,
					receivedSize: atomReceivedSize,
					code: atomCode
				};
				if (FBTrace.DBG_FIRETV_MP4UTILS) {
					FBTrace.sysout(mp4.CAT + "[checkNewMoovAtom] -> [code: " + atom.code + ", size: " + atom.size + ", offset: " + atom.offset + ", receivedSize: " + atom.receivedSize + "]");
				}

				if (atom.code === MOOV_ATOM && atom.size === atom.receivedSize) {
					//  we received a complete moov atom
					if (FBTrace.DBG_FIRETV_MP4UTILS) {
						FBTrace.sysout(mp4.CAT + "[checkNewMoovAtom] Received a complete moov atom");
					}
					this.moovBytes =  this.moovBytes.subarray(atom.offset, atom.size);
					return true;
				}
				offset += atomSize;
			}
			return false;
		};
		
		MP4MoovAtomChecker.prototype.searchForMoovAtom = function () {
			var lastAtom = this.origAtomsDesc[this.origAtomsDesc.length - 1];
			this.bytesRangeOffset = lastAtom.offset + lastAtom.size;
			var rangeHeaderValue = "bytes=" + this.bytesRangeOffset + "-";
			if (FBTrace.DBG_FIRETV_MP4UTILS) {
				FBTrace.sysout(mp4.CAT + "[searchForMoovAtom] -> " + this.mp4url + " (Range: " + rangeHeaderValue + ")");
			}
			var oXHR = new XMLHttpRequest();
			oXHR.open("GET", this.mp4url, true);
			oXHR.setRequestHeader("Range", rangeHeaderValue);
			oXHR.setRequestHeader("X-FireTV-Ignore", "true");
			oXHR.responseType = "arraybuffer";
			var that = this;
			oXHR.onreadystatechange = function (oEvent) {
				if (oXHR.readyState === 4) {
					var validMoovAtomFound = false;
					if (oXHR.status >= 200 && oXHR.status < 300) {
						// success
						if (FBTrace.DBG_FIRETV_MP4UTILS) {
							FBTrace.sysout(mp4.CAT + "[searchForMoovAtom.onreadystatechange] success, status=" + oXHR.status);
						}
						that.moovBytes = new Uint8Array(oXHR.response);
						validMoovAtomFound = that.checkNewMoovAtom();
					} 
					if (validMoovAtomFound) {
						that.patchMoovAtom();
					} else {
						// --failure 
						if (FBTrace.DBG_FIRETV_MP4UTILS || FBTrace.DBG_FIRETV_ERROR) {
							FBTrace.sysout(mp4.CAT + "[searchForMoovAtom.onreadystatechange] ERROR, status=" + oXHR.status);
							FBTrace.sysout(mp4.CAT + "[searchForMoovAtom] give back control");
						}
						that.callbackHandler.handleResult(that.origStorageStream.newInputStream(0));
					}
				}
			};
			oXHR.send(null);
		};
		
		MP4MoovAtomChecker.prototype.patchMoovAtom = function () {
			if (FBTrace.DBG_FIRETV_MP4UTILS) {
				FBTrace.sysout(mp4.CAT + "[patchMoovAtom] moov atom size: " + this.moovBytes.length);
				FBTrace.sysout(mp4.CAT + "[patchMoovAtom] atom type: " + read4String(this.moovBytes, 4));
			}
			var successfullyPatched = false;
			var returnedInputStream = this.origStorageStream.newInputStream(0);
			var errorMessage;
			try {
				var compressionCheck = read4String(this.moovBytes, 12);
				if (compressionCheck === CMOV_ATOM) {
					errorMessage = "[patchMoovAtom] ERROR: Compressed MP4 can't do this file.";
					if (FBTrace.DBG_FIRETV_MP4UTILS) {
						FBTrace.sysout(mp4.CAT + errorMessage);
					}
					throw new Error(errorMessage);
				}
	
				var offsetCount = 0;
				var currentOffset = 0;
                var moovSize = this.moovBytes.length;
	            var moovAType = "";
	            var moovASize = 0;
	            var moovStartOffset = 12;
	            var i = moovStartOffset;
	            var j, k;
	            
	            while (i < moovSize - moovStartOffset) {
	                moovAType = read4String(this.moovBytes, i);
	                if (moovAType === STCO_ATOM)
	                {
						if (FBTrace.DBG_FIRETV_MP4UTILS) {
							FBTrace.sysout(mp4.CAT + "[patchMoovAtom] atomType:  patching stco atom...");
						}
	                    moovASize = read32(this.moovBytes, i - 4);
	                    if (i + moovASize - moovStartOffset > moovSize) {
							// we've maybe found the 'stco' string inside another atom, ignore and continue
							if (FBTrace.DBG_FIRETV_MP4UTILS) {
								FBTrace.sysout(mp4.CAT + "[patchMoovAtom] ERROR:  bad atom size");
							}
							i++;
	                        continue;
	                    }
	                    offsetCount = read32(this.moovBytes, i + 8);
	                    k = 0;
	                    j = 0;
	                    while (j < offsetCount) {
	                        k = i + 12 + j * 4;
	                        currentOffset = read32(this.moovBytes, k);
	                        currentOffset += moovSize;
	                        this.moovBytes[k] = (currentOffset >> 24) & 0xFF;
	                        this.moovBytes[(k + 1)] = (currentOffset >> 16) & 0xFF;
	                        this.moovBytes[k + 2] = (currentOffset >> 8) & 0xFF;
	                        this.moovBytes[k + 3] = (currentOffset >> 0) & 0xFF;
							j++;
						}
						i = i + (moovASize - 4);
					}
	                else if (moovAType === CO64_ATOM)
	                {
						if (FBTrace.DBG_FIRETV_MP4UTILS) {
							FBTrace.sysout(mp4.CAT + "[patchMoovAtom] atomType:  found co64 atom...");
						}
						moovASize = read32(this.moovBytes, i - 4);
	                    if (i + moovASize - moovStartOffset > moovSize)
	                    {
	                        // we've maybe found the 'co64' string inside another atom, ignore and continue
							if (FBTrace.DBG_FIRETV_MP4UTILS) {
								FBTrace.sysout(mp4.CAT + "[patchMoovAtom] ERROR:  bad atom size");
							}
							i++;
	                        continue;
	                    }
	                    // not the time to implement 64-bit operations, giving up
	                    errorMessage = "[patchMoovAtom] co64 atom patching not implemented, giving up...";
	                    if (FBTrace.DBG_FIRETV_MP4UTILS) {
							FBTrace.sysout(mp4.CAT + errorMessage);
						}
						throw new Error(errorMessage);
//	                    offsetCount = read64(this.moovBytes, i+8);
//	                    j = 0;
//	                    while (j < offsetCount)
//	                    {
//	                        currentOffset = read64(this.moovBytes, i + 12 + j * 8);
//	                        currentOffset += moovSize;
//	                        this.moovBytes[i + 12 + j * 8 + 0] = (currentOffset >> 56) & 0xFF;
//	                        this.moovBytes[i + 12 + j * 8 + 1] = (currentOffset >> 48) & 0xFF;
//	                        this.moovBytes[i + 12 + j * 8 + 2] = (currentOffset >> 40) & 0xFF;
//	                        this.moovBytes[i + 12 + j * 8 + 3] = (currentOffset >> 32) & 0xFF;
//	                        this.moovBytes[i + 12 + j * 8 + 4] = (currentOffset >> 24) & 0xFF;
//	                        this.moovBytes[i + 12 + j * 8 + 5] = (currentOffset >> 16) & 0xFF;
//	                        this.moovBytes[i + 12 + j * 8 + 6] = (currentOffset >> 8) & 0xFF;
//	                        this.moovBytes[i + 12 + j * 8 + 7] = (currentOffset >> 0) & 0xFF;
//	                        j++;
//	                    }
//	                    i = i + (moovASize - 4);
	                }
					i++;
				}
				successfullyPatched = true;
			} catch (e) {
				if (FBTrace.DBG_FIRETV_MP4UTILS || FBTrace.DBG_FIRETV_ERROR) {
					FBTrace.sysout(mp4.CAT + "[patchMoovAtom] ERROR while patching moov atom", e);
				}
			} 
			try  {
				if (successfullyPatched) {
					if (FBTrace.DBG_FIRETV_MP4UTILS) {
						FBTrace.sysout(mp4.CAT + "[patchMoovAtom] Successfully patched moov atom");
					}
					var ftypAtom = this.origAtomsDesc[0];
					var atom;
					var storageStream = Cc["@mozilla.org/storagestream;1"].createInstance(Ci.nsIStorageStream);
					var binaryInputStream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);
					var binaryOutputStream = Cc["@mozilla.org/binaryoutputstream;1"].createInstance(Ci.nsIBinaryOutputStream);
					storageStream.init(8192, this.origStorageStream.length + this.moovBytes.length, null);
					binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));
					// -- flush ftyp atom
					if (FBTrace.DBG_FIRETV_MP4UTILS) {
						FBTrace.sysout(mp4.CAT + "[patchMoovAtom] Flushing ftyp atom: [code: " + ftypAtom.code + ", size: " + ftypAtom.size + 
						", offset: " + ftypAtom.offset + ", receivedSize: " + ftypAtom.receivedSize + "]");
					}
					binaryInputStream.setInputStream(this.origStorageStream.newInputStream(ftypAtom.offset));
					binaryOutputStream.writeByteArray(binaryInputStream.readByteArray(ftypAtom.receivedSize), ftypAtom.receivedSize);
					// -- flush moov atom
					var i2;
					for (i2 = 0; i2 < this.moovBytes.length; i2++) {
						binaryOutputStream.write8(this.moovBytes[i2]);
					}
					// -- flush other received atoms
					var atomIndex;
					for (atomIndex = 1; atomIndex < this.origAtomsDesc.length; atomIndex++) {
						atom = this.origAtomsDesc[atomIndex];
						if (FBTrace.DBG_FIRETV_MP4UTILS) {
							FBTrace.sysout(mp4.CAT + "[patchMoovAtom] Flushing remaining atom: [code: " + atom.code + ", size: " + atom.size + 
							", offset: " + atom.offset + ", receivedSize: " + atom.receivedSize + "]");
						}
						binaryInputStream.setInputStream(this.origStorageStream.newInputStream(atom.offset));
						binaryOutputStream.writeByteArray(binaryInputStream.readByteArray(atom.receivedSize), atom.receivedSize);
					}
					
					binaryOutputStream.close();
					returnedInputStream = storageStream.newInputStream(0);
				}
			} catch (e2) {
				if (FBTrace.DBG_FIRETV_MP4UTILS || FBTrace.DBG_FIRETV_ERROR) {
					FBTrace.sysout(mp4.CAT + "[patchMoovAtom] ERROR while rebuilding data", e2);
				}
			}
			this.callbackHandler.handleResult(returnedInputStream);
		};
		
		mp4.MP4MoovAtomChecker = MP4MoovAtomChecker;
		
		this.MP4Utils = mp4;

	}).apply(getFireTVPluginInstance());
} catch (exc) {
	alert("[ftv-mp4utils.js] " + exc);
}
