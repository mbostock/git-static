var gitteh = require("gitteh"),
    mime = require("mime"),
    path = require("path");

exports.route = function() {
  var repository = defaultRepository,
      sha = defaultSha,
      file = defaultFile,
      type = defaultType;

  function route(request, response) {
    var repository_,
        sha_,
        file_;

    if ((repository_ = repository(request.url)) == null
        || (sha_ = sha(request.url)) == null
        || (file_ = file(request.url)) == null) return serveNotFound();

    gitteh.openRepository(repository_, function(error, repository) {
      return error ? serveError(error)
          : /^[0-9a-f]{40}$/.test(sha_) ? serveSha(sha_)
          : serveReference(sha_);

      function serveReference(reference) {
        repository.getReference(reference, function(error, reference) {
          if (error) return serveError(error);
          reference.resolve(function(error, reference) {
            if (error) return serveError(error);
            serveSha(reference.target);
          });
        });
      }

      function serveSha(sha) {
        repository.getCommit(sha, function(error, commit) {
          if (error) return serveError(error);
          repository.getTree(commit.tree, function(error, tree) {
            if (error) return serveError(error);
            var found = false;
            tree.entries.forEach(function(entry) {
              if (entry.name === file_) {
                repository.getBlob(entry.id, function(error, blob) {
                  if (error) return serveError(error);
                  response.writeHead(200, {"Content-Type": type(file_)});
                  response.end(blob.data);
                });
                found = true;
              }
            });
            if (!found) serveNotFound();
          });
        });
      }
    });

    function serveError(error) {
      response.writeHead(500, {"Content-Type": "text/plain"});
      response.end(error + "");
    }

    function serveNotFound() {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.end("File not found.");
    }
  }

  route.repository = function(_) {
    if (!arguments.length) return repository;
    repository = functor(_);
    return route;
  };

  route.sha = function(_) {
    if (!arguments.length) return sha;
    sha = functor(_);
    return route;
  };

  route.file = function(_) {
    if (!arguments.length) return file;
    file = functor(_);
    return route;
  };

  route.type = function(_) {
    if (!arguments.length) return type;
    type = functor(_);
    return route;
  };

  return route;
};

function functor(_) {
  return typeof _ === "function" ? _ : function() { return _; };
}

function defaultRepository() {
  return path.join(__dirname, "repository");
}

function defaultSha(url) {
  return url.substring(1, url.indexOf("/", 1));
}

function defaultFile(url) {
  return url.substring(url.indexOf("/", 1) + 1);
}

function defaultType(file) {
  var type = mime.lookup(file, "text/plain");
  return text(type) ? type + "; charset=utf-8" : type;
}

function text(type) {
  return /^(text\/)|(application\/(javascript|json)|image\/svg$)/.test(type);
}
