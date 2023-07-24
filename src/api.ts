import fetch, {Request} from 'node-fetch';

type CloudflareApiAuth = {
  email: string;
  token: string;
}

type CloudflareApiResponse<T, I=undefined> = {
  errors: string[];
  messages: string[];
  result: T;
  result_info?: I;
  success: boolean;
}

export type CloudflareApiSplitTunnelEntry = {
  address?: string;
  description?: string;
  host?: string;
}

async function baseApiRequest<T=any,I=undefined>(endpoint: string, method: string, auth: CloudflareApiAuth, body?: string): Promise<CloudflareApiResponse<T,I>>{
  if(endpoint.startsWith('/')) endpoint.slice(1);
  const req = new Request(`https://api.cloudflare.com/client/v4/${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Email": auth.email,
      "X-Auth-Key": auth.token,
    },
    method,
    body: body ?? undefined
  })
  const resp = await fetch(req);
  const json: any = await resp.json();
  if(!json.success) throw new Error(`Error in ${req.url}: \n${json.errors}`);
  return json;
}


type CloudflareApiListDevicePolicies = {
  name: string;
  default: boolean;
  enabled: boolean;
  gateway_unique_id: string;
  policy_id: string;
  exclude: CloudflareApiSplitTunnelEntry[];
  include: CloudflareApiSplitTunnelEntry[];
  // dont care abt the rest
}

type CloudflareApiListDevicePoliciesInfo = {
  count: number;
  page: number;
  per_page: number;
  total_count: number;
}


export async function getDevicePolicies(id: string, auth: CloudflareApiAuth): Promise<CloudflareApiListDevicePolicies[]> {
  const res = await baseApiRequest<CloudflareApiListDevicePolicies[], CloudflareApiListDevicePoliciesInfo>(`accounts/${id}/devices/policies`, 'GET', auth);
  if(res.result_info && res.result_info.total_count > res.result_info.count) {
    // TODO: pull paginated
  }
  return res.result;
}

export async function putDeviceSplitTunnelExcludes(id: string, uuid: string | null, auth: CloudflareApiAuth, entries: CloudflareApiSplitTunnelEntry[]): Promise<CloudflareApiResponse<any>> {
  const res = await baseApiRequest(`accounts/${id}/devices/policy${uuid ? `/${uuid}`: ''}/exclude`, 'PUT', auth, JSON.stringify(entries));
  return res;
}
