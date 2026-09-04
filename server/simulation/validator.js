/**
 * IP and Topology Validation Utilities for NetCollaborate
 */

function ipToInt(ip) {
  if (!ip || typeof ip !== 'string') return 0;
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function intToIp(int) {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255
  ].join('.');
}

function isValidIPv4(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  
  for (let i = 0; i < 4; i++) {
    const part = parts[i];
    if (!/^\d+$/.test(part)) return false;
    const num = parseInt(part, 10);
    if (num < 0 || num > 255) return false;
    // Reject leading zeroes like 01 or 001, except '0'
    if (part.length > 1 && part.startsWith('0')) return false;
  }
  return true;
}

function isValidSubnetMask(mask) {
  if (!isValidIPv4(mask)) return false;
  const intMask = ipToInt(mask);
  // A valid subnet mask in binary consists of a sequence of 1s followed by a sequence of 0s
  const inverted = (~intMask) >>> 0;
  // If inverted + 1 is a power of 2, then mask has all 1s followed by 0s
  return ((inverted + 1) & inverted) === 0;
}

function maskToCIDR(mask) {
  if (!isValidSubnetMask(mask)) return 24;
  const intMask = ipToInt(mask);
  let count = 0;
  for (let i = 31; i >= 0; i--) {
    if ((intMask >>> i) & 1) count++;
    else break;
  }
  return count;
}

function cidrToMask(cidr) {
  const num = parseInt(cidr, 10);
  if (isNaN(num) || num < 0 || num > 32) return '255.255.255.0';
  const maskInt = num === 0 ? 0 : (~0 << (32 - num)) >>> 0;
  return intToIp(maskInt);
}

function getNetworkAddress(ip, mask) {
  if (!isValidIPv4(ip) || !isValidSubnetMask(mask)) return null;
  const netInt = (ipToInt(ip) & ipToInt(mask)) >>> 0;
  return intToIp(netInt);
}

function getBroadcastAddress(ip, mask) {
  if (!isValidIPv4(ip) || !isValidSubnetMask(mask)) return null;
  const netInt = (ipToInt(ip) & ipToInt(mask)) >>> 0;
  const invMask = (~ipToInt(mask)) >>> 0;
  return intToIp((netInt | invMask) >>> 0);
}

function areInSameSubnet(ip1, ip2, mask) {
  const net1 = getNetworkAddress(ip1, mask);
  const net2 = getNetworkAddress(ip2, mask);
  return net1 && net2 && net1 === net2;
}

/**
 * Validates the entire network topology and configurations
 * Returns structured errors, warnings, valid checks, and health score
 */
