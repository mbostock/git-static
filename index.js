var child = require("child_process"),
    mime = require("mime"),
    path = require("path");

var shaRe = /^[0-9a-f]{40}$/;

function readBlob(repository, revision, file, callback) {
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
  child.exec("git branch -l", {cwd: repository}, function(error, stdout) {
    if (error) return callback(error);
    callback(null, stdout.split(/\n/).slice(0, -1).map(function(s) { return s.slice(2); }));
  });
};

exports.getSha = function(repository, revision, callback) {
  child.exec("git rev-parse '" + revision.replace(/'/g, "'\''") + "'", {cwd: repository}, function(error, stdout) {
    if (error) return callback(error);
    callback(null, stdout.trim());
  });
};

exports.getCommit = function(repository, revision, callback) {
  child.exec("git log -1 --format=\"format:%H%n%ad\" '" + revision.replace(/'/g, "'\''") + "'", {cwd: repository}, function(error, stdout) {
    if (error) return callback(error);
    var lines = stdout.split("\n");
    callback(null, {
      sha: lines[0],
      date: new Date(Date.parse(lines[1]))
    });
  });
};

exports.getRelatedCommits = function(repository, branch, sha, callback) {
  if (!shaRe.test(sha)) return callback(new Error("invalid SHA"));
  child.exec("git log --format='%H' '" + branch.replace(/'/g, "'\''") + "' | grep -C1 " + sha, {cwd: repository}, function(error, stdout) {
    if (error) return callback(error);
    var shas = stdout.split(/\n/),
        i = shas.indexOf(sha);

    callback(null, {
      previous: shas[i + 1],
      next: shas[i - 1]
    });
  });
};

exports.getAuthors = function(repository, callback) {
  child.exec("git shortlog -sn < /dev/tty | cut -c8- ", {cwd: repository}, function(error, stdout) {
    if (error) return callback(error);
    callback(stdout.trim().split(/\n/));
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
      response.writeHead(200, {
        "Content-Type": type(file_),
        "Cache-Control": "public, max-age=300"
      });
      response.end(data);
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
  return decodeURIComponent(url.substring(1, url.indexOf("/", 1)));
}

function defaultFile(url) {
  return decodeURIComponent(url.substring(url.indexOf("/", 1) + 1));
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
