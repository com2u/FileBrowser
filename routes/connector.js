var express = require('express');
const router = express.Router();
const Finder = require('fs-finder');
const utilities = require('../src/explorer');
const fs = require('fs-extra')
const path = require('path');
const async = require('async');
const sizeOf = require('image-size');

router.get('/minimal', (req, res, next) => {
  let rootpath =  path.join(__dirname, '/../public/files/');
  let resdata = {};
  if(req.query.cmd == "open" && req.query.target == "l1_Lw" || req.query.tree == 1) {
    resdata = require('../src/tree.json');
  } else if(req.query.cmd == "dim") {  
    let path = utilities.getTarget(req.query.target);  
    dimensions = sizeOf(rootpath + path);
    resdata.dim = dimensions.width + "x" + dimensions.height;
  } else if(req.query.cmd == "mkdir") {
    if(req.query.target == "t1_Lw") {            
       resdata = {added:[],hashes:{},changed:[]};
       let dirs = req.query.dirs;
       let hashes = [];
       dirs.forEach(dir => {
        hashes.push(utilities.setHash(dir.substring(1), false));
       });

       // add "Added" object
       for(let i = 0; i < hashes.length; i ++) {
        let add = { hash: "", isowner: false, mime: "directory", name: "", phash: "", read: 1, size: 0, ts: 0, url: null, volumeid: "t1_", write: 1};
        add.name = dirs[i].substring(1);
        add.ts = Date.now();
        for(let j = 0; j <= i; j ++) {
         add.hash += hashes[j];         
        }
        if(i == 0) {
          add.phash = "t1_Lw"
        } else {
          add.phash = resdata.added[i - 1].hash;
        }
        resdata.added.push(add);
       }       
       // add "Changed" object
       resdata.changed =[{"isowner":false,"ts":1548172470,"mime":"directory","read":1,"write":1,"size":0,"hash":"t1_Lw","name":"Trash","rootRev":"","options":{"path":"","url":"","tmbUrl":"/files/.trash/.tmb/","disabled":[],"separator":"\\","dispInlineRegex":"^(?:(?:video|audio)|image\/(?!.+\\+xml)|application\/(?:ogg|x-mpegURL|dash\\+xml)|(?:text\/plain|application\/pdf)$)","jpgQuality":100,"uiCmdMap":{"paste":"hidden","mkdir":"hidden","copy":"restore"},"syncChkAsTs":1,"syncMinMs":10000,"i18nFolderName":0,"tmbCrop":1,"substituteImg":true,"onetimeUrl":false,"csscls":"elfinder-navbar-root-trash"},"volumeid":"t1_","locked":1,"dirs":1,"url":null,"isroot":1,"phash":""}];

       // hashes
       resdata.added.forEach((add, key) => {
        resdata.hashes[dirs[key]] = add.hash;
      });
    }
  } else if(req.query.cmd == "paste"){
    let dst = utilities.getTarget(req.query.dst);
    let targets = req.query.targets;
    resdata = {"changed":[],"added":[],"removed":[]}
    targets.forEach((target, key) => {
      let filepath = utilities.getTarget(target);
      if(req.query.suffix == "~") {
        let filename = filepath.split('/');
        let destpath = rootpath + dst + "/" + filename[filename.length - 1];         
        if(!fs.existsSync(destpath)) {
          if(req.query.cut == "1") {          
            fs.moveSync(rootpath + filepath, destpath);
          } else {
            fs.copySync(rootpath + filepath, destpath);
          }
        }
        let add = { isowner: false, mime: "", ts: 0, read: 1, write: 1, size: 0, hash: "", name: "", phash: ""};
        add.name = filename[filename.length - 1];
        add.mime = utilities.getMime(filename);        
        const stats = fs.statSync(destpath);
        add.size = stats.size.toString();        
        add.hash = utilities.setHash(dst + "/" + filename[filename.length - 1], true)
        add.phash = req.query.dst;
        resdata.added.push(add);
        let change = { isowner: false, mime: "directory", ts: 0, read: 1, write: 1, size: 0, hash: "", name: "", phash: ""};
        change.hash = add.phash;
        change.phash = utilities.setHash(dst.substring(0, dst.indexOf(filename[filename.length - 1])), false);
        change.ts = Date.now();
        resdata.changed.push(change);             
      } else {
        if(fs.pathExistsSync(rootpath + filepath)) {
          fs.removeSync(rootpath + filepath);
          let add = {"isowner":false,"ts":0,"mime":"","read":1,"write":1,"size":0,"hash":"","name":"","phash":"","volumeid":"t1_","dirs":0,"url":null}
          let filename = filepath.split('/');   
          add.mime = utilities.getMime(filename);
          add.hash = target;
          add.phash = req.query.dst;
          add.ts = Date.now();
          resdata.added.push(add);
          let change = {"isowner":false,"ts":0,"mime":"directory","read":1,"write":1,"size":0,"hash":"","name":"","phash":"","volumeid":"t1_","dirs":0,"url":null};
          change.hash = add.phash;        
          filename = dst.split('/');
          change.phash = utilities.setHash(dst.substring(0, dst.indexOf(filename[filename.length - 1])), false);
          change.ts = Date.now();
          resdata.changed.push(change);        
        }          
      }      
    })
    if(Array.isArray(req.query.hashes)) {
      resdata.removed = resdata.removed.concat(req.query.hashes, req.query.targets);
    } else {
      resdata.removed = req.query.targets;
    }
  } else if(req.query.cmd == "open") {
    let path = utilities.getTarget(req.query.target);
    resdata = require('../src/directory.json');
    let directories = Finder.in(rootpath + path).findDirectories();
    let files = Finder.in(rootpath + path).findFiles();
    // cwd object crate
    let pathlist = path.split('/');
    resdata.cwd.name = path.split('/')[pathlist.length - 1];
    resdata.cwd.ts = Date.now();
    resdata.cwd.hash = req.query.target;
    resdata.cwd.phash = utilities.setHash(path.slice(0, path.indexOf(resdata.cwd.name) - 1), true);
    resdata.cwd.dirs = directories.length;

    // file object create
    resdata.files = [];
    files.forEach((_file, key) => {
      let file = { isowner: false, mime: "", ts: 0, read: 1, write: 1, size: 0, hash: "", name: "", phash: "", tmb : ""};
      let filename = _file.split('\\');      
      file.mime = utilities.getMime(filename);
      const stats = fs.statSync(_file);
      file.size = stats.size.toString();
      file.name = filename[filename.length - 1];
      _file = _file.replace(/\\/g, "/");      
      file.hash = utilities.setHash(_file.substring(_file.indexOf(path), _file.length), true);
      file.phash = req.query.target;
      file.ts = Date.now();
      let extension = filename[filename.length -1].split('.');   
      if(extension[extension.length - 1] == "bmp") {
        extension = ".png";
      } else {
        extension = "." + extension[extension.length - 1].toLocaleLowerCase();
      }   
      let tmbPath = file.hash + stats.mtime.getTime() + extension;
      if(fs.existsSync(rootpath + ".tmb/" + tmbPath)) {
        file.tmb = tmbPath;
      } else {
        file.tmb = 1;
      }    
      resdata.files.push(file);
    });

    directories.forEach(_file => {
      let filename = _file.split('\\');
      let file = { isowner: false, mime: "", ts: 0, read: 1, write: 1, size: 0, hash: "", name: "", phash: "", tmb : ""};
      file.name = filename[filename.length - 1];
      file.mime = "directory";
      file.size = 0;
      file.dirs = Finder.in(_file).findDirectories().length;
      _file = _file.replace(/\\/g, "/");      
      file.hash = utilities.setHash(_file.substring(_file.indexOf(path), _file.length), true);
      file.phash = req.query.target;
      file.ts = Date.now();
      resdata.files.push(file);
    });
  } else if(req.query.cmd == "parents") {
    let path = utilities.getTarget(req.query.target);
    let pathlist = path.split("/");
    let pPath = "";
    let trees = [{"isowner":false,"ts":1548079827,"mime":"directory","read":1,"write":1,"size":0,"hash":"l1_Lw","name":"files","rootRev":"","options":{"path":"","url":"/files/","tmbUrl":"/.tmb\/","disabled":["chmod"],"separator":"\\","copyOverwrite":1,"uploadOverwrite":1,"uploadMaxSize":2147483647,"uploadMaxConn":3,"uploadMime":{"firstOrder":"deny","allow":["image\/x-ms-bmp","image\/gif","image\/jpeg","image\/png","image\/x-icon","text\/plain"],"deny":["all"]},"dispInlineRegex":"^(?:(?:video|audio)|image\/(?!.+\\+xml)|application\/(?:ogg|x-mpegURL|dash\\+xml)|(?:text\/plain|application\/pdf)$)","jpgQuality":100,"archivers":{"create":["application\/zip"],"extract":["application\/zip"],"createext":{"application\/zip":"zip"}},"uiCmdMap":[],"syncChkAsTs":1,"syncMinMs":10000,"i18nFolderName":0,"tmbCrop":1,"substituteImg":true,"onetimeUrl":false,"trashHash":"t1_Lw","csscls":"elfinder-navbar-root-local"},"volumeid":"l1_","locked":1,"dirs":1,"isroot":1,"phash":""}];    
    pathlist.forEach(_path => {      
      let directories = Finder.in(rootpath + pPath).findDirectories();
      directories.forEach(_file =>{
        let tree = { isowner: false, mime: "", ts: 0, read: 1, write: 1, size: 0, hash: "", name: "", phash: "", tmb : ""};
        tree.hash = utilities.setHash(_file.substring(_file.indexOf(_path), _file.length), true);
        tree.phash = utilities.setHash(pPath);
        let filename = _file.split('\\');        
        tree.name = filename[filename.length - 1];
        tree.mime = "directory";
        tree.size = 0;
        tree.dirs = 1;
        tree.volumeid = "l1_";
        trees.push(tree);
      });
      pPath += _path;
    });
    resdata.tree = trees;
  }

  if(req.query.cmd == "tmb") {
    resdata = {images: {}};
    let i = 0;
    async.whilst(
      () => {
        return i < req.query.targets.length;
      },
      (callback) => {
        let target = req.query.targets[i];
        let path = utilities.getTarget(target);
        let filename = path.split('\\');
        let extension = filename[filename.length -1].split('.');
        let destination = "";
        if(extension.length == 2) {
          destination = rootpath + '.tmb/';
        }
        let stats = fs.statSync(rootpath + path);
        let basename = target + stats.mtime.getTime();
        utilities.thumbGenerator(rootpath + path, destination, basename, (err, result) => {
          i ++;
          if(err) {
            return callback();
          }
          if(extension[extension.length - 1] == "bmp") {
            extension = ".png";
          } else {
            extension = "." + extension[extension.length - 1].toLocaleLowerCase();
          }
          resdata.images[target] = basename + extension;
          callback();
        });
      },
      (err) => {
        res.send(resdata);
        fs.removeSync(rootpath + ".quarantine/");
      }
    )
  } else {
    res.send(resdata);
  }
  });

  module.exports = router;