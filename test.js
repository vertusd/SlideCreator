

process.umask(077);

var Armadietto = require('armadietto'),
    store   = new Armadietto.FileTree({path: 'd://project//storage'}),

    server  = new Armadietto({
                store:  store,
                allow: {signup: true},
                http:   {host: '127.0.0.1', port: 80}
              });

server.boot();