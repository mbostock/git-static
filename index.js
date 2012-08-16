var express = require("express"),
    gitteh = require("gitteh"),
    path = require("path");

gitteh.openRepository(path.join(__dirname, "repository", ".git"), function(error, repository) {
  if (error) throw error;

  repository.getIndex(function(error, index) {
    if (error) throw error;

    var server = express();

    server.get(/^\/HEAD\/(.*)/, function(request, response) {
      index.findEntry(request.params[0], function(error, entry) {
        repository.getBlob(entry.oid, function(error, blob) {
          response.end(blob.data.toString("UTF-8"));
        });
      });
    });

    server.get(/^\/([a-f0-9]{40})\/(.*)/, function(request, response) {
      repository.getCommit(request.params[0], function(error, commit) {
        if (error) return response.end(error + "");
        repository.getTree(commit.tree, function(error, tree) {
          if (error) return response.end(error + "");
          tree.entries.forEach(function(entry) {
            if (entry.name === request.params[1]) {
              repository.getBlob(entry.id, function(error, blob) {
                response.end(blob.data.toString("UTF-8"));
              });
            }
          });
        });
      });
    });

    // server.get("/", function(request, response) {
    //     repository.getBlob("9b4b40c2bca67e781930105fa190b9b90235cfe5", function(error, blob) {
    //       if (error) return response.end(error.toString());
    //       response.end(blob.data.toString("UTF-8"));
    //     });
    //   });
    // });

    server.listen(3000);
  });
});