function validateTopology(nodes = [], edges = []) {
  const errors = [];
  const warnings = [];
  let validChecks = 0;

  if (!nodes || nodes.length === 0) {
    return {
      errors: [],
      warnings: [{ id: 'empty-network', title: 'Empty Network', message: 'No devices have been added to the canvas yet.', suggestion: 'Drag devices from the left sidebar onto the canvas.' }],
      validCount: 0,
      healthScore: 100,
      suggestions: []
    };
  }

  // 1. Check for disconnected / isolated devices
  const connectedNodeIds = new Set();
  edges.forEach(edge => {
    if (edge.source) connectedNodeIds.add(edge.source);
    if (edge.target) connectedNodeIds.add(edge.target);
  });

  nodes.forEach(node => {
    const dName = node.data?.name || node.id;
    if (!connectedNodeIds.has(node.id)) {
      warnings.push({
        id: `disconnected-${node.id}`,
        type: 'disconnected',
        deviceId: node.id,
        deviceName: dName,
        title: `Isolated Device: ${dName}`,
        message: `${dName} is not connected to any other network device.`,
        suggestedFix: `Connect ${dName} to a Switch or Router using an Ethernet cable.`,
        quickFixAction: null
      });
    } else {
      validChecks++;
    }
  });

  // 2. Collect all configured IP addresses across PCs, Servers, and Router Interfaces
  const ipMap = new Map(); // ip -> array of { deviceId, deviceName, interfaceName }

  nodes.forEach(node => {
    const dName = node.data?.name || node.id;
    const dType = node.type || node.data?.type || 'pc';

    if (['pc', 'laptop', 'server', 'printer'].includes(dType.toLowerCase())) {
      const ip = node.data?.ip;
      const mask = node.data?.subnetMask || '255.255.255.0';
      const gateway = node.data?.gateway;

      if (!ip) {
        warnings.push({
          id: `no-ip-${node.id}`,
          type: 'missing_ip',
          deviceId: node.id,
          deviceName: dName,
          title: `Unconfigured IP: ${dName}`,
          message: `${dName} does not have an IP address configured.`,
          suggestedFix: `Assign a static IPv4 address (e.g., 192.168.1.10) in the configuration panel.`,
          quickFixAction: { type: 'SET_IP', deviceId: node.id, defaultIp: '192.168.1.10', defaultMask: '255.255.255.0' }
        });
      } else if (!isValidIPv4(ip)) {
        errors.push({
          id: `invalid-ip-${node.id}`,
          type: 'invalid_ip',
          deviceId: node.id,
          deviceName: dName,
          title: `Invalid IP Address: ${dName}`,
          message: `${dName} has an invalid IPv4 address "${ip}".`,
          suggestedFix: `Enter a valid IPv4 address in decimal dot format (e.g., 192.168.1.10).`,
          quickFixAction: { type: 'SET_IP', deviceId: node.id, defaultIp: '192.168.1.10', defaultMask: '255.255.255.0' }
        });
      } else {
        validChecks++;
        if (!ipMap.has(ip)) ipMap.set(ip, []);
        ipMap.get(ip).push({ deviceId: node.id, deviceName: dName, interfaceName: 'Primary' });

        // Check subnet mask
        if (!isValidSubnetMask(mask)) {
          errors.push({
            id: `invalid-mask-${node.id}`,
            type: 'invalid_mask',
            deviceId: node.id,
            deviceName: dName,
            title: `Invalid Subnet Mask: ${dName}`,
            message: `${mask} is not a valid subnet mask for ${dName}.`,
            suggestedFix: `Use a valid subnet mask such as 255.255.255.0 (/24).`,
            quickFixAction: { type: 'SET_MASK', deviceId: node.id, defaultMask: '255.255.255.0' }
          });
        } else {
          validChecks++;

          // Check if IP is network or broadcast address
          const netAddr = getNetworkAddress(ip, mask);
          const bcastAddr = getBroadcastAddress(ip, mask);
          if (ip === netAddr) {
            errors.push({
              id: `net-addr-assigned-${node.id}`,
              type: 'network_ip_assigned',
              deviceId: node.id,
              deviceName: dName,
              title: `Network ID Used as Host IP: ${dName}`,
              message: `${ip} is the Network Identifier for subnet ${netAddr}/${maskToCIDR(mask)} and cannot be assigned to a host.`,
              suggestedFix: `Change host address to a usable host IP in the range.`
            });
          } else if (ip === bcastAddr) {
            errors.push({
              id: `bcast-addr-assigned-${node.id}`,
              type: 'broadcast_ip_assigned',
              deviceId: node.id,
              deviceName: dName,
              title: `Broadcast Address Used: ${dName}`,
              message: `${ip} is the Broadcast Address for subnet ${netAddr}/${maskToCIDR(mask)}.`,
              suggestedFix: `Change host address to a usable host IP.`
            });
          }

          // Check Gateway configuration if specified
          if (gateway) {
            if (!isValidIPv4(gateway)) {
              errors.push({
                id: `invalid-gateway-${node.id}`,
                type: 'invalid_gateway',
                deviceId: node.id,
                deviceName: dName,
                title: `Invalid Gateway Address: ${dName}`,
                message: `Gateway "${gateway}" is not a valid IPv4 address.`,
                suggestedFix: `Configure a valid gateway IP matching the local router interface.`
              });
            } else if (!areInSameSubnet(ip, gateway, mask)) {
              errors.push({
                id: `wrong-gateway-subnet-${node.id}`,
                type: 'gateway_subnet_mismatch',
                deviceId: node.id,
                deviceName: dName,
                title: `Gateway Subnet Mismatch: ${dName}`,
                message: `${dName} (${ip}) and Default Gateway (${gateway}) are on different subnets (Mask: ${mask}).`,
                suggestedFix: `The Default Gateway must reside on the same local subnet (${netAddr}/${maskToCIDR(mask)}).`,
                quickFixAction: { type: 'ALIGN_GATEWAY_SUBNET', deviceId: node.id, gateway: `${netAddr.substring(0, netAddr.lastIndexOf('.'))}.1` }
              });
            } else {
              validChecks++;
            }
          }
        }
      }
    } else if (dType.toLowerCase() === 'router') {
      // Validate router interfaces
      const interfaces = node.data?.interfaces || [];
      if (interfaces.length === 0) {
        warnings.push({
          id: `router-no-interfaces-${node.id}`,
          type: 'router_unconfigured',
          deviceId: node.id,
          deviceName: dName,
          title: `Unconfigured Router: ${dName}`,
          message: `${dName} has no network interfaces configured.`,
          suggestedFix: `Configure interfaces (e.g., G0/0, G0/1) with IP addresses.`
        });
      } else {
        interfaces.forEach(iface => {
          if (iface.ip) {
            if (!isValidIPv4(iface.ip)) {
              errors.push({
                id: `invalid-router-ip-${node.id}-${iface.name}`,
                type: 'invalid_ip',
                deviceId: node.id,
                deviceName: `${dName} (${iface.name})`,
                title: `Invalid IP on ${dName} ${iface.name}`,
                message: `Interface ${iface.name} has invalid IP ${iface.ip}.`,
                suggestedFix: `Set a valid IPv4 address on interface ${iface.name}.`
              });
            } else {
              validChecks++;
              if (!ipMap.has(iface.ip)) ipMap.set(iface.ip, []);
              ipMap.get(iface.ip).push({ deviceId: node.id, deviceName: dName, interfaceName: iface.name });
            }
          }
        });
      }
    }
  });

  // 3. Detect duplicate IP addresses
  ipMap.forEach((occurrences, ip) => {
    if (occurrences.length > 1) {
      const names = occurrences.map(o => `${o.deviceName} (${o.interfaceName})`).join(' and ');
      errors.push({
        id: `duplicate-ip-${ip}`,
        type: 'duplicate_ip',
        title: `Duplicate IP Address: ${ip}`,
        message: `${ip} is assigned to multiple devices: ${names}.`,
        suggestedFix: `Assign a unique IP address to avoid IP address conflict on the local network.`,
        devices: occurrences
      });
    } else {
      validChecks++;
    }
  });

  // 4. Calculate Health Score (0 - 100%)
  // Base 100, deduct 15 for each error, 5 for each warning, capped at 0-100
  let calculatedHealth = 100 - (errors.length * 15) - (warnings.length * 5);
  if (calculatedHealth < 0) calculatedHealth = 0;
  if (calculatedHealth > 100) calculatedHealth = 100;
  if (nodes.length > 0 && errors.length === 0 && warnings.length === 0) {
    calculatedHealth = 100;
  }

  return {
    errors,
    warnings,
    validCount: validChecks,
    healthScore: calculatedHealth,
    summary: {
      errorCount: errors.length,
      warningCount: warnings.length,
      validCount: validChecks,
      healthRating: calculatedHealth >= 90 ? 'Excellent' : calculatedHealth >= 75 ? 'Good' : calculatedHealth >= 50 ? 'Needs Attention' : 'Critical'
    }
  };
}

module.exports = {
  isValidIPv4,
  isValidSubnetMask,
  maskToCIDR,
  cidrToMask,
  getNetworkAddress,
  getBroadcastAddress,
  areInSameSubnet,
  ipToInt,
  intToIp,
  validateTopology
};
