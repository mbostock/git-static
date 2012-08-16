# Git Host

Serve static files backed by Git.

## Installation

After running `npm install`, you'll need to fix gitteh by running the following command:

```bash
mv node_modules/gitteh/build/Release node_modules/gitteh/build/default
```

Next, you'll want to create a Git repository to hold the static files:

```bash
mkdir repository
cd repository
git init
echo 'Hello, world!' > test.html
git add .
git commit -m 'Initial commit.'
cd ..
```

Now you can launch the server!

```bash
node index
```

Go to <http://localhost:3000/HEAD/test.html> to view the file you created. You can replace `HEAD` with a specific commit version. In the future, git-static will support revision parsing, so you can use short names and aliases for commits such as "0ad4156" or "HEAD~1".
