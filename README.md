# Git Host

Serve static files backed by Git.

## Installation

After running `npm install`, you'll need to fix gitteh by running the following command:

    mv node_modules/gitteh/build/Release node_modules/gitteh/build/default

Next, you'll want to create a `repository` folder and run `git init` inside it. This is where you'll push to serve static files.
