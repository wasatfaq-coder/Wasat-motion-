// Opt-in for containers that block network-interface enumeration.
// Use with NODE_OPTIONS="--require=./scripts/remotion-loopback.cjs".
const os = require('node:os');
const original = os.networkInterfaces;
os.networkInterfaces = () => {
  try { return original(); }
  catch (error) {
    if (error.code !== 'ERR_SYSTEM_ERROR' || error.info?.syscall !== 'uv_interface_addresses') throw error;
    return {lo: [{address:'127.0.0.1', netmask:'255.0.0.0', family:'IPv4', mac:'00:00:00:00:00:00', internal:true, cidr:'127.0.0.1/8'}]};
  }
};
