/*
* Ordina, OSD Mobile
*
* Copyright (c) 2012 - Ordina N.V.
*
*/

(function() {
    var ns = Class.ns("osd.mobile.business");
    
    ns.FeedItem = Class.extend({

		init: function(id, seq, title, date, info, parent) {
    		this._id = id;
    		this._title = title;
    		this._date = date;
    		this._summary = null;
    		this._article = null;
			this._info = info;
			this._parent = parent ? parent : null;
			this._generation = parent ? parent.getGeneration() + 1: 0;
			
	        this._children = null;
	        this._seq = seq ? seq : 0;
			this._info = info;
    	},
    	
		getParent: function() {
			return this._parent;
		},
		
		getGeneration: function() {
			return this._generation;
		},
		
    	getId: function() {
    		return this._id;
    	},
        
        getTitle: function() {
        	return this._title;	
        },
        
        getSeq: function() {
        	return this._seq;
        },

    	getDate: function() {
    		return this._date;
    	},
    	
		getInfo: function() {
			return this._info;
		},
		
    	getSummary: function() {
    		return this._summary;
    	},
		
		setSummary: function(summary) {
			this._summary = summary;
		},
		
		clearSummary: function() {
			this._summary = null;
		},
		
    	getArticle: function() {
    		return this._article;
    	},
        
    	setArticle: function(content) {
    		this._article = content;
    	},

    	clearArticle: function() {
    		this._article = null;
    	},

        getChildren: function() {
        	// return a *copy* of the _children internal array by using .concat()
        	return this._children ? this._children.concat() : null;
        },
        
        setChildren: function(items) {
        	this._children = items ? items.concat() : null;
        },
        
        clearChildren: function() {
        	this._children = null;
        },
        
        createChild: function(id, seq, title, date, info) {
        	return new ns.FeedItem(id, seq, title, date, info, this);
        },
		
    	toString: function() {
    		return "FeedItem " + this._id + ": " + this._title;
    	},
		
    	withChildren: function(callback) {
			var items = this.getChildren();
			if (items != null) {
				if (callback) callback(items);
			} else {
				var feed = this;
				items = this.fetchChildren(function(items) {
					feed.setChildren(items);
					if (callback) callback(feed.getChildren());	
				});
			}

		},

		withChildArticles: function(callback) {
			this.withChildren(function(children) {
				var countDown = children.length;
				if (countDown == 0) {
					if (callback) callback(children);
				} else {
					var fetch = function(child) {
						child.withArticle(function(article) {
							countDown--;
							if (countDown == 0) {
								if (callback) callback(children);
							}
						});
					};
					for (var i = 0; i < children.length; i++) {
						fetch(children[i]);
					}
				}
			});
		},

		withArticle: function(callback) {
			var article = this.getArticle();
			if (article != null) {
				if (callback) callback(article);
			} else {
				var self = this;
				this.fetchArticle(function(article) {
					self.setArticle(article);
					if (callback) callback(article);
				});
			}
		},		

		
    	fetchChildren: function(callback) {
    		throw new Error("fetchChildren is abstract");
    	},

    	fetchArticle: function(callback) {
    		throw new Error("fetchArticle is abstract");	
    	}		
    });
    
})();