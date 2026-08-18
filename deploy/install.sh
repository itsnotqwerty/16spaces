#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: sudo ./deploy/install.sh [options]

Options:
  -d, --dir PATH        Project directory (default: repo root, one level above deploy/)
  -n, --domain NAME     Nginx server_name (default: 16space.example.com)
  -p, --port PORT       App port (default: 8000)
  -u, --user USER       System user for the service (default: project owner)
  --cert FILE           TLS certificate chain path (default: /etc/letsencrypt/live/<domain>/fullchain.pem)
  --key FILE            TLS private key path (default: /etc/letsencrypt/live/<domain>/privkey.pem)
  -e, --env FILE        Source .env file to copy into /etc/16spaces/16spaces.env
  --skip-env-copy       Do not copy an env file; assume /etc/16spaces/16spaces.env already exists
EOF
}

server_name="16space.example.com"
port="8000"
app_user=""
env_source=""
skip_env_copy="false"
project_dir=""
ssl_certificate=""
ssl_certificate_key=""

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
    --cert)
      ssl_certificate="$2"
      shift 2
      ;;
    --key)
      ssl_certificate_key="$2"
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
repo_root="$(cd "${script_dir}/.." && pwd)"
nginx_template="${script_dir}/nginx.example.conf"
service_template="${script_dir}/16spaces.service"

if [[ -z "$project_dir" ]]; then
  project_dir="$repo_root"
fi

if [[ -z "$app_user" ]]; then
  app_user="$(stat -c '%U' "$project_dir")"
fi

if command -v ss >/dev/null 2>&1; then
  while ss -ltnH "sport = :${port}" | grep -q .; do
    port="$((port + 1))"
  done
fi

if [[ -z "$ssl_certificate" ]]; then
  ssl_certificate="/etc/letsencrypt/live/${server_name}/fullchain.pem"
fi

if [[ -z "$ssl_certificate_key" ]]; then
  ssl_certificate_key="/etc/letsencrypt/live/${server_name}/privkey.pem"
fi

have_tls_certs="false"
if [[ -f "$ssl_certificate" && -f "$ssl_certificate_key" ]]; then
  have_tls_certs="true"
fi

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
  if command -v curl >/dev/null 2>&1; then
    echo "Deno not found; bootstrapping it with the official installer..."
    curl -fsSL https://deno.land/install.sh | sh >/dev/null
  elif command -v wget >/dev/null 2>&1; then
    echo "Deno not found; bootstrapping it with the official installer..."
    wget -qO- https://deno.land/install.sh | sh >/dev/null
  else
    echo "Could not find a deno binary on this server, and curl/wget are unavailable to install it automatically." >&2
    exit 1
  fi

  if [[ -x /root/.deno/bin/deno ]]; then
    deno_bin="/root/.deno/bin/deno"
  elif command -v deno >/dev/null 2>&1; then
    deno_bin="$(command -v deno)"
  else
    echo "Deno installation did not produce a usable binary. Check the install output and rerun." >&2
    exit 1
  fi
fi

if [[ "$deno_bin" == /root/.deno/bin/deno ]]; then
  install -d -m 0755 /usr/local/bin
  install -m 0755 "$deno_bin" /usr/local/bin/deno
  deno_bin="/usr/local/bin/deno"
fi

if ! command -v nginx >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y nginx
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y nginx
  elif command -v yum >/dev/null 2>&1; then
    yum install -y nginx
  elif command -v pacman >/dev/null 2>&1; then
    pacman -Sy --noconfirm nginx
  else
    echo "nginx is not installed and no supported package manager was found." >&2
    exit 1
  fi
fi

if ! id -u "$app_user" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin --user-group "$app_user"
fi

if ! runuser -u "$app_user" -- test -x "$project_dir"; then
  echo "Service user '$app_user' cannot traverse '$project_dir'. Re-run with -u set to a user that can access the repo, or move the repo to an accessible path." >&2
  exit 1
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

if [[ "$have_tls_certs" == "true" ]]; then
  sed \
    -e "s|__SERVER_NAME__|${server_name}|g" \
    -e "s|__PORT__|${port}|g" \
    -e "s|__APP_DIR__|${project_dir}|g" \
    -e "s|__SSL_CERTIFICATE__|${ssl_certificate}|g" \
    -e "s|__SSL_CERTIFICATE_KEY__|${ssl_certificate_key}|g" \
    "$nginx_template" > "$tmp_nginx"
else
  cat > "$tmp_nginx" <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
  server_name ${server_name} localhost;

    client_max_body_size 1m;

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
    }
}
EOF
fi

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
rm -f /etc/nginx/sites-enabled/default

if ! grep -q 'sites-enabled/\*\.conf' /etc/nginx/nginx.conf; then
  perl -0pi -e 's/(http \{\n)/$1    include \/etc\/nginx\/sites-enabled\/*.conf;\n/' /etc/nginx/nginx.conf
fi

install -m 0644 "$tmp_service" /etc/systemd/system/16spaces.service

rm -f "$tmp_nginx" "$tmp_service"

systemctl daemon-reload
systemctl enable 16spaces.service
systemctl restart 16spaces.service

if command -v nginx >/dev/null 2>&1; then
  nginx -t
  systemctl enable nginx
  systemctl start nginx
  systemctl reload nginx
fi

echo "Installed nginx config: /etc/nginx/sites-available/16spaces.conf"
echo "Installed systemd unit: /etc/systemd/system/16spaces.service"
echo "Env file: ${env_dest}"
if [[ "$have_tls_certs" != "true" ]]; then
  echo "TLS certs not found yet, so nginx was bootstrapped in HTTP-only mode."
  echo "Run certbot now, then rerun this installer to enable HTTPS."
fi