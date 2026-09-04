/**
 * Network mathematical calculations and IP helpers for NetCollaborate Client
 */

export function isValidIPv4(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  
  for (let i = 0; i < 4; i++) {
    const part = parts[i];
    if (!/^\d+$/.test(part)) return false;
    const num = parseInt(part, 10);
    if (num < 0 || num > 255) return false;
    if (part.length > 1 && part.startsWith('0')) return false;
  }
  return true;
}

export function ipToInt(ip) {
  if (!ip || typeof ip !== 'string') return 0;
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

export function intToIp(int) {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255
  ].join('.');
}

export function isValidSubnetMask(mask) {
  if (!isValidIPv4(mask)) return false;
  const intMask = ipToInt(mask);
  const inverted = (~intMask) >>> 0;
  return ((inverted + 1) & inverted) === 0;
}

export function maskToCIDR(mask) {
  if (!isValidSubnetMask(mask)) return 24;
  const intMask = ipToInt(mask);
  let count = 0;
  for (let i = 31; i >= 0; i--) {
    if ((intMask >>> i) & 1) count++;
    else break;
  }
  return count;
}

export function cidrToMask(cidr) {
  const num = parseInt(cidr, 10);
  if (isNaN(num) || num < 0 || num > 32) return '255.255.255.0';
  const maskInt = num === 0 ? 0 : (~0 << (32 - num)) >>> 0;
  return intToIp(maskInt);
}

export function getNetworkAddress(ip, mask) {
  if (!isValidIPv4(ip) || !isValidSubnetMask(mask)) return '';
  const netInt = (ipToInt(ip) & ipToInt(mask)) >>> 0;
  return intToIp(netInt);
}

export function getBroadcastAddress(ip, mask) {
  if (!isValidIPv4(ip) || !isValidSubnetMask(mask)) return '';
  const netInt = (ipToInt(ip) & ipToInt(mask)) >>> 0;
  const invMask = (~ipToInt(mask)) >>> 0;
  return intToIp((netInt | invMask) >>> 0);
}

export function areInSameSubnet(ip1, ip2, mask) {
  const net1 = getNetworkAddress(ip1, mask);
  const net2 = getNetworkAddress(ip2, mask);
  return Boolean(net1 && net2 && net1 === net2);
}

export function generateMAC() {
  const hexDigits = "0123456789ABCDEF";
  let mac = "";
  for (let i = 0; i < 6; i++) {
    mac += hexDigits.charAt(Math.floor(Math.random() * 16));
    mac += hexDigits.charAt(Math.floor(Math.random() * 16));
    if (i !== 5) mac += ":";
  }
  return mac;
}
