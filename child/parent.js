var socketTransport = require('architect-socket-transport');
var Agent = require('architect-agent').Agent;
var spawn = require('child_process').spawn;

module.exports = function setup(fsOptions) {
    var child = spawn(process.execPath, [require.resolve('./child.js'), JSON.stringify(fsOptions)]);

    var agent = new Agent({});
    var vfs;
    agent.attach(socketTransport(child.stdout, child.stdin), function (realVfs) {
        // Set the real vfs object
        vfs = realVfs;
        // Replace all properties on the returned one as well
        for (var key in vfs) {
            obj[key] = vfs[key];
        }
    });

    // Return fake endpoints in the initial return till we have the real ones.
    function wait(name) {
        return function (path, options, callback) {
            if (vfs) {
                // Forward to the real vfs in case the client got a reference
                // to this wrapper early.
                return vfs[name].apply(this, arguments);
            }
            var err = new Error("VFS not Ready yet " + child.pid);
            err.code = "ENOTREADY";
            callback(err);
        }
    }
    var obj = {
        readfile: wait("readfile"),
        mkfile: wait("mkfile"),
        rmfile: wait("rmfile"),
        readdir: wait("readdir"),
        mkdir: wait("mkdir"),
        rmdir: wait("rmdir"),
        rename: wait("rename"),
        copy: wait("copy"),
        symlink: wait("symlink")
    };
    return obj;

}