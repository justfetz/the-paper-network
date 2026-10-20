#!/usr/bin/env bash
# After the plants workflow commits data/plants_frs.csv (+ data/cbp_322211_county.csv):
# aggregate to the demand nodes, measure the proxy error, re-weight demand, re-solve every scenario, rebuild the site.
set -euo pipefail
cd "$(dirname "$0")/.."
git pull -q --rebase origin main
ls -la data/plants_frs.csv data/cbp_322211_county.csv 2>/dev/null || true
python3 model/plants_layer.py data/plants_frs.csv data/cbp_322211_county.csv data/paper_network.json data/plants_by_node.json
cp data/paper_network.json data/paper_network_proxy.json          # keep the proxy-weighted run for the before/after
( cd model && python3 export_json.py ../data/mills_final.csv ../data/paper_network.json && python3 corrugators.py ../data/paper_network.json ../data/corrugators.json )
( cd site && python3 build_site.py ../data/paper_network.json ../data/basemap.json "${1:-}" )
echo "integration complete $(date -u +%H:%M:%S)"
