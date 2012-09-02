var fs = require("fs");

var express = require("express"),
    optimist = require("optimist"),
    gitstatic = require("../");

var argv = optimist.usage("Usage: $0")
    .options("h", {
      alias: "help",
      describe: "display this help text"
    })
    .options("repository", {
      default: ".git",
      describe: "path to bare git repository"
    })
    .options("port", {
      default: 3000,
      describe: "http port"
    })
    .check(function(argv) {
      if (argv.help) throw "";
      try { var stats = fs.statSync(argv.repository); } catch (e) { throw "Error: " + e.message; }
      if (!stats.isDirectory()) throw "Error: invalid --repository directory.";
    })
    .argv;

var server = express();

server.get(/^\/.*/, gitstatic.route()
    .repository(argv.repository));

server.listen(argv.port);
