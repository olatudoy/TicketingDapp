# Ticketing DApp

This decentralized application (DApp) implements a ticketing system using Cartesi Rollups technology. Users can create events, purchase tickets, verify tickets, and view event information.

## Features

1. Create events with custom details (name, date, venue, total tickets, ticket price)
2. Purchase tickets for existing events
3. Verify ticket validity
4. Get event information
5. List all events and tickets

## Installation

1. Clone this repository
2. Install dependencies:
   
   npm install
   

## Running the DApp

Start the DApp using the Cartesi Rollups environment. Refer to the Cartesi documentation for detailed instructions on how to run a Rollups DApp.

## Interacting with the DApp

### Sending Inputs (Advance Requests)

To interact with the DApp, send a JSON payload with the following structure:

1. Create an event:
json
{
  "action": "create_event",
  "name": "Summer Concert",
  "date": "2023-07-15",
  "venue": "Central Park",
  "totalTickets": 1000,
  "ticketPrice": 50
}


2. Buy a ticket:
json
{
  "action": "buy_ticket",
  "eventId": 1,
  "buyer": "0x1234567890123456789012345678901234567890"
}


3. Get event information:
json
{
  "action": "get_event_info",
  "eventId": 1
}


4. Verify a ticket:
json
{
  "action": "verify_ticket",
  "eventId": 1,
  "ticketId": 1
}


### Inspecting State

To inspect the DApp's state, use the following routes:

1. List all events: "list_events" 

2. List all tickets:"list_tickets"
