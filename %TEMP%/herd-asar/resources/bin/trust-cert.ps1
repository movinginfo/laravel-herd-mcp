$storeType = $args[0]  # "Root" or "CA"
$certPath = $args[1]   # Path to the certificate file

certutil -addstore "$storeType" "$certPath"