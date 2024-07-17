# Cloudflare ZeroTrust Gateway Split Tunnel Configuration Tool
(that's a long description lol)

## What it does

This tool simply facilitates configuration of Split Tunnels on exclude mode for the Cloudflare ZeroTrust Gateway WARP VPN client.
Essentially, it turns "exclude" mode into "include" mode, but while combining the benefits of both modes.

## Why not just use cloudflare's native include mode?

The native include mode works fine, however it excludes **everything** by default, including the entire public IP space (which is not obvious at first).
This means that, unless you manually maintain the CIDRs of the entire public IP space, WARP won't be used at all other than for VPN purposes.
Not only are CIDR blocks of the public IP space harder to find and maintain than private IP space, but this also makes the "Domain" selector virtually useless (if you were to add the entire public IP space).
In the case that you want to exclude a specific domain/IP from tunneling, you run into the same issue.

## Why not just use some weird obscure private IP space that doesn't obstruct anything else?

For my personal use-case, where I selfhost a lot of resources on local devices, it makes it significantly easier to screw up my local network access if I just split tunnel large CIDR blocks such as `192.168.0.0/16`.
While this is normally viable (and especially for folks with proper vnet setups and a proper private ip range for remote resources which don't overlap with other standard residential network IP scapes), I'd rather have only the very specific CIDRs I actually need tunneled.

And also, split tunneling such large CIDRs won't work at all because WARP ignores split tunnel route CIDRs entirely as long as they just so happen to include the gateway IP of the device's ethernet adapter (behavior which is undocumented to my knowledge), so i.e. if your gateway is `192.168.0.1`, the entire block of `192.168.0.0/16` won't be tunneled through warp even if configured as a split tunnel route.

For this reason, to reduce the amount of these "collisions" between all sorts of network configurations, I'd rather have small CIDR blocks for the actual resources I need tunneled.

## How does this work?

You simply input the CIDR blocks of IPs that you want to tunnel through WARP into the app, and it will automatically split the default private IP space IPs assigned on the split tunnel configurations into several smaller blocks, which only exclude the blocks you specified.
### Example
```EXEMPTED_ROUTES=192.168.0.100/32```

This will generate:
```
192.168.0.0/26
192.168.0.64/27
192.168.0.96/30
192.168.0.101/32
192.168.0.102/31
192.168.0.104/29
192.168.0.112/28
192.168.0.128/25
192.168.1.0/24
192.168.2.0/23
192.168.4.0/22
192.168.8.0/21
192.168.16.0/20
192.168.32.0/19
192.168.64.0/18
192.168.128.0/17
```
(and will also delete the default `192.168.0.0/16` block provided by Cloudflare)



## Okay cool, but why bother, you can easily do this manually.
Because Cloudflare doesn't provide a super easy way to replicate split tunnel configurations across different device profiles via their dashboard, and I personally need at least 5-6 profiles for my use-case, each of them with different routes available.

Doing this work "by hand" proved far more time-consuming than writing this simple script to do it for me.




# How to use it?

```bash
git clone https://github.com/metal0/cf-zt-split-tunnels-easy-config.git

# Copy .env.example to .env and fill out the values

# CF_API_TOKEN - Your cloudflare account token. 
# https://dash.cloudflare.com/profile/api-tokens
# > this script will NOT accept Bearer Tokens currently. (I'm lazy, sorry)

# CF_API_EMAIL - Your cloudflare account email

# CF_ACCOUNT_ID

# EXEMPTED_ROUTES - The routes that you want to allow tunneling for.
# > Please keep in mind to write them down in a ascending order.

# FILTER - Name filter for Device Profiles, i.e. if you only want to apply these to a specific profile, just put the profile's name here.
yarn install

yarn build

yarn start
```
