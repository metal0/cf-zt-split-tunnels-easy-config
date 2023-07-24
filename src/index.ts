import * as dotenv from 'dotenv';
import { getDevicePolicies, putDeviceSplitTunnelExcludes } from './api.js';
import { mergePolicyEntries, rangeCalculation } from './cidr.js';
import { default_excluded_routes } from './const/routes.js';
dotenv.config();

const {CF_API_TOKEN: token, CF_API_EMAIL: email, CF_ACCOUNT_ID:id, EXEMPTED_ROUTES: exempted_routes, FILTER: name_filter} = process.env;



async function main(): Promise<void> {
  if(!token || !email || !exempted_routes || !id) {
    console.error(`Please set your env variables correctly!`);
    process.exit();
  }
  const policies = await getDevicePolicies(id, {email, token});
  const exempted = exempted_routes.split(',');
  const {new_routes, to_remove} = rangeCalculation(exempted, default_excluded_routes);

  // Update our policies
  for(const [_,entry] of policies.entries()) {
    if(name_filter && name_filter.length >= 2 && (entry.name?.toLowerCase() !== name_filter.toLowerCase() && name_filter.toLowerCase() !== 'default')) continue;
    if(name_filter?.toLowerCase() === 'default' && !entry.default) continue;
    if(!entry.exclude?.length || !entry.enabled) continue;
    // const def = entry.exclude.filter(e => e.address).map(e => e.address!);

    const merged_entries = mergePolicyEntries(entry.exclude, new_routes, to_remove);
    const res = await putDeviceSplitTunnelExcludes(id, entry.default ? null : entry.policy_id, {email, token}, merged_entries);
    if(!res.success) throw new Error(`Error while updating policy [${entry.name}]: \n${JSON.stringify(res.errors, null, 2)}`);
    console.info(`Updated policy [${entry.name ?? 'Default'}] successfully!`);
  }

}
main()
