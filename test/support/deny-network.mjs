import net from "node:net";
import dgram from "node:dgram";
import dns from "node:dns";
import { syncBuiltinESMExports } from "node:module";

const deny = () => { throw new Error("Network access is disabled during offline validation"); };
net.Socket.prototype.connect = deny;
dgram.Socket.prototype.send = deny;
dns.lookup = deny;
dns.resolve = deny;
dns.promises.lookup = deny;
dns.promises.resolve = deny;
globalThis.fetch = deny;
syncBuiltinESMExports();
