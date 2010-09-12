/*
 * Plugins that do transformations on links in tweets
 * e.g. short URL expanding, image preview
 */

require.def("stream/linkplugins",

  ["stream/helpers", "/ext/parseUri.js"],
  function(helpers) {
    
    return {
      
      imagePreview: {
        transformations: {
          standard: function (url) {
            return "http://"+url.host+"/show/thumb"+url.path;
          },
          yfrog: function (url) {
            return "http://"+url.host+url.path+".th.jpg";
          },
          "i.imgur.com": function (url) {
            var path = (url.path || "").replace(/(?:.jpg)?$/, "s.jpg");
            return "http://"+url.host+path;
          },
          "imgur.com": function (url) {
            return this["i.imgur.com"](url);
          }
        },
        domains: ["img.ly", "twitpic.com", "yfrog", "imgur.com", "i.imgur.com"],
        func: function imagePreview (a, tweet, stream, plugin) { // a is a jQuery object of the a-tag
          var prefixLength = "http://".length;
          var href = a.attr("href") || "";
          var domains = plugin.domains;
          for(var i = 0, len = domains.length; i < len; ++i) {
            var domain = domains[i];
            if(href.indexOf(domain) === prefixLength) {
              var url = parseUri(href);
              var trans = plugin.transformations[domain] || plugin.transformations.standard;
              var previewURL = trans.call(plugin.transformations, url);
              var image = new Image();
              image.src = previewURL;
              var div = $('<span class="image-preview"/>');
              div.append(image)
              /*image.width = 150;
              image.height = 150;*/
              a.addClass("image").append(div);
            }
          }
        }
      },
			/*unshortens links (based on @antimatter15's commit 1d039504532546f27399)
			it should be possible to en/disable this via preferences*/
			expandLinks: {
			  func: function (shortLink) {	//starts with link at bottom
				var longLinks = new Array();
				//if (shortLink.context.href.length < 30 && shortLink.context.hostname !="twitter.com") { if logic done in streamplugins.js
			        $.getJSON('http://almaer.com/endpoint/resolver.php?callback=?', 
							{url: shortLink.context.href}, function (url) {
			          //$(shortLink).attr("class", "unshortMe");	//mark them for later rewriting
								
								if (url.length > 45) { 	//an URL with > 45 chars can break streamies tweet box layout, 45 is chosen randomly
			            lastAppearance = url.lastIndexOf("/");
			            if (lastAppearance < 45 && lastAppearance > 7) { 	//"http://".length == 7;
			              url = url.slice(0, lastAppearance+1) + "…"; 	//generate friendlier URLs by slicing afer the last '/'													
			            }
			            else {
			              url = url.slice(0, 45) + "…"; 	//link to be continued
			            }
			          }
								longLinks.push(url);	
								console.log(longLinks);	
			        })
							
				//}	
				//shortLink.text("bar"); //works only in this scope, but var url (unshortened shortLink) is not available	
			  $("a.unshortMe").each( function (i) {		  
					$(this).text(longLinks[i]);	//works with arbitrary string but array is not ready yet
					//TODO: Make it asynchron + solve the problem that API results doesn't arrive in the right order 
					console.log($(this));
				})   
			  this();
			  }
			}
    }

  }
);