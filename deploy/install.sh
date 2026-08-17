#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: sudo ./deploy/install.sh [options]

Options:
  -d, --dir PATH        Project directory (default: /opt/16spaces)
  -n, --domain NAME     Nginx server_name (default: 16space.example.com)
  -p, --port PORT       App port (default: 8000)
  -u, --user USER       System user for the service (default: 16spaces)
  -e, --env FILE        Source .env file to copy into /etc/16spaces/16spaces.env
  --skip-env-copy       Do not copy an env file; assume /etc/16spaces/16spaces.env already exists
EOF
}

project_dir="/opt/16spaces"
server_name="16space.example.com"
port="8000"
app_user="16spaces"
env_source=""
skip_env_copy="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--dir)
      project_dir="$2"
      shift 2
      ;;
    -n|--domain)
      server_name="$2"
      shift 2
      ;;
    -p|--port)
      port="$2"
      shift 2
      ;;
    -u|--user)
      app_user="$2"
      shift 2
      ;;
    -e|--env)
      env_source="$2"
      shift 2
      ;;
    --skip-env-copy)
      skip_env_copy="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Run this script as root (for example with sudo)." >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
nginx_template="${script_dir}/nginx.example.conf"
service_template="${script_dir}/16spaces.service"

if [[ ! -d "$project_dir" ]]; then
  echo "Project directory not found: $project_dir" >&2
  exit 1
fi

if [[ ! -f "$nginx_template" || ! -f "$service_template" ]]; then
  echo "Missing deploy templates in $script_dir" >&2
  exit 1
fi

deno_bin=""
if command -v deno >/dev/null 2>&1; then
  deno_bin="$(command -v deno)"
elif [[ -x /usr/local/bin/deno ]]; then
  deno_bin="/usr/local/bin/deno"
elif [[ -x /usr/bin/deno ]]; then
  deno_bin="/usr/bin/deno"
elif [[ -x /root/.deno/bin/deno ]]; then
  deno_bin="/root/.deno/bin/deno"
else
  echo "Could not find a deno binary on this server. Install Deno or add it to PATH, then rerun." >&2
  exit 1
fi

if ! id -u "$app_user" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin --user-group "$app_user"
fi

env_dest="/etc/16spaces/16spaces.env"
install -d -m 0755 /etc/16spaces

if [[ "$skip_env_copy" == "false" ]]; then
  if [[ -z "$env_source" ]]; then
    if [[ -f "${project_dir}/.env" ]]; then
      env_source="${project_dir}/.env"
    else
      echo "No env source provided and ${project_dir}/.env not found." >&2
      exit 1
    fi
  fi

  if [[ ! -f "$env_source" ]]; then
    echo "Env source not found: $env_source" >&2
    exit 1
  fi

  install -m 0600 "$env_source" "$env_dest"
fi

tmp_nginx="$(mktemp)"
tmp_service="$(mktemp)"

sed \
  -e "s|__SERVER_NAME__|${server_name}|g" \
  -e "s|__PORT__|${port}|g" \
  -e "s|__APP_DIR__|${project_dir}|g" \
  "$nginx_template" > "$tmp_nginx"

sed \
  -e "s|__APP_USER__|${app_user}|g" \
  -e "s|__APP_DIR__|${project_dir}|g" \
  -e "s|__PORT__|${port}|g" \
  -e "s|__ENV_FILE__|${env_dest}|g" \
  -e "s|__DENO_BIN__|${deno_bin}|g" \
  "$service_template" > "$tmp_service"

install -d -m 0755 /etc/nginx/sites-available
install -d -m 0755 /etc/nginx/sites-enabled
install -m 0644 "$tmp_nginx" /etc/nginx/sites-available/16spaces.conf
ln -sf /etc/nginx/sites-available/16spaces.conf /etc/nginx/sites-enabled/16spaces.conf

install -m 0644 "$tmp_service" /etc/systemd/system/16spaces.service

rm -f "$tmp_nginx" "$tmp_service"

systemctl daemon-reload
systemctl enable 16spaces.service
systemctl restart 16spaces.service

if command -v nginx >/dev/null 2>&1; then
  nginx -t
  systemctl reload nginx
fi

echo "Installed nginx config: /etc/nginx/sites-available/16spaces.conf"
echo "Installed systemd unit: /etc/systemd/system/16spaces.service"
echo "Env file: ${env_dest}"