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

  if [[ $i -eq 1 ]]
  then
      ## messageId in properties
      curl -s --location --request POST 'http://'${NEXT_PUBLIC_RABBITMQ_HOST}':'${NEXT_PUBLIC_RABBITMQ_PORT}'/api/exchanges/%2f/eventbus/publish' \
        --header 'Content-Type: text/plain' \
        --user "${RABBITMQ_USERNAME}:${RABBITMQ_PASSWORD}" \
        --data-raw '{
          "properties": {
            "message_id": "'${messageId}'"
          },
          "routing_key": "test.imported",
          "payload": "{\"type\": \"event-imported\", \"timestamp\": \"2024-11-19T16:00:00.779300\", \"subject\": {\"type\": \"new-version\", \"version\": \"1234\"}}",
          "payload_encoding": "string"
        }
        '
  else
    curl -s --location --request POST 'http://'${NEXT_PUBLIC_RABBITMQ_HOST}':'${NEXT_PUBLIC_RABBITMQ_PORT}'/api/exchanges/%2f/eventbus/publish' \
      --header 'Content-Type: text/plain' \
      --user "${RABBITMQ_USERNAME}:${RABBITMQ_PASSWORD}" \
      --data-raw '{
        "properties": {},
        "routing_key": "test.imported",
        "payload": "{\"type\": \"event-imported\", \"timestamp\": \"2024-11-19T16:00:00.779300\", \"message_id\": \"'${messageId}'\", \"subject\": {\"type\": \"new-version\", \"version\": \"1234\"}}",
        "payload_encoding": "string"
      }
      '
  fi

  echo "Put message on queue: '${messageId}'"
done
