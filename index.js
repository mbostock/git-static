var express = require("express"),
    gitteh = require("gitteh"),
    mime = require("mime"),
    path = require("path");

var server = express();

server.get(/^\/HEAD\/(.*)/, function(request, response) {
  gitteh.openRepository(path.join(__dirname, "repository"), function(error, repository) {
    if (error) return serveError(500, error + "", response);
    repository.getReference("HEAD", function(error, reference) {
      if (error) return serveError(500, error + "", response);
      reference.resolve(function(error, reference) {
        if (error) return serveError(500, error + "", response);
        serveFile(reference.target, request.params[0], response);
      });
    });
  });
});

server.get(/^\/([a-f0-9]{40})\/(.*)/, function(request, response) {
  serveFile(request.params[0], request.params[1], response);
});

function serveFile(sha1, file, response) {
  gitteh.openRepository(path.join(__dirname, "repository"), function(error, repository) {
    if (error) return serveError(500, error + "", response);
    repository.getCommit(sha1, function(error, commit) {
      if (error) return serveError(500, error + "", response);
      repository.getTree(commit.tree, function(error, tree) {
        if (error) return serveError(500, error + "", response);
        var found = false;
        tree.entries.forEach(function(entry) {
          if (entry.name === file) {
            repository.getBlob(entry.id, function(error, blob) {
              var type = mime.lookup(file, "text/plain");
              if (text(type)) type += "; charset=utf-8";
              response.writeHead(200, {"Content-Type": type});
              response.end(blob.data);
            });
            found = true;
          }
        });
        if (!found) {
          serveError(404, "File not found.", response);
        }
      });
    });
  });
}

function serveError(code, message, response) {
  response.writeHead(code, {"Content-Type": "text/plain"});
  response.end(message);
}

function text(type) {
  return /^(text\/)|(application\/(javascript|json)|image\/svg$)/.test(type);
}

server.listen(3000);
