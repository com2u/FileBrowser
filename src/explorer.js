var thumb = require('node-thumbnail').thumb;
const mime = require('mime-types');
const mimeTypes = require('./mime.json');
module.exports = {
    filter : (stat, path) => {
        {
            if(path.indexOf(file.hash) != -1) {
                return true;
            } else {
                return false;
            }
        }
    },
    relpathCE: (path) => {
        return (!encoding) ? _relpath(path) : convEncOut(_relpath(convEncIn(path)));
    },    
    setHash: (str, isVolume) => {
        let hash = Buffer.from(str).toString('base64').replace('==' , '').replace('=', '').replace(' ', '');
        if(hash == "") {
            hash = isVolume ? "l1_Lw" : "t1_Lw";
        } else {
            hash = (isVolume ? "l1_" : "t1_") + hash;
        }
        return hash;
    },
    getTarget: (str) => {        
        return new Buffer(str.substring(3, str.length), 'base64').toString('binary');
    },
    getMime: (filename) => {
        let mimetype = "directory"
        if(Array.isArray(filename)) {
            let extension = filename[filename.length -1].split('.');
            extension = extension[extension.length -1].toLowerCase();
            mimetype = mime.lookup(extension);
            if(!mimetype) {
                mimetype = mimeTypes[extension];
                if(!mimetype) {
                    mimetype = "application/octet-stream";
                }
            }
        }
        return mimetype;
    },
    thumbGenerator: (source, destination, basename, callback) => {
        thumb({
            source: source,        
            destination: destination,
            concurrency: 4,
            basename: basename,
            suffix: '',
            prefix: '',
            ignore: false,
            logger: message =>{}
        }).then((result) => {
            callback(null, result);
        }).catch((error) => {
            callback(true);
        });
    }
}