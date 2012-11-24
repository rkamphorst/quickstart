/*
* Ordina, OSD Mobile
*
* Copyright (c) 2012 - Ordina N.V.
*
*/

(function(define) {

    define("model/node", function() {
        
        function Node(id, seq, title, date, info, parent) {
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
        }
        
        Node.prototype.getParent = function getParent() {
			return this._parent;
		};
		
		Node.prototype.getGeneration = function getGeneration() {
			return this._generation;
		};
		
    	Node.prototype.getId = function getId() {
    		return this._id;
    	};
        
        Node.prototype.getTitle = function getTitle() {
        	return this._title;	
        };
        
        Node.prototype.getSeq = function getSeq() {
        	return this._seq;
        };

    	Node.prototype.getDate = function getDate() {
    		return this._date;
    	};
    	
		Node.prototype.getInfo = function getInfo() {
			return this._info;
		};
		
    	Node.prototype.getSummary = function getSummary() {
    		return this._summary;
    	};
		
		Node.prototype.setSummary = function setSummary(summary) {
			this._summary = summary;
		};
		
		Node.prototype.clearSummary = function clearSummary() {
			this._summary = null;
		};
		
    	Node.prototype.getArticle = function getArticle() {
    		return this._article;
    	};
        
    	Node.prototype.setArticle = function setArticle(content) {
    		this._article = content;
    	};

    	Node.prototype.clearArticle = function clearArticle() {
    		this._article = null;
    	};
    	
    	Node.prototype.getChildren = function getChildren() {
        	// return a *copy* of the _children internal array by using .concat()
        	return this._children ? this._children.concat() : null;
        };
        
        Node.prototype.setChildren = function setChildren(items) {
        	this._children = items ? items.concat() : null;
        };
        
        Node.prototype.clearChildren = function clearChildren() {
        	this._children = null;
        };
        
        Node.prototype.createChild = function createChild(id, seq, title, date, info) {
        	return new ns.FeedItem(id, seq, title, date, info, this);
        };
		
    	Node.prototype.toString = function toString() {
    		return "Node " + this._id + ": " + this._title;
    	};
		
    	Node.prototype.withChildren = function withChildren(callback) {
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

		};

		Node.prototype.withChildArticles = function withChildArticles(callback) {
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
		};

		Node.prototype.withArticle = function withArticle(callback) {
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
		};		

		
    	Node.prototype.fetchChildren = function fetchChildren(callback) {
    		throw new Error("fetchChildren is abstract");
    	};

    	Node.prototype.fetchArticle = function fetchArticle(callback) {
    		throw new Error("fetchArticle is abstract");	
    	};
    		
    });
    
})(typeof define == 'function'
        // AMD
        ? define
        // CommonJS
        : function(deps, factory) {
                module.exports = factory.apply(this, [require].concat(deps.slice(1).map(function(x) {
                        return require(x);
                })));
        });