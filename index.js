var fs = require('fs')
var path = require('path')
var request = require('request')
var exec = require('child_process').exec
var spawn = require('child_process').spawn
var series = require('run-series')
var parallel = require('run-parallel')
var yaml = require('js-yaml');
var base = 'https://api.github.com'
var registry = 'https://registry.npmjs.org'

module.exports = createModule

var readmeTemplate = '# <package>\n[![NPM](https://nodei.co/npm/<package>.png)](https://nodei.co/npm/<package>/)\n'
var travisTemplate = yaml.safeLoad(fs.readFileSync('./travisconfig.yml', 'utf8'))

function createModule(name, token, cb) {
  var headers = {"user-agent": "npm semantic-create-module"}
  var dir = path.join(process.cwd(), name)
  headers['Authorization'] = 'token ' + token
  var input = {
    name: name
  }
  
  var repo

  series([
    checkName,
    createGitHubrepo,
    createDir,
    gitInit,
    createReadme,
    createGitignore,
    npmInit,
    semanticInstall,
    semanticSetup,
    travisSetup,
    nextSteps,
    parallel.bind(null, [gitPush, changeDescription])
    ], function (err) {
      if(err) console.error('Error: ' + err.message)
      else console.log('Done.')
    })

  function checkName(fn) {
    request.head(registry + '/' + name, { headers: headers }, function (err, res) {
      if (err) return fn(err)
      if (res.statusCode === 200) return fn(new Error('"' + name + '" is already taken on npm.'))
      fn(null)
    })
  }

  function createGitHubrepo(cb) {
    console.log('Creating GitHub repo..')
    request.post(base + '/user/repos', {json: input, headers: headers}, function (err, res, repository) {
      if(err) return cb(err)
      repo = repository
      console.log('Created repo', repo.full_name)
      cb(null, repo)
    })
  }
  
  function createDir(cb) {
    console.log('Creating directory ' + dir)
    fs.mkdir(dir, cb)
  }

  function gitInit(cb) {
    console.log('Initialize git..')
    exec('git init && git remote add origin ' + repo.ssh_url, {cwd: dir}, function (err, stdo, stde) {
      process.stderr.write(stde)
      cb(err)
    })
  }

  function createReadme(cb) {
    console.log('Create readme.md...')
    fs.writeFile(path.join(dir, 'readme.md'), readmeTemplate.replace(/<package>/g, name), cb)
  }
  
  function createGitignore(cb) {
    console.log('Create .gitignore...')
    fs.writeFile(path.join(dir, '.gitignore'), 'node_modules\n', cb)
  }

  function npmInit(cb) {
    var npmInit = spawn('npm', ['init'], {cwd: dir, stdio: [process.stdin, 'pipe', 'pipe']})
    npmInit.stdout.pipe(process.stdout)
    npmInit.stderr.pipe(process.stderr)
    npmInit.on('close', function (code) {
      var err
      if(code > 0) err = new Error('Failed npm init')
        cb(err)
    })
  }

  function changeDescription (cb) {
    input.description = require(path.join(dir, 'package.json')).description
    var repoUrl = [base, 'repos', repo.full_name].join('/')
    request.patch(repoUrl, { json: input, headers: headers }, cb)
  }

  function semanticInstall (cb) {
    var npmInstall = spawn('npm', ['install', '--save-dev', 'semantic-release'], {cwd: dir, stdio: [process.stdin, 'pipe', 'pipe']})
    npmInstall.stdout.pipe(process.stdout)
    npmInstall.stderr.pipe(process.stderr)
    npmInstall.on('close', function (code) {
      var err
      if(code > 0) err = new Error('Failed npm install semantic-release')
        cb(err)
    });
  }

  function semanticSetup (cb) {
    var semanticSetup = spawn('./node_modules/.bin/semantic-release', ['setup'], {cwd: dir, stdio: [process.stdin, 'pipe', 'pipe']})
    semanticSetup.stdout.pipe(process.stdout)
    semanticSetup.stderr.pipe(process.stderr)
    semanticSetup.on('close', function (code) {
      var err
      if(code > 0) err = new Error('Failed semantic-release setup')
        cb(err)
    });
  }

  function travisSetup (cb) {
    console.log('Create .travis.yml')
    fs.writeFile(path.join(dir, '.travis.yml'), yaml.safeDump(travisTemplate), cb)
  }

  function nextSteps (cb) {
    console.log('If you have a more sophisticated build with multiple jobs you should have a look at\nhttps://github.com/dmakhno/travis_after_all\n\nGrant the token repo/public_repo scope (all others can be deselected)\n\nEncrypt your GH_TOKEN with this:\ntravis encrypt GH_TOKEN=<token> --add\nThe same for your npm details\ntravis encrypt $(echo -n "<username>:<password>" | base64) --add deploy.api_key')
    cb(null)
  }
  
  function gitPush(cb) {
    console.log('Commit and push to GitHub')
    var finishGit = [
      'git add --all',
      'git commit -m "Initial commit"',
      'git push origin master'
    ]
    exec(finishGit.join(' && '), {cwd: dir}, function (err, stdo, stde) {
      process.stderr.write(stde)
      cb(err)
    })
  }

}


