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
        const eventId = nextEventId++;
        events[eventId] = {
          name: payload.name,
          date: payload.date,
          venue: payload.venue,
          totalTickets: payload.totalTickets,
          availableTickets: payload.totalTickets,
          ticketPrice: payload.ticketPrice
        };
        response = `Event created with ID: ${eventId}`;
        break;

      case "buy_ticket":
        if (events[payload.eventId] && events[payload.eventId].availableTickets > 0) {
          const ticketId = nextTicketId++;
          tickets[ticketId] = {
            eventId: payload.eventId,
            owner: payload.buyer,
            purchaseDate: Date.now()
          };
          events[payload.eventId].availableTickets--;
          response = `Ticket purchased with ID: ${ticketId}`;
        } else {
          response = "Event not found or sold out";
        }
        break;

      case "get_event_info":
        if (events[payload.eventId]) {
          response = JSON.stringify(events[payload.eventId]);
        } else {
          response = "Event not found";
        }
        break;

      case "verify_ticket":
        if (tickets[payload.ticketId] && tickets[payload.ticketId].eventId === payload.eventId) {
          response = "Ticket is valid";
        } else {
          response = "Invalid ticket";
        }
        break;

      default:
        response = "Invalid action";
    }

    const outputStr = stringToHex(response);
    await fetch(rollup_server + "/notice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: outputStr }),
    });
  } catch (error) {
    console.error("Error processing request:", error);
  }
  return "accept";
}

async function handle_inspect(data) {
  console.log("Received inspect request data " + JSON.stringify(data));

  const payload = data["payload"];
  const route = hex2str(payload);

  let responseObject;
  if (route === "list_events") {
    responseObject = JSON.stringify(Object.values(events));
  } else if (route === "list_tickets") {
    const ticketList = [];
    for (const ticketId in tickets) {
      ticketList.push(tickets[ticketId]);
    }
    responseObject = JSON.stringify(ticketList);
  } else {
    responseObject = "Invalid inspection route";
  }

  const outputStr = str2hex(responseObject);
  await fetch(rollup_server + "/report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload: outputStr }),
  });

  return "accept";
}

var handlers = {
  advance_state: handle_advance,
  inspect_state: handle_inspect,
};

var finish = { status: "accept" };

(async () => {
  while (true) {
    const finish_req = await fetch(rollup_server + "/finish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "accept" }),
    });

    console.log("Received finish status " + finish_req.status);

    if (finish_req.status == 202) {
      console.log("No pending rollup request, trying again");
    } else {
      const rollup_req = await finish_req.json();
      var handler = handlers[rollup_req["request_type"]];
      finish["status"] = await handler(rollup_req["data"]);
    }
  }
})();