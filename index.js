var gitteh = require("gitteh"),
    exec = require("child_process").exec,
    mime = require("mime"),
    path = require("path");

// Since we have to exec git rev-parse, make sure the arguments are safe.
var safeRe = /^[0-9A-Za-z_.~/-]+$/;

function readBlob(repository, sha, file, callback) {
  if (!safeRe.test(repository)) return callback(new Error("invalid repository"));
  if (!safeRe.test(sha)) return callback(new Error("invalid file"));
  if (!safeRe.test(file)) return callback(new Error("invalid sha"));

  // Until gitteh supports rev-parse, this is the best we can do.
  exec("git rev-parse " + sha + ":" + file, {cwd: repository}, function(error, stdout, stderr) {
    if (error) return error.code === 128 ? callback(null, null) : callback(error);
    gitteh.openRepository(repository, function(error, repository) {
      if (error) return callback(error);
      repository.getBlob(stdout.toString("utf-8").trim(), function(error, blob) {
        if (error) return callback(error);
        callback(null, blob.data);
      });
    });
  });
}

exports.readBlob = readBlob;

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

    readBlob(repository_, sha_, file_, function(error, data) {
      if (error) return serveError(error);
      response.statusCode = 200;
      response.setHeader("Content-Type", type(file_));
      response.end(data);
    });

    function serveError(error) {
      response.statusCode = 500;
      response.setHeader("Content-Type", "text/plain");
      response.end(error + "");
    }

    function serveNotFound() {
      response.statusCode = 404;
      response.setHeader("Content-Type", "text/plain");
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
