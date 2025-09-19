
#!/bin/bash

if [ ! -f ../.env ]; then
    echo "Error: .env file not found"
    exit 1
fi

# Load environment variables from .env file
export $(cat ../.env | grep -v '^#' | xargs)

for i in {1..1000}
do
  echo "Sending message $i of 1000"
  messageId=$(uuidgen)
  
  curl -s --location --request POST 'http://localhost:15672/api/exchanges/%2f/eventbus/publish' \
    --header 'Content-Type: text/plain' \
    --user "${RABBITMQ_USERNAME}:${RABBITMQ_PASSWORD}" \
    --data-raw '{
      "properties": {},
      "routing_key": "ndw.nls.test.imported",
      "payload": "{\"type\": \"FCD-imported\", \"timestamp\": \"2024-11-19T16:00:00.779300\", \"message_id\": \"'${messageId}'\", \"subject\": {\"type\": \"fcd-version\", \"version\": \"1234\"}}",
      "payload_encoding": "string"
    }
    '

  echo "Put message on queue: '${messageId}'"
done
