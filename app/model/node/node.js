/*jslint nomen: true, white: true, browser: true, node: true, indent: 4 */

/*
 * Ordina, OSD Mobile
 *
 * Copyright (c) 2012 - Ordina N.V.
 *
 */ 
(function (define) {

    'use strict';

    define(["when"], function (when) {
        var
            fetcher,
            NOT_IMPLEMENTED = new Error("NOT IMPLEMENTED"),
            globalNodeIndex = {};

        function Node(id, seq, title, summary, date, info) {
            if (arguments.length == 1 && typeof arguments[0] == "object") {
                id = arguments[0].nid;
                seq = arguments[0].seq;
                title = arguments[0].title;
                summary = arguments[0].summary;
                date = arguments[0].date;
                info = arguments[0].info;
            } else {
                this._id = id;
                this._title = title;
                this._summary = summary;
                this._date = date;
                this._info = info;
                this._seq = seq || 0;

                this._content = null;
                this._parent = null;
                this._generation = null;
                this._children = null;
            }
        }

        Node.prototype.getParent = function getParent() {
            return this._parent;
        };

        Node.prototype.setParent = function setParent(parent) {
            var i;
            this._parent = parent || null;
            this._generation = null;
            if (this._children !== null) {
                for (i = 0; i < this._children.length; i += 1) {
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

        Node.prototype.getContent = function getContent() {
            return this._content;
        };

        Node.prototype.setContent = function setContent(content) {
            this._content = content;
        };

        Node.prototype.getDescendants = function getDescendants(depth) {
            var children, descendants, i, chdesc;

            if (depth === 0) {
                return [this];
            }

            children = this.getChildren();
            if (children === null) {
                return null;
            }

            if (depth === 1) {
                return children;
            }

            descendants = [];
            for (i = 0; i < children.length; i += 1) {
                chdesc = children[i].getDescendants(depth - 1);
                descendants = chdesc !== null ? descendants.concat(chdesc) : null;
            }
            return descendants;
        };

        Node.prototype.getChildren = function getChildren() {
            // return a copy of the _children internal array by using .concat()
            return this._children ? this._children.concat() : null;
        };

        Node.prototype.setChildren = function setChildren(items) {
            var i;
            if (this._children !== null) {
                for (i = 0; i < this._children.length; i += 1) {
                    this._children[i].setParent(null);
                }
            }

            this._children = items ? items.concat() : null;
            this._children.sort(function (a, b) {
                return a.getSeq() - b.getSeq();
            });

            if (this._children !== null) {
                for (i = 0; i < this._children.length; i += 1) {
                    this._children[i].setParent(this);
                }
            }
        };

        Node.prototype.toString = function toString() {
            return "Node " + this._id + ": " + this._title;
        };

        function fetchTrees(nids, depths, fetcher) {
            var callback, errback,
            deferred = when.defer();

            try {
                if (typeof fetcher.fetchTrees === "function") {
                    callback = deferred.resolve;
                    errback = deferred.reject;
                    fetcher.fetchTrees(nids, depths, callback, errback);
                } else {
                    deferred.reject(NOT_IMPLEMENTED);
                }
            } catch (ex) {
                deferred.reject(ex);
            }
            return deferred.promise;
        }

        function fetchContent(nids) {
            var callback, errback,
            deferred = when.defer();

            try {
                if (typeof fetcher.fetchContent === "function") {
                    callback = deferred.resolve;
                    errback = deferred.reject;
                    fetcher.fetchContent(nids, callback, errback);
                } else {
                    deferred.reject(NOT_IMPLEMENTED);
                }
            } catch (ex) {
                deferred.reject(ex);
            }
            return deferred.promise;
        }

        function fetchNodes(props) {
            var
            callback, errback,
            deferred = when.defer();

            try {
                if (typeof fetcher.fetchNodes === "function") {
                    callback = deferred.resolve;
                    errback = deferred.reject;
                    fetcher.fetchNodes(props, callback, errback);
                } else {
                    deferred.reject(NOT_IMPLEMENTED);
                }
            } catch (ex) {
                deferred.reject(ex);
            }
            return deferred.promise;
        }

        function withNodes(nodes) {
            var i,
            nids = [],
                nidx = {};

            nodes = nodes.concat();
            for (i = 0; i < nodes.length; i += 1) {
                if (typeof nodes[i] === "string" || typeof nodes[i] === "number") {
                    if (globalNodeIndex.hasOwnProperty(nodes[i])) {
                        nodes[i] = globalNodeIndex[nodes[i]];
                    } else {
                        nids.push(nodes[i]);
                        nidx[nodes[i]] = i;
                    }
                }
            }

            if (nids.length > 0) {
                return fetchTrees(nids, 0)
                    .then(function (newNodes) {
                    var i, nid;
                    for (i = 0; i < newNodes.length; i += 1) {
                        nid = newNodes[i].getId();
                        globalNodeIndex[nid] = newNodes[i];
                        if (nidx.hasOwnProperty(nid)) {
                            nodes[nidx[nid]] = newNodes[i];
                        }
                    }
                    return nodes;
                });
            }

            return when(nodes);
        }

        function withContent(nodesornids) {
            return withNodes(nodesornids)
                .then(function (nodes) {
                var
                i, content, node, nid,
                nids = [],
                    ndict = {};
                for (i = 0; i < nodes.length; i += 1) {
                    node = nodes[i];
                    content = node.getContent();

                    if (content === null) {
                        nid = node.getId();
                        nids.push(nid);
                        ndict[nid] = node;
                    }
                }

                if (nids.length > 0) {
                    return fetchContent(nids)
                        .then(function (dict) {
                        var nid;
                        for (nid in dict) {
                            if (dict.hasOwnProperty(nid)) {
                                ndict[nid].setContent(dict[nid]);
                            }
                        }
                        return nodes;
                    });
                }
                return when(nodes);
            });
        }

        function getAllDescendants(nodes, depth) {
            var
            i, nresult,
            result = [];
            for (i = 0; i < nodes.length; i += 1) {
                nresult = nodes[i].getDescendants(depth);
                result = (nresult === null ? null : result.concat(nodes[i].getDescendants(depth)));
                if (result === null) {
                    break;
                }
            }
            return result;
        }

        function queryFetchTreeParams(nodes, depth) {
            var i, children, cresult,
            result = {
                nids: [],
                depths: []
            };
            if (depth > 0) {
                for (i = 0; i < nodes.length; i += 1) {
                    children = nodes[i].getChildren();
                    if (children === null) {
                        result.nids.push(nodes[i].getId());
                        result.depths.push(depth);
                    } else {
                        cresult = queryFetchTreeParams(children, depth - 1);
                        result.nids = result.nids.concat(cresult.nids);
                        result.depths = result.depths.concat(cresult.depths);
                    }
                }
            }
            return result;
        }

        function attachFetchedTrees(nodes, trees) {
            var
            tree, tid, attached,
            nid, children, i, j,
            attachedAll = true;

            for (i = 0; i < trees.length; i += 1) {
                tree = trees[i];
                tid = tree.getId();
                attached = false;

                for (j = 0; j < nodes.length; j += 1) {
                    nid = nodes[j].getId();
                    if (nid === tid) {
                        nodes[j].setChildren(tree.getChildren());
                        attached = true;
                        break;
                    }
                }

                if (!attached) {
                    children = getAllDescendants(nodes, 1);
                    attached = attachFetchedTrees(children, [tree]);
                }

                if (!attached) {
                    attachedAll = false;
                }
            }

            return attachedAll;

        }

        function withDescendants(nodesornids, depth) {
            return withNodes(nodesornids)
                .then(function (nodes) {
                var params = queryFetchTreeParams(nodes, depth);

                if (params.nids.length > 0) {
                    return fetchTrees(params.nids, params.depths)
                        .then(function (trees) {
                        attachFetchedTrees(nodes, trees);
                        return getAllDescendants(nodes, depth);
                    });
                }
                return when(getAllDescendants(nodes, depth));
            });
        }

        function attachFetchedContent(nodes, dict) {
            var
            did, attached,
            nid, children, i,
            param,
            attachedAll = true;

            for (did in dict) {
                if (dict.hasOwnProperty(did)) {
                    attached = false;
                    for (i = 0; i < nodes.length; i += 1) {
                        nid = nodes[i].getId();
                        if (did === nid) {
                            nodes[i].setContent(dict[did]);
                            attached = true;
                            break;
                        }
                    }

                    if (!attached) {
                        param = {};
                        param[did] = dict[did];
                        children = getAllDescendants(nodes, 1);
                        attached = attachFetchedContent(children, param);
                    }

                    if (!attached) {
                        attachedAll = false;
                    }
                }
            }
            return attachedAll;
        }

        function withDescendantContent(nodesornids, depth) {
            return withNodes(nodesornids)
                .then(function (nodes) {
                return withDescendants(nodes, depth)
                    .then(function (descendants) {
                    var nids = descendants.map(function (node) {
                        return node.getContent() !== null ? node.getId() : null;
                    })
                        .filter(function (id) {
                        return id !== null;
                    });

                    if (nids.length > 0) {
                        return fetchContent(nids)
                            .then(function (dict) {
                            attachFetchedContent(descendants, dict);
                            return descendants;
                        });
                    }
                    return when(descendants);
                });
            });
        }


        Node.prototype.withContent = function () {
            return withContent([this])
                .then(function (nodes) {
                return nodes[0];
            });
        };

        Node.prototype.withDescendants = function (depth) {
            return withDescendants([this], depth);
        };

        Node.prototype.withDescendantContent = function (depth) {
            return withDescendantContent([this], depth);
        };

        Node.withNodes = withNodes;
        Node.withContent = withContent;
        Node.withDescendants = withDescendants;
        Node.withDescendantContent = withDescendantContent;

        return Node;
    });

}(typeof this.define === 'function'
// AMD
?
this.define
// CommonJS
:


function (deps, factory) {
    'use strict';
    module.exports = factory.apply(this, [require].concat(deps.slice(1)
        .map(function (x) {
        return require(x);
    })));
}));