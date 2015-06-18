# semantic-create-module
[![NPM](https://nodei.co/npm/semantic-create-module.png)](https://nodei.co/npm/semantic-create-module/)

Helper tool for the usual steps to create a module:

## Usage
```
semantic-create-module <package>
```

Does the following work-flow:
```sh
mkdir <package>
cd <package>
# create <githubrepo> for <package>
git init
git remote add origin <githubrepo>
echo <readme> > readme.md
echo node_modules > .gitignore
npm init
npm install --save-dev semantic-release
./node_modules/.bin/semantic-release setup
add .travis.yml
logs next steps for <package>
git add --all
git commit -m "initial commit"
git push origin master
# set github repo description to package.json description
```

# readme.md
```md
# <package>
[![NPM](https://nodei.co/npm/<package>.png)](https://nodei.co/npm/<package>/)

```

# .travis.yml
```yml
language: node_js
node_js:
- iojs-v1
sudo: false
cache:
  directories:
  - node_modules
notifications:
  email: false
before_deploy:
- npm config set spin false --global
env:
  global: GH_TOKEN=<github-access-token-with-access-to-your-repo>
deploy:
  provider: npm
  email: <your-npm-mail@example.com>
  skip_cleanup: true
  api_key: <npm-api-key>
  on:
    branch: master
    repo: <user>/<repo>
```
