var express = require("express"),
    gitteh = require("gitteh"),
    path = require("path");

gitteh.openRepository(path.join(__dirname, "repository", ".git"), function(error, repository) {
  if (error) throw error;

  var server = express();

  server.get(/^\/HEAD\/(.*)/, function(request, response) {
    repository.getReference("HEAD", function(error, reference) {
      if (error) return response.end(error + "");
      reference.resolve(function(error, reference2) {
        if (error) return response.end(error + "");
        serveFile(reference2.target, request.params[0], response);
      });
    });
  });

  server.get(/^\/([a-f0-9]{40})\/(.*)/, function(request, response) {
    serveFile(request.params[0], request.params[1], response);
  });

  function serveFile(sha1, file, response) {
    repository.getCommit(sha1, function(error, commit) {
      if (error) return response.end(error + "");
      repository.getTree(commit.tree, function(error, tree) {
        if (error) return response.end(error + "");
        var found = false;
        tree.entries.forEach(function(entry) {
          if (entry.name === file) {
            repository.getBlob(entry.id, function(error, blob) {
              response.end(blob.data.toString("UTF-8"));
            });
            found = true;
          }
        });
        if (!found) response.end("File not found.");
      });
    });
  }

  server.listen(3000);
});
