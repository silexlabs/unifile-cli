#!/usr/bin/env node

'use strict';

const chalk = require('chalk');
const vorpal = require('vorpal')();
const Unifile = require('unifile');
const Https = require('https');
const Util = require('util');

const unifile = new Unifile();
const GitHubConnector = require('unifile/lib/unifile-github');
unifile.use(new GitHubConnector());

// Global vars
const GH_NOTE = 'Unifile CLI client';

// Set logging
vorpal.use(require('vorpal-log'));
const logger = vorpal.logger;
if(process.env.DEBUG) logger.setFilter(0); // Will show debug info

// Set localStorage
vorpal.localStorage('Unifile');

// Set prompt
vorpal.delimiter('unifile$').show();

// Set history
vorpal.history('Unifile');

// Init pwd
vorpal.localStorage.setItem('pwd', '');

vorpal.command('mount <service>', 'Mount a remote storage')
  .option('-u, --user <user>', 'User for this service')
  .action(function(args, callback){
    //unifile.connect();
    //this.log('service', args);
    var prompt = [{
          type: 'password',
          name: 'password',
          message: 'Password: '
        }];
    if(!args.options.user) {
      prompt.unshift({
          type: 'input',
          name: 'username',
          message: 'Username: '
        });
    }
    this.prompt(prompt)
    .then(function(answers){
      let username = answers.username || args.options.user;
      logger.debug('auth: ' + username + ':' + Util.inspect(answers));
      unifile.setBasicAuth(args.service, username, answers.password)
      .then(res => logger.confirm(`Logged in ${args.service} with ${res}`))
      .catch(err => logger.error(`Cannot log into ${args.service}: ${err}`))
      .finally( () => callback());
    })
    .catch(function(e){
      logger.error('Unknown error: ' + e);
      callback();
    });
  });

  vorpal.command('cd <path>', 'Change path')
    .action(function(args, callback){
      // TODO implements `..` and check existence (for multilevel path too)
      var pwd = vorpal.localStorage.getItem('pwd');
      var newPwd = (pwd !== '' ? pwd + '/' : '') + args.path;
      logger.debug('new path: ' + newPwd);
      vorpal.localStorage.setItem('pwd', newPwd);
      vorpal.delimiter('unifile$' + newPwd);
      callback();
    });

  vorpal.command('ls [path]', 'List files')
    .option('-l, --list', 'Use a long listing format')
    .action(function(args, callback){
      var path = vorpal.localStorage.getItem('pwd') + (args.path || '');
      logger.debug('ls path: ' + path);
      var splitPath = path.split('/');
      unifile.readdir(splitPath.shift(), splitPath.join('/'))
      .then(res => {
        if(args.options.list){
          res.forEach(r => {
            var name = r.is_dir ? chalk.blue(r.name) : r.name;
            logger.printMsg(r.bytes + '\t' + name + '\t' + r.modified);
          });
        }
        else logger.printMsg(res.map(r => r.name).join(' '));
      })
      .catch(err => logger.error(err))
      .finally( () => callback());
    });

  /*function getOrCreateAuthorization(options){
    // clone options
    let getOpts = JSON.parse(JSON.stringify(options));
    getOpts.method = 'GET';

    request(getOpts, null, function(data){
      //logger.debug('Getting authorizations. ' + Util.inspect(data) );
      let unifileAuth = data.filter((auth) => auth.note === GH_NOTE);
      logger.debug(unifileAuth);
      if(unifileAuth.length === 1){
        vorpal.localStorage.setItem('token', unifileAuth[0].token);
        logger.confirm('Authorization granted with token ' + unifileAuth[0].token);
      }
      else{
        request(options, {
          scopes: ["public_repo"],
          note: GH_NOTE
        }, function(data){
          if(!data) return;

          logger.debug(data);
          if('token' in data){
            vorpal.localStorage.setItem('token', data.token);
            return logger.confirm('Authorization granted with token ' + token);      
          }
          switch(data.message.toLowerCase()){
            case 'bad credentials':
              logger.error('Wrong credentials for ' + args.service);
              break;
            case 'validation failed':
              logger.error('Invalid request: ' + Util.inspect(data.errors));
              break;
            default:
              logger.error('Unable to process answer: ' + Util.inspect(data));
          }
        });
      }
    });
  }

  function request(options, postData, callback){
    let req = Https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try{
          callback(JSON.parse(data));
        }
        catch(e){
          logger.error(`Cannot parse ${args.service} response: ${e}\n ${data}`);
          callback();
        }
      });
    });

    req.on('error', function(e){
      logger.error(`Error while contacting ${args.service}: ${e}`);
    });

    if(postData){
      req.write(JSON.stringify(postData));
    }

    req.end();
  }*/
