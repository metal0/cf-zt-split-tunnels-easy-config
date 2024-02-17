import { default_excluded_routes } from './const/routes.js';
import IPCIDR from 'ip-cidr';
import { IpAddress, IpRange } from 'cidr-calc';
import { CloudflareApiSplitTunnelEntry } from './api.js';


function atoi(addr: string) { // https://stackoverflow.com/questions/31347696/whats-the-most-performant-way-to-do-simple-ip-address-comparisons
  const parts = addr.split('.').map(function(str) {
    return parseInt(str);
  });

  return (parts[0] ? parts[0] << 24 : 0) +
         (parts[1] ? parts[1] << 16 : 0) +
         (parts[2] ? parts[2] << 8  : 0) +
          parts[3];
};

function checkIpaddrInRange(ipaddr: string, start: string, end: string) {
  const num = atoi(ipaddr);
  return (num >= atoi(start)) && (num <= atoi(end));
}

function overlapsDefaultIpRange(address: string): boolean {
  if(!IPCIDR.isValidCIDR(address)) return false;
  const cidr_limits = new IPCIDR(address).toObject();
  const overlap = default_excluded_routes.filter(r => {
    const rlm = new IPCIDR(r).toObject();
    return checkIpaddrInRange(cidr_limits.start, rlm.start, rlm.end) || checkIpaddrInRange(cidr_limits.end, rlm.start, rlm.end)
  });
  return overlap.length > 0;
}

export function rangeCalculation(addresses: string[], existing_subnets: string[] = []): {new_routes: string[], to_remove: string[]} {
  addresses = addresses.filter(ad => IPCIDR.isValidCIDR(ad));
  const overlaps: {[key: string]: string[]} = {};
  addresses.forEach(address => {
    const cidr_limits = new IPCIDR(address).toObject();
    existing_subnets.forEach(r => {
      const rlm = new IPCIDR(r).toObject();
      if(checkIpaddrInRange(cidr_limits.start, rlm.start, rlm.end) || checkIpaddrInRange(cidr_limits.end, rlm.start, rlm.end)) {
        if(!overlaps[r]) overlaps[r] = [];
        overlaps[r].push(address);
      }
    });
  });

  const new_routes: string[] = [];
  for(const [k,v] of Object.entries(overlaps)) {
    const global_lm = new IPCIDR(k);
    let prev = k;
    const routes: string[] = [];
    v.forEach((address) => {
      const prev_lm = new IPCIDR(prev);
      const curr_lm = new IPCIDR(address);
      const range = global_lm.toArray({from: prev_lm.start(), to: curr_lm.start()});
      if(prev !== k && range.length > 0 && range[0] === (new IPCIDR(prev).address.addressMinusSuffix)) range.splice(0, 1);
      // append the last one

      prev = address;
      // console.log(`[${address}] > (${range.length} entries) ${range.length > 0 ? range[0] : 'NONE'}[${prev_lm.start()}]-${range.length > 0 ? range.slice(-1)[0] : 'NONE'}[${curr_lm.start()}]`)
      if(range && range.length > 0) routes.push(...new IpRange(IpAddress.of(range[0]), IpAddress.of(range.slice(-1)[0])).toCidrs().map(e => e.toString()))
      if(v.findIndex(e => e === address)! === v.length-1) {
        const end_range = global_lm.toArray({from: curr_lm.end()});
        if(end_range.length > 0 && end_range[0] === (new IPCIDR(address).address.addressMinusSuffix)) end_range.splice(0, 1);
        if(end_range && end_range.length > 0) routes.push(...new IpRange(IpAddress.of(end_range[0]), IpAddress.of(end_range.slice(-1)[0])).toCidrs().map(e => e.toString()))
        }
    });
    new_routes.push(...routes);
  }
  return {to_remove: [...new Set(Object.keys(overlaps))], new_routes: [...new Set(new_routes)]};
}

export function mergePolicyEntries(current_data: CloudflareApiSplitTunnelEntry[], new_entries: string[], to_remove: string[]): CloudflareApiSplitTunnelEntry[] {
  const entries = current_data.filter(e => (e.host || e.description || (default_excluded_routes.includes(e.address!) && !to_remove.includes(e.address!)) || !overlapsDefaultIpRange(e.address!)));
  new_entries.forEach(e => {
    if(!entries.find(f => f.address === e)) entries.push({address: e});
  })
  // entries.push(...new_entries.map(e => {return {"address": e}}));
  // entries = entries.filter(e => !e.address || (!to_remove.includes(e.address)));
  return entries;
}
