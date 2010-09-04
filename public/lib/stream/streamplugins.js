/*
 * List of built in plugins for tweet processing
 * 
 */

require.def("stream/streamplugins",
  ["stream/tweet", "stream/settings", "stream/twitterRestAPI", "stream/helpers", "text!../templates/tweet.ejs.html"],
  function(tweetModule, settings, rest, helpers, templateText) {
    
    settings.registerNamespace("stream", "Stream");
    settings.registerKey("stream", "showRetweets", "Show Retweets",  true);  
    
    var template = _.template(templateText);
    
    var Tweets = {};
    var Conversations = {};
    var ConversationCounter = 0;
    
    return {
      
      // turns retweets into something similar to tweets
      handleRetweet: {
        name: "handleRetweet",
        func: function (tweet) {
          if(tweet.data.retweeted_status) {
            if(settings.get("stream", "showRetweets")) {
              var orig = tweet.data;
              tweet.data = tweet.data.retweeted_status;
              tweet.retweet = orig;
            } else {
              return;
            }
          }
          this();
        }
      },
      
      // we only show tweets. No direct messages. For now
      tweetsOnly: {
        name: "tweetsOnly",
        func: function (tweet) {
          if(tweet.data.text != null) {
            this();
          }
        }
      },
      
      // marks a tweet whether we've ever seen it before using localStorage
      everSeen: {
        name: "everSeen",
        func: function (tweet) {
          var key = "tweet"+tweet.data.id;
          if(window.localStorage) {
            if(window.localStorage[key]) {
              tweet.seenBefore = true;
            } else {
              window.localStorage[key] = 1;
            }
          }
          this();
        }
      },
      
      // find all mentions in a tweet. set tweet.mentioned to true if the current user was mentioned
      mentions: {
        name: "mentions",
        func: function (tweet, stream) {
          var screen_name = stream.user.screen_name;
          tweet.mentions = [];
          tweet.data.text.replace(/(^|\W)\@([a-zA-Z0-9_]+)/g, function (match, pre, name) {
            if(name == screen_name) {
              tweet.mentioned = true;
            }
            tweet.mentions.push(name);
            return match;
          });
          this();
        }
      },
      
      // set the tweet template
      template: {
        name: "template",
        func: function (tweet) {
          tweet.template = template;
          this();
        }
      },
      
      // render the template (the underscore.js way)
      renderTemplate: {
        name: "renderTemplate",
        func: function (tweet) {
          tweet.html = tweet.template({
            tweet: tweet,
            helpers: helpers
          });
          this();
        }
      },
      
      // if a tweet with the name id is in the stream already, do not continue
      avoidDuplicates: {
        name: "avoidDuplicates",
        func: function (tweet, stream) {
          var id = tweet.data.id;
          if(Tweets[id]) {
            // duplicate detected -> do not continue;
          } else {
            Tweets[id] = tweet;
            this();
          }
        }
      },
      
      // 
      conversations: {
        name: "conversations",
        func: function (tweet, stream, plugin) {
          var id = tweet.data.id;
          var in_reply_to = tweet.data.in_reply_to_status_id;
          if(Conversations[in_reply_to]) {
            tweet.conversation = Conversations[id] = Conversations[in_reply_to];
          } else {
            tweet.conversation = Conversations[id] = {
              index: ConversationCounter++
            };
            if(in_reply_to) {
              Conversations[in_reply_to] = tweet.conversation;
            }
          }
          this();
        }
      },
      
      // put the tweet into the stream
      prepend: {
        name: "prepend",
        func: function (tweet, stream) {
          tweet.node = $(tweet.html);
          tweet.node.data("tweet", tweet); // give node access to its tweet
          stream.canvas().prepend(tweet.node);
          this();
        }
      },
      
      // htmlencode the text to avoid XSS
      htmlEncode: {
        name: "htmlEncode",
        func: function (tweet, stream) {
          var text = tweet.data.text;
          text = text.replace(/\&gt\;/g, ">"); // these are preencoded in Twitter tweets
          text = text.replace(/\&lt\;/g, "<");
          text = helpers.html(text);
          tweet.textHTML = text;
          this();
        }
      },	

      // calculate the age of the tweet and update it
      // tweet.created_at now includes an actual Date
      age: {
        name: "age",
        func: function (tweet) {
          tweet.created_at = new Date(tweet.data.created_at);
          function update () {
            var millis = (new Date()).getTime() - tweet.created_at.getTime();
            tweet.age = millis;
            var units   = {
              second: Math.round(millis/1000),
              minute: Math.round(millis/1000/60),
              hour:   Math.round(millis/1000/60/60),
              day:    Math.round(millis/1000/60/60/24),
              week:   Math.round(millis/1000/60/60/24/7),
              month:  Math.round(millis/1000/60/60/24/30), // aproximately
              year:   Math.round(millis/1000/60/60/24/365), // aproximately
            };
            var text = "";
            for(var unit in units) { // hopefully nobody extends Object :) Should use Object.keys instead.
              var val = units[unit];
              if(val > 0) {
                text = "";
                text += val + " " + unit;
                if(val > 1) text+="s "; // !i18n
              }
            };
            
            tweet.node.find(".created_at").text(text);
          }
          update();
          setInterval(update, 5000)
          this();
        }
      },
      
      // format text to HTML hotlinking, links, things that looks like links, scree names and hash tags
      formatTweetText: {
        name: "formatTweetText",
        func: function (tweet, stream) {
          var text = tweet.textHTML;
          
          //from http://gist.github.com/492947 and http://daringfireball.net/2010/07/improved_regex_for_matching_urls
          var GRUBERS_URL_RE = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/ig;

          text = text.replace(GRUBERS_URL_RE, function(url){
            return '<a href="'+((/^\w+\:\//.test(url)?'':'http://')+url)+'">'+url+'</a>';
          })
					
          // screen names
          text = text.replace(/(^|\W)\@([a-zA-Z0-9_]+)/g, function (all, pre, name) {
            return pre+'<a href="http://twitter.com/'+name+'" class="user-href">@'+name+'</a>';
          });
          // hash tags
          text = text.replace(/(^|\s)\#(\S+)/g, function (all, pre, tag) {
            return pre+'<a href="http://search.twitter.com/search?q='+encodeURIComponent(tag)+'" class="tag">#'+tag+'</a>';
          });
          
          tweet.textHTML = text;
          
          this();
        }
      },
      
      // Trigger a custom event to inform everyone about a new tweet
      // Event is not fired for tweet from the prefill
      newTweetEvent: {
        name: "newTweetEvent",
        func: function (tweet) {
          // Do not fire for tweets
          if(!tweet.prefill) {
            // { custom-event: tweet:new }
            tweet.node.trigger("tweet:new", [tweet])
          }
          this();
        }
      },
      
      // when we insert a new tweet
      // adjust the scrollTop to show the same thing as before
      keepScrollState: {
        name: "keepScrollState",
        func: function (tweet, stream) {
          if(!tweet.prefill || !tweet.seenBefore) {
            var win = $(window);
            var cur = win.scrollTop();
            var next = tweet.node.next();
            if(next.length > 0) {
              var top = cur + next.offset().top - tweet.node.offset().top;
              win.scrollTop( top );
            }
          }
          this();
        }
      },
			/*unshortens links (based on @antimatter15's commit 1d039504532546f27399)
				it should be possible to disable this via upcoming preferences*/
			expandLinks: {
			        name: 'expandLinks',
			        func: function(tweet){
			          tweet.node.find('.text a').each(function(index, link){
			          if(link.href.length < 30 && link.href == $(link).text()){ //assume no shortener uses > 30 chrs
			            $.getJSON('http://almaer.com/endpoint/resolver.php?callback=?',
			              {url: link.href},
			              function(url){						
											if (url.length > 45) { //an URL with > 45 chars can break streamies tweet box layout
												lastAppearance = url.lastIndexOf("/");												
								        if (lastAppearance < 45 && lastAppearance > 7) {	//"http://".length == 7;
								        	url = url.slice(0, lastAppearance); //generate friendlier URLs by slicing afer the last '/'													
												}
												else {
													url = url.slice(0, 45) + "…"; + "…";	//link to be continued
												}
											}												
											$(link).text(url);
			                $(link).attr('title', link.href); //set title to old one.
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