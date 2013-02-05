var child = require("child_process"),
    mime = require("mime"),
    path = require("path");

// Since we have to exec git rev-parse, make sure the arguments are safe.
var safeRe = /^[0-9A-Za-z_.~/-]+$/,
    shaRe = /^[0-9a-f]{40}$/;

function readBlob(repository, revision, file, callback) {
  if (!safeRe.test(repository)) return callback(new Error("invalid repository"));
  if (!safeRe.test(revision)) return callback(new Error("invalid revision"));
  if (!safeRe.test(file)) return callback(new Error("invalid file"));

  var git = child.spawn("git", ["cat-file", "blob", revision + ":" + file], {cwd: repository}),
      data = [],
      exit;

  git.stdout.on("data", function(chunk) {
    data.push(chunk);
  });

  git.on("exit", function(code) {
    exit = code;
  });

  git.on("close", function() {
    if (exit > 0) return callback(error(exit));
    callback(null, Buffer.concat(data));
  });

  git.stdin.end();
}

exports.readBlob = readBlob;

exports.getBranches = function(repository, callback) {
  if (!safeRe.test(repository)) return callback(new Error("invalid repository"));
  child.exec("git branch -l", {cwd: repository}, function(error, stdout) {
    if (error) return callback(error);
    callback(null, stdout.split(/\n/).slice(0, -1).map(function(s) { return s.slice(2); }));
  });
};

exports.getSha = function(repository, revision, callback) {
  if (!safeRe.test(repository)) return callback(new Error("invalid repository"));
  if (!safeRe.test(revision)) return callback(new Error("invalid revision"));

  child.exec("git rev-parse " + revision, {cwd: repository}, function(error, stdout) {
    if (error) return callback(error);
    callback(null, stdout.trim());
  });
};

exports.getRelatedCommits = function(repository, branch, sha, callback) {
  if (!safeRe.test(repository)) return callback(new Error("invalid repository"));
  if (!safeRe.test(branch)) return callback(new Error("invalid branch"));
  if (!shaRe.test(sha)) return callback(new Error("invalid sha"));
  child.exec("git log --format='%H' " + branch + " | grep -C1 " + sha, {cwd: repository}, function(error, stdout) {
    if (error) return callback(error);
    var shas = stdout.split(/\n/),
        i = shas.indexOf(sha);

    callback(null, {
      previous: shas[i + 1],
      next: shas[i - 1]
    });
  });
};

exports.route = function() {
  var repository = defaultRepository,
      revision = defaultRevision,
      file = defaultFile,
      type = defaultType;

  function route(request, response) {
    var repository_,
        revision_,
        file_;

    if ((repository_ = repository(request.url)) == null
        || (revision_ = revision(request.url)) == null
        || (file_ = file(request.url)) == null) return serveNotFound();

    readBlob(repository_, revision_, file_, function(error, data) {
      if (error) return error.code === 128 ? serveNotFound() : serveError(error);
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

  route.sha = // sha is deprecated; use revision instead
  route.revision = function(_) {
    if (!arguments.length) return revision;
    revision = functor(_);
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

function defaultRevision(url) {
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

function error(code) {
  var e = new Error;
  e.code = code;
  return e;
}
