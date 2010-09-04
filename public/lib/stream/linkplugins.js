/*
 * Plugins that do transformations on links in tweets
 * e.g. short URL expanding, image preview
 */

require.def("stream/linkplugins",
  ["stream/helpers", "/ext/parseUri.js", "stream/tweet", "stream/status.js", "stream/settings", "stream/twitterRestAPI", "stream/streamplugins.js", "text!../templates/tweet.ejs.html" ],
  function(helpers) {
    
    return {
      
      imagePreview: {
        name: "imagePreview",
        transformations: {
          standard: function (url) {
            return "http://"+url.host+"/show/thumb"+url.path;
          },
          yfrog: function (url) {
            return "http://"+url.host+url.path+".th.jpg";
          }
        },
        domains: ["img.ly", "twitpic.com", "yfrog"],
        func: function (a, tweet, stream, plugin) { // a is a jQuery object of the a-tag
          var prefixLength = "http://".length;
          var href = a.attr("href");
          var domains = plugin.domains;
          for(var i = 0, len = domains.length; i < len; ++i) {
            var domain = domains[i];
            if(href.indexOf(domain) === prefixLength) {
              var url = parseUri(href);
              var trans = plugin.transformations[domain] || plugin.transformations.standard;
              var previewURL = trans(url);
              var image = new Image();
              image.src = previewURL;
              /*image.width = 150;
              image.height = 150;*/
              a.addClass("image").append(image);
            }
          }
        }
      },
		/*unshortens links (based on @antimatter15's commit 1d039504532546f27399)
		it should be possible to disable this via upcoming preferences*/
		expandLinks: {
		  name: 'expandLinks',
		  func: function (tweet) {
		    //var tweet = li.data("tweet");
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