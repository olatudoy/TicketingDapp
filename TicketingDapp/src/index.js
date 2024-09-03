const { hexToString, stringToHex } = require("viem");

const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollup_server);

const events = {};
const tickets = {};
let nextEventId = 1;
let nextTicketId = 1;

async function handle_advance(data) {
  console.log("Received advance request data " + JSON.stringify(data));
  const payloadString = hexToString(data.payload);
  console.log(`Converted payload: ${payloadString}`);

  try {
    const payload = JSON.parse(payloadString);
    let response;

    switch (payload.action) {
      case "create_event":
        response = createEvent(payload);
        break;
      case "buy_ticket":
        response = buyTicket(payload);
        break;
      case "get_event_info":
        response = getEventInfo(payload);
        break;
      case "verify_ticket":
        response = verifyTicket(payload);
        break;
      default:
        response = "Invalid action";
    }

    const outputStr = stringToHex(JSON.stringify(response));
    await sendNotice(outputStr);
  } catch (error) {
    console.error("Error processing request:", error);
    await sendNotice(stringToHex(JSON.stringify({ error: error.message })));
  }
  return "accept";
}

function createEvent(payload) {
  const eventId = nextEventId++;
  events[eventId] = {
    id: eventId,
    name: payload.name,
    date: payload.date,
    venue: payload.venue,
    totalTickets: payload.totalTickets,
    availableTickets: payload.totalTickets,
    ticketPrice: payload.ticketPrice
  };
  return { message: "Event created successfully", eventId };
}

function buyTicket(payload) {
  const event = events[payload.eventId];
  if (!event || event.availableTickets <= 0) {
    throw new Error("Event not found or sold out");
  }
  const ticketId = nextTicketId++;
  tickets[ticketId] = {
    id: ticketId,
    eventId: payload.eventId,
    owner: payload.buyer,
    purchaseDate: new Date().toISOString()
  };
  event.availableTickets--;
  return { message: "Ticket purchased successfully", ticketId };
}

function getEventInfo(payload) {
  const event = events[payload.eventId];
  if (!event) {
    throw new Error("Event not found");
  }
  return event;
}

function verifyTicket(payload) {
  const ticket = tickets[payload.ticketId];
  if (!ticket || ticket.eventId !== payload.eventId) {
    throw new Error("Invalid ticket");
  }
  return { message: "Ticket is valid", ticket };
}

async function handle_inspect(data) {
  console.log("Received inspect request data " + JSON.stringify(data));

  const payload = data["payload"];
  const route = hexToString(payload);

  let response;
  switch (route) {
    case "list_events":
      response = Object.values(events);
      break;
    case "list_tickets":
      response = Object.values(tickets);
      break;
    default:
      response = { error: "Invalid inspection route" };
  }

  const outputStr = stringToHex(JSON.stringify(response));
  await sendReport(outputStr);

  return "accept";
}

async function sendNotice(payload) {
  await fetch(rollup_server + "/notice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });
}

async function sendReport(payload) {
  await fetch(rollup_server + "/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });
}

const handlers = {
  advance_state: handle_advance,
  inspect_state: handle_inspect,
};

(async () => {
  while (true) {
    const finish_req = await fetch(rollup_server + "/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "accept" }),
    });

    console.log("Received finish status " + finish_req.status);

    if (finish_req.status == 202) {
      console.log("No pending rollup request, trying again");
    } else {
      const rollup_req = await finish_req.json();
      const handler = handlers[rollup_req["request_type"]];
      await handler(rollup_req["data"]);
    }
  }
})();
