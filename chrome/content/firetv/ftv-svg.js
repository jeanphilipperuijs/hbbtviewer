/* See license.txt for terms of usage */
/*global window:false, alert, getFireTVPluginInstance, Components */
try {
	(function () {
		if (this.SVG) {
			return;
		}
		
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const Cr = Components.results;
		
		var _this = this;

		var FBTrace = this.FBTrace;
		
		var svg = {};

		svg.CAT = "[ftv.svg] ";
		
		svg.TV_IMAGE_PNG_CACHE = {
		};

		svg.getTVImage = function (profile, host, options) {

			options = (options) ? options : {};
			var pref = _this.PreferenceManager.getHostRelatedPref(host, "tvimage-display")
			var displayTVImage = _this.FileUtils.userImageExists() && (pref === true || pref === "true");
			var profileDefinition = _this.ProfileManager.getProfileDefinition(profile);
			if (FBTrace.DBG_FIRETV_SVG) {
				FBTrace.sysout(svg.CAT + "[getTVImage] for profile: " + profile + " [" + host + "] (displayTVImage=" + 
						displayTVImage + ")", {profileDefinition: profileDefinition, options: options});
			}

			var tvFormat = _this.UI.getTVFormatById(profileDefinition.defaultTVFormat);
			var targetScaledWidth = 0, targetScaledHeight = 0;
//			if (tvFormat.label == "RAW") {
			targetScaledWidth = profileDefinition.resolution.width;
			targetScaledHeight = profileDefinition.resolution.height;
//			} else {
//				targetScaledWidth = profileDefinition.resolution.height * tvFormat.ratioX / tvFormat.ratioY;
//				targetScaledHeight = profileDefinition.resolution.width * tvFormat.ratioY / tvFormat.ratioX;
//			}

			var viewBox = "0 0 " + targetScaledWidth + " " + targetScaledHeight;
			if (FBTrace.DBG_FIRETV_SVG) {
				FBTrace.sysout(svg.CAT + "[getTVImage] viewBox: " + viewBox);
			}

			var scaleFactor = 0.5;
			var centerBigFireTVLogoTransform = "scale(" + scaleFactor + ") translate(" + (targetScaledWidth / 2) + "," + (targetScaledHeight / 2) + ")";

			scaleFactor = 0.1;
			var marginFactor = 0.05;
			var translateX = Math.round(targetScaledWidth - (scaleFactor * targetScaledWidth) - (marginFactor * targetScaledWidth));
			var translateY = Math.round(marginFactor * targetScaledHeight);
			var topRightSmallFireTVLogoTransform = "translate(" + translateX + "," + translateY + ") scale(" + scaleFactor + ")";

			if (FBTrace.DBG_FIRETV_SVG) {
				FBTrace.sysout(svg.CAT + "[getTVImage] centerBigFireTVLogoTransform: " + centerBigFireTVLogoTransform);
				FBTrace.sysout(svg.CAT + "[getTVImage] topRightSmallFireTVLogoTransform: " + topRightSmallFireTVLogoTransform);
			}

			var ANIM_DELAY = 12000;

			var s = '<?xml version="1.0" encoding="utf-8"?>\n';
			s += '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" \n';
			s += '         width="' + targetScaledWidth + '" height="' + targetScaledHeight + '" \n';
			if (options.preserveAspectRatio === "false") {
				s += '         preserveAspectRatio="none"\n';
			} else {
				// -- preserve aspect ratio by default
				s += '         preserveAspectRatio="xMidYMid meet"\n';
			}
			s += '         viewBox="' + viewBox + '" \n';
			s += '         >\n';

			// -- embed font locally as external reference to FireTV font declared in user-agent stylesheet seems to not work anymore
			s += '   <style>\n';
			s += '      @font-face {\n';
			s += '         font-family: FireTV;\n';
			s += '         src: url("';
			s += _this.FileUtils.getResourceAsDataURI("chrome://firetv-fonts/content/Brie/brie-medium.otf",	"application/x-font-otf");
			s += '");\n';
			s += '         }\n';
			s += '   </style>\n';
			
			
			if (options.nochannel === true) {
				s += '   <rect x="0" y="0" width="100%" height="100%" fill="black" stroke="none" stroke-width="0"/>\n';
				s += '</svg>\n';
				if (FBTrace.DBG_FIRETV_SVG) {
					FBTrace.sysout(svg.CAT + "[getTVImage] generated (size=" + s.length + "): ", s);
				}
				return s;
			}
			
			if (options.hasOwnProperty("mediaplayer")) {
				s += '   <script type="text/javascript">\n';
				s += '   <![CDATA[ \n';
				s += _this.FileUtils.getResourceAsString("chrome://firetv-profile/content/common/mediaplayer/svg-api.js");
				s += '   ]]>\n';
				s += '   </script>\n';
			}

			s += '   <defs>\n';

			s += '      <filter id="InnerShadow" >\n';
			s += '         <feGaussianBlur stdDeviation="16" />\n';
			s += '         <feComposite\n';
			s += '            operator="arithmetic"\n';
			s += '            in2="SourceAlpha"\n';
			s += '            k2="-1"\n';
			s += '            k3="1" />\n';
			s += '      </filter> \n';

			s += '      <g id="FireTV">\n';
			s += '         <svg width="100%" height="100%" viewBox="0 0 200 130" preserveAspectRatio="xMidYMid meet">\n';
			s += '            <rect x="0" y="0" width="200" height="130" stroke="none" stroke-width="0"\n';
			s += '               fill="#FFFFFF" fill-opacity="0.3" rx="15" ry="15"/>\n';
			s += '            <rect x="20" y="20" width="160" height="80" stroke="none" stroke-width="0"\n';
			s += '               fill="#444444" fill-opacity="0.5" rx="15" ry="15"/>\n';
			s += '            <rect x="50" y="105" width="100" height="10" stroke="none" stroke-width="0"\n';
			s += '               fill="#444444" fill-opacity="0.5" rx="3" ry="3"/>\n';
			s += '            <text y="60" x="100"  alignment-baseline="baseline" dominant-baseline="central"  font-size="55px"  font-family="FireTV" fill="#FFFFFF" fill-opacity="0.5" text-anchor="middle" >FireTV</text>\n';
			s += '         </svg>\n';
			s += '	    </g>\n';

			s += '      <g id="TVFrame">\n';
			s += '         <rect x="0" y="0" width="100%" height="100%" stroke="#343739" stroke-width="0" stroke-opacity="0.5"\n';
			s += '            fill="#FFFFFF" fill-opacity="0.8" filter="url(#InnerShadow)"/>\n';
			s += '         <rect x="0" y="0" width="100%" height="100%" stroke="none" stroke-width="0"\n';
			s += '            fill="#000000" fill-opacity="0.2"/>\n';
			s += '      </g>\n';

			s += '      <pattern id="BackgroundPattern"\n';
			s += '         x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"\n';
			s += '         >\n';
			s += '         <rect x="0" y="0" width="40" height="40"\n';
			s += '            fill="#3B3E40" stroke="none"/>\n';
			s += '         <path d="M 0 20 L 0 40 L 40 0 L 20 0 z"\n';
			s += '            fill="#343739" stroke="none" stroke-width="0" />\n';
			s += '         <path d="M 20 40 L 40 20 L 40 40 z"\n';
			s += '            fill="#343739" stroke="none" stroke-width="0" />\n';
			s += '      </pattern>\n';

			s += '      <pattern id="BackgroundReversePattern"\n';
			s += '         x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"\n';
			s += '         >\n';
			s += '         <rect x="0" y="0" width="40" height="40"\n';
			s += '            fill="#3B3E40" stroke="none"/>\n';
			s += '         <path d="M 0 0 L 20 0 L 40 20 L 40 40 z"\n';
			s += '            fill="#343739" stroke="none" stroke-width="0" />\n';
			s += '         <path d="M 0 20 L 20 40 L 0 40 z"\n';
			s += '            fill="#343739" stroke="none" stroke-width="0" />\n';
			s += '      </pattern>\n';
			
			if (options.hasOwnProperty("mediaplayer")) {
				// -- player controls
				s += '      <g id="Stop">\n';
				s += '         <svg width="100" height="50" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">\n';
				s += '            <rect x="0" y="0" width="100%" height="100%" stroke="none"\n';
				s += '               stroke-width="0" fill="#444444" fill-opacity="0.5" rx="15" ry="15"  />\n';
				s += '            <path d="M 32 7 L 68 7 L 68 43 L 32 43 z" fill="#FFFFFF" fill-opacity="0.5" stroke="none"\n';
				s += '               stroke-width="0" />\n';
				s += '         </svg>\n';
				s += '      </g>\n';
				s += '      <g id="Play">\n';
				s += '         <svg width="100" height="50" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">\n';
				s += '            <rect x="0" y="0" width="100%" height="100%" stroke="none"\n';
				s += '               stroke-width="0" fill="#444444" fill-opacity="0.5" rx="15" ry="15"  />\n';
				s += '            <path d="M 36 7 L 67 25 L 36 43 z" fill="#FFFFFF" fill-opacity="0.5" stroke="none"\n';
				s += '               stroke-width="0" />\n';
				s += '         </svg>\n';
				s += '      </g>\n';
				s += '      <g id="Pause">\n';
				s += '         <svg width="100" height="50" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">\n';
				s += '            <rect x="0" y="0" width="100%" height="100%" stroke="none"\n';
				s += '               stroke-width="0" fill="#444444" fill-opacity="0.5" rx="15" ry="15"  />\n';
				s += '            <path d="M 32 7 L 44 7 L 44 43 L 32 43 z" fill="#FFFFFF" fill-opacity="0.5" stroke="none"\n';
				s += '               stroke-width="0" />\n';
				s += '            <path d="M 56 7 L 68 7 L 68 43 L 56 43 z" fill="#FFFFFF" fill-opacity="0.5" stroke="none"\n';
				s += '               stroke-width="0" />\n';
				s += '         </svg>\n';
				s += '	    </g>\n';
				s += '	    <g id="FFwd">\n';
				s += '         <svg width="100" height="50" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">\n';
				s += '            <rect x="0" y="0" width="100%" height="100%" stroke="none"\n';
				s += '               stroke-width="0" fill="#444444" fill-opacity="0.5" rx="15" ry="15"  />\n';
				s += '            <path d="M 23 7 L 54 25 L 23 43 z" fill="#FFFFFF" fill-opacity="0.5" stroke="none"\n';
				s += '               stroke-width="0" />\n';
				s += '            <path d="M 53 7 L 84 25 L 53 43 z" fill="#FFFFFF" fill-opacity="0.5" stroke="none"\n';
				s += '               stroke-width="0" />\n';
				s += '         </svg>\n';
				s += '      </g>\n';
				s += '      <g id="FRwd">\n';
				s += '         <svg width="100" height="50" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">\n';
				s += '            <g transform="scale(-1) translate(-100,-50)">\n';
				s += '               <use xlink:href="#FFwd"></use>\n';
				s += '            </g>\n';
				s += '         </svg>\n';
				s += '      </g>\n';
						
				s += '      <g id="PlayerControlDef">\n';
				s += '         <svg width="100%" height="100" preserveAspectRatio="none">\n';
				s += '            <rect x="0" y="0" width="100%" height="100%" stroke="none"\n';
				s += '               stroke-width="0" fill="#FFFFFF" fill-opacity="0.3" />\n';
				s += '            <g transform="translate(35,10)">\n';
				s += '               <use id="videoStatus" />\n';
				s += '            </g>\n';
				s += '            <text id="videoPlayPosition" y="80" x="10" alignment-baseline="baseline"\n';
				s += '               dominant-baseline="central" font-size="25px" font-family="FireTV"\n';
				s += '               fill="#FFFFFF" fill-opacity="0.5" text-anchor="left"></text>\n';
				s += '            <foreignObject y="10" x="170" width="100%" height="100">\n';
				s += '               <body xmlns="http://www.w3.org/1999/xhtml" style="background-color:transparent; width:100%; height:100%; padding:0; margin: 0">\n';
				s += '                  <div id="videoUrl" style="background-color:transparent; color:rgba(255,255,255,0.5); word-wrap: break-word;  font-size: 25px; font-family: FireTV; position: absolute; top:0; left:0; height:50px; right:170px; ">\n';
				s += '                  </div>\n';
				s += '               </body>\n';
				s += '            </foreignObject>\n';
				s += '         </svg>\n';
				s += '      </g>\n';
			}
					
			s += '	 </defs>\n';

			s += '	 <rect x="0" y="0" width="100%" height="100%" fill="url(#BackgroundReversePattern)" stroke="none" stroke-width="0"/>\n';
			if (displayTVImage) {
				//s += '	 <image width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xlink:href="firetv://img/tv"/>\n';
				s += '	 <image width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xlink:href="' + _this.FileUtils.getResourceAsDataURI("firetv://img/tv", "image/png") + ' "/>\n';
			}
			s += '   <g>\n';
			s += '      <use  xlink:href="#TVFrame" />\n';
			s += '   </g>\n';
			if (displayTVImage) {
				s += '   <g transform="' + topRightSmallFireTVLogoTransform + '">\n';
			} else {
				s += '   <g transform="' + centerBigFireTVLogoTransform + '">\n';
			}
			s += '      <use  xlink:href="#FireTV" >\n';
			s += '         <animateTransform id="anim1" begin="indefinite" restart="whenNotActive" attributeName="transform" attributeType="XML"\n';
			s += '            type="translate" values="0,0; ' + (targetScaledWidth / 2) + ',0; ' + (targetScaledWidth) + ',0; ' + (targetScaledWidth / 2) + ',0; 0,0" dur="0.8s"\n';
			s += '            additive="sum" fill="freeze"/>\n';
			s += '         <animateTransform id="anim2" begin="indefinite" restart="whenNotActive" attributeName="transform" attributeType="XML"\n';
			s += '            type="scale"     values="1,1; 0.0,1; -1,1; 0.0,1; 1,1" dur="0.8s"\n';
			s += '            additive="sum" fill="freeze"/>\n';
			s += '      </use>\n';
			s += '   </g>\n';
			
			if (!options.hasOwnProperty("mediaplayer")) {
				s += '   <g id="topLeftLabelDisplay" transform="translate(0,0)">\n';
				s += '      <foreignObject x="0" y="0" width="100%" height="100%" >\n';
				s += '         <body xmlns="http://www.w3.org/1999/xhtml" style="background-color: transparent; width:100%; height:100%; padding:0px; margin: 0px">\n';
				s += '            <div style="display:inline-block;background-color: rgba(68,68,68,0.5); color:rgba(255,255,255,0.5); border-radius: 10px; word-wrap: break-word;  padding: 10px; margin: 33px 0 0 49px; font-size: 53px; font-family: FireTV; ">\n';
				s += '               ' + options.channelDisplayName + '\n';
				s += '            </div>\n';
				s += '         </body>\n';
				s += '      </foreignObject>\n';
				s += '   </g>\n';
			}

			s += '</svg>\n';
			if (FBTrace.DBG_FIRETV_SVG) {
				FBTrace.sysout(svg.CAT + "[getTVImage] generated (size=" + s.length + "): ", s);
			}
			return s;
		};

		svg.init = function () {
			if (FBTrace.DBG_FIRETV_SVG) {
				FBTrace.sysout(svg.CAT + "[init]");
			}

			if (FBTrace.DBG_FIRETV_SVG) {
				FBTrace.sysout(svg.CAT + "[done]");
			}

		};

		svg.shutdown = function () {
			if (FBTrace.DBG_FIRETV_SVG) {
				FBTrace.sysout(svg.CAT + "[shutdown]");
			}

			if (FBTrace.DBG_FIRETV_SVG) {
				FBTrace.sysout(svg.CAT + "[done]");
			}

		};

		this.SVG = svg;

	}).apply(getFireTVPluginInstance());
} catch (exc) {
	alert("[ftv-svg.js] " + exc);
}
