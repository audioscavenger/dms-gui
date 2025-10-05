#!/usr/bin/env bash
# Bash needed for PIPESTATUS array

extract() {
  case "$4" in
  0) openssl x509 -in "$1" -outform DER;;
  1) openssl x509 -in "$1" -noout -pubkey | openssl pkey -pubin -outform DER;;
  esac
}
digest() {
  case "$5" in
  0) cat;;
  1) openssl dgst -sha256 -binary;;
  2) openssl dgst -sha512 -binary;;
  esac
}
encode() {
  local cert=$1; shift
  local hostport=$1; shift
  local u=$1; shift
  local s=$1; shift
  local m=$1; shift
  local host=$hostport
  local port=25

  OIFS="$IFS"; IFS=":"; set -- $hostport; IFS="$OIFS"
  if [ $# -eq 2 ]; then host=$1; port=$2; fi

  printf "_%d._tcp.%s. IN TLSA %d %d %d %s\n" \
    "$port" "$host" "$u" "$s" "$m" \
     "$(od -vAn -tx1 | tr -d ' \012')"
}

genrr() {
    rr=$(
        extract "$@" | digest "$@" | encode "$@"
        exit $(( ${PIPESTATUS[0]} | ${PIPESTATUS[1]} | ${PIPESTATUS[2]} ))
    )
    status=$?; if [ $status -ne 0 ]; then exit $status; fi
    echo "$rr"
}

error() { echo "$1" 1>&2; exit 1; }
usage() { error "Usage: $0 chain.pem host[:port]"; }
if [ $# -ne 2 ]; then usage; fi

# Validate and normalize the chain
#
certfile=$1; shift
chain="$(
    openssl crl2pkcs7 -nocrl -certfile "$certfile" |
        openssl pkcs7 -print_certs
    exit $(( ${PIPESTATUS[0]} | ${PIPESTATUS[1]} ))
)"
status=$?; if [ $status -ne 0 ]; then exit $status; fi

hostport=$1; shift
usage=3
cert=
printf "%s\n\n" "$chain" |
while read line
do
    if [[ -z "$cert" && ! "$line" =~ ^-----BEGIN ]]; then
        continue
    fi
    cert=$(printf "%s\n%s" "$cert" "$line")
    if [ -z "$line" -a ! -z "$cert" ]; then
        echo "$cert" |
            openssl x509 -noout -subject -issuer -dates |
            sed -e 's/^/;; /'
        echo ";;"
        genrr <(echo "$cert") "$hostport" $usage 0 1
        genrr <(echo "$cert") "$hostport" $usage 1 1
        genrr <(echo "$cert") "$hostport" $usage 0 2
        genrr <(echo "$cert") "$hostport" $usage 1 2
        echo
        cert=""
        usage=2
    fi
done
