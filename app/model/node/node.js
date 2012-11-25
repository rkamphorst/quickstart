/*
* Ordina, OSD Mobile
*
* Copyright (c) 2012 - Ordina N.V.
*
*/

(function(define) {

    define([ "when" ], function ( when ) {
        var NOT_IMPLEMENTED = new Error ("NOT IMPLEMENTED");
        var rootNode = null;
        
        function Node(id, seq, title, date, info, parent, fetcher) {
            this._id = id;
            this._title = title;
            this._date = date;
            this._summary = null;
            this._article = null;
            this._info = info;
            
            this._parent = parent ? parent : null;
            this._generation = null;
            
            if (fetcher) {
                this._fetcher = fetcher;
            } else if (parent) {
                this._fetcher = parent._fetcher;
            } else {
                this._fetcher = {};
            }
            
            this._children = null;
            this._seq = seq ? seq : 0;
            this._info = info;
        }
        
        Node.prototype.getParent = function getParent() {
            return this._parent;
        };
        
        Node.prototype.setParent = function setParent(parent) {
            this._parent = parent ? parent : null;
            this._generation = null;
            if (this._children != null) {
                for (var i = 0; i < this._children.length; i++) {
                    this._children[i].setParent(this);
                }
            }
        };
        
        Node.prototype.getGeneration = function getGeneration() {
            if (this._generation === null) {
                this._generation = this._parent ? this._parent.getGeneration() + 1 : 0;
            }
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
            this.setArticle(null);
        };
        
        Node.prototype.getChildren = function getChildren() {
            // return a *copy* of the _children internal array by using .concat()
            return this._children ? this._children.concat() : null;
        };
        
        Node.prototype.getDescendants = function getDescendants(depth) {
            
            var children = this.getChildren();
            if (children == null) 
            {
                return null;
            } 
            else if (!depth || depth <= 1) 
            {
                return children;
            } 
            else 
            {
                var descendants = [];
                
                for (var i = 0; i < children.length; i++) 
                {
                    var chdesc = children[i].getDescendants(depth - 1);
                    descendants = chdesc != null ? descendants.concat(chdesc) : null;
                }
            }
            return descendants;   
        };
        
        Node.prototype.setChildren = function setChildren(items) {
            if (this._children !== null) {
                for (var i = 0; i < this._children.length; i++) {
                    this._children[i].setParent(null);
                }
            }
            
            this._children = items ? items.concat() : null;
            this._children.sort(function(a, b) { return a.getSeq() - b.getSeq(); });
            
            if (this._children !== null) {
                for (var i = 0; i < this._children.length; i++) {
                    this._children[i].setParent(this);
                }
            }
        };
        
        Node.prototype.clearChildren = function clearChildren() {
            this.setChildren(null);
        };
        
        Node.prototype.createChild = function createChild(id, seq, title, date, info) {
            return new Node(id, seq, title, date, info, this);
        };
        
        Node.prototype.toString = function toString() {
            return "Node " + this._id + ": " + this._title;
        };
        
        Node.prototype.withDescendants = function withDescendants(depth) {
            var params = this.queryFetchTreeParams(depth);
            var self = this;
            
            if (params.nids.length > 0) {
                return
                    when(this.fetchTrees(params.nids, params.depths))
                        .then(function(trees) {
                            self.attachFetchedTrees(trees);
                            return self.getDescendants();
                        });
            } else {
                return when (self.getDescendants());
            } 
        };
        
        Node.prototype.withDescendantContent = function withDescendantContent(depth) {
            var self = this;
            return this
                .withDescendants(depth)
                .then(function(descendants) {
                    var params = descendants
                        .map(function(node) { return node.getArticle() !== null ? node.getId() : null; })
                        .filter(function(id) { return id !== null; });
                    
                    if (params.length > 0) {
                        return when(self.fetchContent(params))
                                .then(function(dict) {
                                    self.attachFetchedContent(dict);
                                    return self.getDescendants(depth);
                                });
                    } else {
                        return when(descendants);
                    }
                });
        };
        
        Node.prototype.withChildren = function withChildren() {
            return this.withDescendants(1);
        };

        Node.prototype.withChildArticles = function withChildArticles() {
            return this.withDescendantContent(1);
        }

        Node.prototype.withArticle = function withArticle() {
            var myId = this.getId();
            var self = this;
            return when(this.fetchContent([ myId ]))
                .then(function(dict) {
                    self.setArticle(dict[myId]);
                    return self;
                });
        };        

        Node.prototype.queryFetchTreeParams = function(depth) {
            if (this._children === null) {
                return {
                    nids: [ this.getId() ],
                    depths: [ depth ]
                };
            } else {
                var result = {
                    nids: [],
                    depths: []
                };
                if (depth > 0) {
                    for (var i = 0; i < this._children.length; i++) {
                        var cresult = this._children[i].queryFetchTreeParams(depth - 1);
                        result.nids = result.nids.concat(cresult.nids);
                        result.depths = result.depths.concat(cresult.depths);
                    }
                }
                return result;
            }
        };
        
        Node.prototype.attachFetchedTrees = function(trees) {
            var myId = this.getId();
            var attachedAll = true;
            for (var i = 0; i < trees.length; i++) {
                var tree = trees[i];
                if (tree.getId() == myId) {
                    this.setChildren(tree.getChildren();
                } else if (this._children !== null && this._children.length > 0) {
                    for (var j = 0; j < this._children.length; j++) {
                        if (!this._children[j].attachFetchedTrees([ tree ])) {
                            attachedAll = false;
                        } else {
                            attachedAll = true;
                            break;
                        }
                    }
                } else {
                    attachedAll = false;
                }
            }
            return attachedAll;
        };
        
        Node.prototype.attachFetchedContent = function(dict) {
            var myId = this.getId();
            var attachedAll = true;
            for (var id in dict) {
                if (id == myId) {
                    this.setArticle(dict[id]);
                } else if (this._children.length != null && this._children.length > 0) {
                    var param = {};
                    param[id] = dict[id];
                    for (var i = 0; i < this._children.length; i++) {
                        if (this._children.attachFetchedContent(param)) {
                            attachedAll = true;
                            break;
                        } else {
                            attachedAll = false;
                        }
                    }
                } else {
                    attachedAll = false;
                }
            }
            return attachedAll;
        }
        
        Node.prototype.fetchTrees = function fetchTrees(nids, depths) {
            var self = this;
            var deferred = when.defer();
            
            try {
                if (typeof this._fetcher.fetchTrees == "function") {
                    var callback = deferred.resolve;
                    var errback = deferred.reject;
                     this._fetcher.fetchTrees(self, nids, depths, callback, errback);
                } else {
                    deferred.reject(NOT_IMPLEMENTED);
                }
            } catch (ex) {
                deferred.reject(ex);
            }
            return deferred.promise;
        };
        
        Node.prototype.fetchContent = function fetchContent(nids) {
            var self = this;
            var deferred = when.defer();
            
            try {
                if (typeof this._fetcher.fetchContent == "function") {
                    var callback = deferred.resolve;
                    var errback = deferred.reject;
                    this._fetcher.fetchContent(self, nids, callback, errback);
                } else {
                    deferred.reject(NOT_IMPLEMENTED);
                }
            } catch (ex) {
                deferred.reject(ex);
            }
            return deferred.promise;
        };
        
        Node.prototype.fetchNodes = function fetchNodes(props) {
            var self = this;
            var deferred = when.defer();
            
            try {
                if (typeof this._fetcher.fetchNodes == "function") {
                    var callback = deferred.resolve;
                    var errback = deferred.reject;
                     this._fetcher.fetchNodes(self, props, callback, errback);
                } else {
                    deferred.reject(NOT_IMPLEMENTED);
                }
            } catch (ex) {
                deferred.reject(ex);
            }
            return deferred.promise;
        };
        
        Node.withRootNode = function fetchRootNode(fetcher, depth) {
            if (rootNode != null) {
                return when(rootNode.withDescendants(depth));
            } else {
                var fakeNode = new Node(-1, 0, null, null, null, null, fetcher);
                return 
                    fakeNode.fetchTrees([ 0 ], depth + 1)
                        .then(function(trees)) {
                            if (trees.length == 0) {
                                throw new Error ("No root node with id = 0!");
                            }
                            rootNode = trees[0];
                            return rootNode;
                        });
            }
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