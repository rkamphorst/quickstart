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
        
        function Node(id, seq, title, date, info, parent) {
            this._id = id;
            this._title = title;
            this._date = date;
            this._summary = null;
            this._article = null;
            this._info = info;
            
            this._parent = parent ? parent : null;
            this._generation = null;
            
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
        
        Node.prototype.getChildren = function getChildren() {
            // return a copy of the _children internal array by using .concat()
            return this._children ? this._children.concat() : null;
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
        
        Node.prototype.toString = function toString() {
            return "Node " + this._id + ": " + this._title;
        };
        

        Node.prototype.withArticle = function() {
            return withArticle([ this ]).then(function(nodes) { return nodes[0] });
        };
        
        function withArticle (nodes) {
            var nids = [];
            var ndict = {};
            for (var i = 0; i < nodes.length; i++) {
                
                var article = node.getArticle();
                
                if (article == null) {
                    var nid = node.getId();
                    nids.push(nid);
                    ndict[nid] = node;
                }
            }
            
            if (nids.length > 0) {
                return when(fetchContent(nids))
                    .then(function(dict) {
                        for (var nid in dict) {
                            ndict[nid].setArticle(dict[nid]);
                        }
                        return nodes;
                    });
            } else {
                return when(nodes);
            }
        };        

        function withDescendants(nodes, depth) {
            var params = queryFetchTreeParams(nodes, depth);
            
            if (params.nids.length > 0) {
                return
                    when(fetchTrees(params.nids, params.depths))
                        .then(function(trees) {
                            attachFetchedTrees(nodes, trees);
                            return getAllDescendants(nodes, trees);
                        });
            } else {
                return when (getAllDescendants(nodes, trees));
            }
        }
        
        function withDescendantContent(node, depth) {
            return 
                withDescendants(node, depth)
                .then(function(descendants) {
                    var nids = descendants
                        .map(function(node) { return node.getArticle() !== null ? node.getId() : null; })
                        .filter(function(id) { return id !== null; });
                    
                    if (nids.length > 0) {
                        return when(fetchContent(nids))
                                .then(function(dict) {
                                    attachFetchedContent(node, dict);
                                    return node.getDescendants(depth);
                                });
                    } else {
                        return when(descendants);
                    }
                });
        }
        
         function getAllDescendants(nodes, depth) {
            var result = [];
            for (var i = 0; i < nodes.length; i++) {
                var nresult = nodes[i].getDescendants(depth);
                result = (nresult === null ? null : result.concat(nodes[i].getDescendants(depth)));
                if (result === null) break;
            }
            return result;
        }
            
        function attachFetchedTrees  (node, trees) {
            var myId = node.getId();
            var attachedAll = true;
            for (var i = 0; i < trees.length; i++) {
                var tree = trees[i];
                if (tree.getId() === myId) {
                    node.setChildren(tree.getChildren();
                } else {
                    var children = node.getChildren();
                    var attached = false;
                    if (children !== null && children.length > 0) {
                        for (var j = 0; j < children.length; j++) {
                            if (attachFetchedTrees(children[j], [ tree ])) {
                                attached = true;
                                break;
                            } 
                        }
                    }
                    
                    if (!attached)
                        attachedAll = false;
                }
            }
            return attachedAll;
        }
        
        function attachFetchedContent(node, dict) {
            var myId = this.getId();
            var attachedAll = true;
            for (var id in dict) {
                if (id == myId) {
                    node.setArticle(dict[id]);
                } else {
                    var children = node.getChildren();
                    var attached = false;
                    if (children != null && children.length > 0) {
                        var param = {};
                        param[id] = dict[id];
                        for (var i = 0; i < children.length; i++) {
                            if (attachFetchedContent(children[i], param)) {
                                attached = true;
                                break;
                            }
                        }
                    }
                    
                    if (!attached)
                        attachedAll = false;
                }
            }
            return attachedAll;
        }
        
        function queryFetchTreeParams(node, depth) {
            var children = node.getChildren();
            if (children === null) {
                return {
                    nids: [ node.getId() ],
                    depths: [ depth ]
                };
            } else {
                var result = {
                    nids: [],
                    depths: []
                };
                if (depth > 0) {
                    for (var i = 0; i < children.length; i++) {
                        var cresult = queryFetchTreeParams(children[i], depth - 1);
                        result.nids = result.nids.concat(cresult.nids);
                        result.depths = result.depths.concat(cresult.depths);
                    }
                }
                return result;
            }
        };
        
        function fetchTrees(nids, depths, fetcher) {
            var deferred = when.defer();
            
            try {
                if (typeof fetcher.fetchTrees == "function") {
                    var callback = deferred.resolve;
                    var errback = deferred.reject;
                    fetcher.fetchTrees(self, nids, depths, callback, errback);
                } else {
                    deferred.reject(NOT_IMPLEMENTED);
                }
            } catch (ex) {
                deferred.reject(ex);
            }
            return deferred.promise;
        }
        
        function fetchContent(nids) {
            var deferred = when.defer();
            
            try {
                if (typeof fetcher.fetchContent == "function") {
                    var callback = deferred.resolve;
                    var errback = deferred.reject;
                    fetcher.fetchContent(self, nids, callback, errback);
                } else {
                    deferred.reject(NOT_IMPLEMENTED);
                }
            } catch (ex) {
                deferred.reject(ex);
            }
            return deferred.promise;
        };
        
        function fetchNodes(props) {
            var deferred = when.defer();
            
            try {
                if (typeof fetcher.fetchNodes == "function") {
                    var callback = deferred.resolve;
                    var errback = deferred.reject;
                    fetcher.fetchNodes(self, props, callback, errback);
                } else {
                    deferred.reject(NOT_IMPLEMENTED);
                }
            } catch (ex) {
                deferred.reject(ex);
            }
            return deferred.promise;
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