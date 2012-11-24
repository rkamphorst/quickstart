/*
* Ordina, OSD Mobile
*
* Copyright (c) 2012 - Ordina N.V.
*
*/

(function(define) {
	
	define("model/rootnode", [ "./genericnode" ], function(GenericNode) {

	    var RootNode = GenericNode.extend({
            init: function(sitemapPath) {
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

        return RootNode;
	};
	
	

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
