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
		it should be possible to disable this via preferences*/
		expandLinks: {
		  func: function (tweet) {
			console.log(tweet);
			tweet.node.find('.text a').each(function (index, link) {
		      if (link.href.length < 30 && link.href == $(link).text()) { 	//assume no shortener uses > 30 chrs
		        $.getJSON('http://almaer.com/endpoint/resolver.php?callback=?', 
						{url: link.href}, function (url) {
		          if (url.length > 45) { 	//an URL with > 45 chars can break streamies tweet box layout
		            lastAppearance = url.lastIndexOf("/");
		            if (lastAppearance < 45 && lastAppearance > 7) { 	//"http://".length == 7;
		              url = url.slice(0, lastAppearance+1) + "…"; 	//generate friendlier URLs by slicing afer the last '/'													
		            }
		            else {
		              url = url.slice(0, 45) + "…"; 	//link to be continued
		            }
		          }
		          $(link).text(url);
		          $(link).attr('href', url);
		        })
		      }
		    });
		    this();
		  }
		}
    }
      
  }
);