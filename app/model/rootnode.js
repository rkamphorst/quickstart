/*
* Ordina, OSD Mobile
*
* Copyright (c) 2012 - Ordina N.V.
*
*/

(function(define) {
	
	var bus_ns = Class.ns("osd.mobile.business");
	var ns = Class.ns(bus_ns, "model");
	
	ns.RootFeed = bus_ns.FeedItem.extend({
		init: function(baseUrl, sitemapPath, useJsonP, username, password, loggedInCb) {
			this._super("/", 0, null, null, {}, null);
			this._sitemapPath = sitemapPath;
			this._baseUrl = baseUrl;
			this._articleBaseUrl = baseUrl;
			this._username = username;
			this._password = password;
			this._useJsonP = useJsonP;
			if (useJsonP && baseUrl && username && password) {
				(function (username,password){
					var scheme = baseUrl.substring(0, baseUrl.indexOf("://"));
					var baseUrlNoScheme = baseUrl.substring(baseUrl.indexOf("://") + 3);
					var imgUrl = scheme + "://" + username + ":" + password + "@" + baseUrlNoScheme + sitemapPath;
					var img = $('<img src="' + imgUrl + '" />');
					img.css({ 'opacity' : '0.001', 'zIndex': '-100' });
					var readyFunc = function() {
						img.remove();
						if (loggedInCb) {
							var cb = loggedInCb;
							loggedInCb = null;
							cb();
						}
					};
					
					img.bind("load", readyFunc);
					window.setTimeout(readyFunc, 300);
					
					$('body').append(img);
				})(username, password);
			} else {
				if (loggedInCb) {
					window.setTimeout(function() {
						loggedInCb();
					}, 0);
				}
			}
		},
		getSitemapPath: function() {
			return this._sitemapPath;
		},
		getBaseUrl: function()  {
			return this._baseUrl;
		},
		getArticleBaseUrl: function(){
			return this._articleBaseUrl;
		},
		setArticleBaseUrl: function(articleBaseUrl){
			this._articleBaseUrl = articleBaseUrl;
		},
		getUsername: function() {
			return this._username;
		},
		getPassword: function() {
			return this._password;
		},
		useJsonP: function() {
			return this._useJsonP;
		},
		createChild: function(id, seq, title, date, info) {
			return new ns.ArticleFeed(this._super(id, seq, title, date, info));
		},
		fetchChildren: function(callback) {
			var self = this;
			
			var createChild = function(forParent, childData, seq, idPrefix) {
				var id = childData.id ? childData.id : idPrefix + "-" + childData.link;
				var title = childData.title;
				var date = null;
				var info = childData;
				info.root = self;
				
				/* twee smerige hacks om cases op home screen te laten werken */
				if (info.href && !info.link) {
					info.link = info.href;
					delete info.href;
				}
				
				if (!title && info.link) {
					var parts = info.link.split('/');
					if (parts.length > 0) {
						parts = parts[parts.length - 1].split('-');
						for (var i = 0; i < parts.length; i++) {
							if (parts[i]) parts[i] = parts[i][0].toUpperCase() + parts[i].substring(1);
						}
						title = parts.join(" ");
					}
				}
				
				if (info.image) {
					var parts = info.image.split('/');
					if (parts.length > 0) {
						var lastpart = parts[parts.length - 1];
						if (lastpart) {
							info.type = (lastpart[0] == 'a' ? 'type1' : 
											(lastpart[0] == 'b' ? 'type2' : 
												(lastpart[0] == 'c' ? 'type3' : 
													(lastpart[0] == 'd' ? 'type4' : ""))));
						} else {
							info.type = "";
						}
					}
				}
				
				var createdChild = forParent.createChild(id, seq, title, date, info);
				
				if (childData.childs) {
					var children = [];
					for (var i = 0; i < childData.childs.length; i++) {
						children.push(createChild(createdChild, childData.childs[i], i, idPrefix + "." + i));
					}
					createdChild.setChildren(children);
				}
				return createdChild;
			};		
			
			var baseUrl = this.getBaseUrl();
			var url = (baseUrl ? baseUrl : window.location.origin) + this.getSitemapPath();
			var dataType = (this.useJsonP() ? "jsonp" : "text json");
            $.ajax({
                url: (baseUrl ? baseUrl : window.location.origin) + this.getSitemapPath(), 
				username: this.getUsername(),
				password: this.getPassword(),
                dataType: (this.useJsonP() ? "jsonp" : "text json"),
                success: function(data) {
                    var children = [];
                    for (var i = 0; i < data.length; i++) {
                        children.push(createChild(self, data[i], i, "" + i));
                    }
                    self.setChildren(children);
                    callback(self.getChildren());
				},
				error: function(jqXHR, textStatus, errorThrown) {
					alert("[fecthChildren] Network error: "+ textStatus+ "\r\n(data type: "+dataType+" url: "+ url);
				}
            });
		},
		fetchArticle: function(callback) {
			// skip
		}
	});
	
	ns.OverrideFeed = bus_ns.FeedItem.decorate({
		init: function(overrideRoot, override) {
			this._overrideRoot = overrideRoot;
			this._override = override ? override : this._overrideRoot;
		},
		
		getParent: function() {
			return this._parent;
		},
        
        getTitle: function() {
        	return ("title" in this._override ? this._override["title"] : this._decoree());
        },
        
        getSeq: function() {
        	return ("seq" in this._override ? this._override["seq"] : this._decoree());
        },

    	getDate: function() {
    		return ("date" in this._override ? this._override["date"] : this._decoree());
    	},
    	
		getInfo: function() {
			var dResult = this._decoree();
			var mergeItems = [ dResult, this._override ];
			var result = {};
			for (var i = 0; i < 2; i++) {
				var mItem = mergeItems[i];
				for (var prop in mItem) {
					if (mItem[prop] === null || typeof mItem[prop] != "object" && typeof mItem[prop] != "function") {
						result[prop] = mItem[prop];
					}
				}
			}
			return result;
		},
		
    	getSummary: function() {
    		return ("summary" in this._override ? this._override["summary"] : this._decoree());
    	},
						
    	getArticle: function() {
    		return ("article" in this._override ? this._override["article"] : this._decoree());
    	},
                                
        createChild: function(id, seq, title, date, info) {
			/*
			 *  First, find the appropriate child in override to pass to the child.
			 *  If none is found, childOverrride is an empty object.
			 */
			var overrideSearch = function(startAt, infoLink, infoId, infoTitle) {
				var props = {};
				if ((infoLink && infoLink == startAt.link) || (infoId && infoId == startAt.id) || (infoTitle && infoTitle == startAt.title)) {
					for (var prop in startAt) {
						if (typeof startAt[prop] != 'object' && typeof startAt[prop] != 'function') {
							props[prop] = startAt[prop];
						}
					}
				} 
				
				if (startAt.childs && startAt.childs.length) {
					var result = null;
					for (var i = 0; i < startAt.childs.length; i++) {
						result = overrideSearch(startAt.childs[i], infoLink, infoId, infoTitle);
						if (result) {
							for (var prop in result) {
								if (typeof result[prop] != 'object' && typeof result[prop] != 'function') {
									props[prop] = result[prop];
								}
							}
							result = null;
						}
					}
				}
				return props;
			};
			
			info = info ? info : {};
			var override = overrideSearch(this._overrideRoot, info.link, info.id, info.title);
        	return new ns.OverrideFeed(this._decoree(id, seq, title, date, info), this._overrideRoot, override);
        }
	});
	
	ns.BrowsableFeed = bus_ns.FeedItem.decorate({
		init: function(viewKey) {
			if (viewKey) {
				this._viewKey = viewKey;
			}
		},
		createChild: function(id, seq, title, date, info) {
			var childViewKey = null;
			if (this._viewKey && typeof this._viewKey == "object" && this._viewKey.length && this._viewKey.length > 1) {
				childViewKey = [];
				for (var i = 1; i < this._viewKey.length; i++) {
					childViewKey.push(this._viewKey[i]);
				}
			}
			return new ns.BrowsableFeed(this._decoree(id, seq, title, date, info), childViewKey);
		},
		getViewKey: function() {
			if (this._viewKey) {
				if (typeof this._viewKey == "string") {
					return this._viewKey;
				} else if (typeof this._viewKey == "object" && this._viewKey.length) {
					return this._viewKey[0];
				} else {
					return null;
				}
			} else if (this._parent && typeof this._parent.getViewKey == "function") {
				return this._parent.getViewKey();
			} else {
				return null;
			}
		},
		setViewKey: function(viewKey) {
			this._viewKey = viewKey;
		},
		getViewParams: function() {
			var info = this.getInfo();
			if (info.link) return { link: info.link };
			if (info.id) return { id: info.id};
			if (info.title) return { title: info.title };
		},
		findForViewParams: function(params, deepest) {
			var result = null;
			var info = this.getInfo();
			var children = this.getChildren();
			
			if (children && deepest && result === null) {
				for (var i = 0; i < children.length; i++) {
					result = children[i].findForViewParams(params, deepest);
					if (result !== null) break;
				}
			}
			
			if (result === null) {
				var isMatch = true;
				if (params) {
					for (var prop in params) {
						isMatch = info && prop in info && params[prop] == info[prop];
						if (!isMatch) break;
					}
				}
				if (isMatch) result = this;
			}
			
			if (children && !deepest && result === null) {
				for (var i = 0; i < children.length; i++) {
					var child = children[i];
					result = child.findForViewParams(params, deepest);
					if (result !== null) break;
				}
			}
			return result;
		},
	});
	
	ns.ArticleFeed = bus_ns.FeedItem.decorate({
	
		init: function() {
			this.quicklinks = {};
		},
		
		fetchChildren: function(callback) {
			callback(this.getChildren());
		},
		
		fetchArticle: function(callback) {
			var path = this._info.link;
			var rootFeed = this._info.root;
			var self = this;
			var baseUrl = rootFeed.getArticleBaseUrl();
			

            $.ajax({
                url: (baseUrl ? baseUrl : window.location.origin) + "/page" + path, 
				username: rootFeed.getUsername(),
				password: rootFeed.getPassword(),
                dataType: (rootFeed.useJsonP() ? "jsonp" : "text json"),
                success: function(data) {
					if (typeof data == "object" && data.success) {
						self.setArticle(data.content);
						if (data.quicklinks)
						{
							self.setQuickLinks(data.quicklinks);
						}
						callback(data.content);
					} else {
						var content = "<strong style=\"color: red;\">Cannot fetch " + path + ". Article does not exist.</strong>";
						self.setArticle(content);
						callback(content);		
					}
				},
				error: function(jqXHR, textStatus, errorThrown) {
					callback("<strong style=\"color: red;\">Cannot fetch " + path + ". Network error: " + textStatus + "</strong>");
				}
            });
			
		},
		
		setQuickLinks : function(quicklinks)
		{
			this.quicklinks = quicklinks;
		},
		
		getQuickLinks : function()
		{
			return this.quicklinks;
		},

		createChild: function(id, seq, title, date, info) {
			return new ns.ArticleFeed(this._decoree(id, seq, title, date, info));
		}
		
	});

})(typeof define == 'function'
        // AMD
        ? define
        // CommonJS
        : function(deps, factory) {
                module.exports = factory.apply(this, [require].concat(deps.slice(1).map(function(x) {
                        return require(x);
                })));
        }
 );
