# SalonZone Server — REST API

The backend for the SalonZone salon appointment booking platform (the public
brand in the interface is **SalonBook**). It is an Express 5 REST API on top of
MongoDB. It verifies the logged-in user on every protected endpoint, enforces
the booking rules, starts Stripe payments, and records payments through a
signature-verified Stripe webhook.

This repository is the **server**. The Next.js website is in the separate
**client** repository.

## Live Demo and Repositories

| Item          | Link                                                   |
| ------------- | ------------------------------------------------------ |
| Live API      | `<add your live server URL here>`                      |
| Live site     | `<add your live client URL here>`                      |
| Server (this) | https://github.com/nirjhonhasan/salon-zen-server       |
| Client        | https://github.com/nirjhonhasan/salon-Zen-Client       |

## Features

- **Services API:** public list of services, protected details, and
  admin-only create, update, delete and activate or deactivate.
- **Appointments API:**
  - Customers book an appointment. The server rejects inactive services,
    invalid dates and time slots, past dates, admins, and a second active
    (pending or confirmed) booking for the same service, date and slot.
  - `servicePrice` is copied from the service on the server, never from the
    client. New appointments start as `pending` and `unpaid`.
  - Customers see only their own appointments and can cancel only their own
    **pending** appointments.
  - Admins see all appointments, confirm **pending** ones and cancel
    **pending or confirmed** ones.
- **Users API (admin):** list users, block and unblock customers, and promote a
  user to admin.
- **Payments:**
  - Creates a Stripe Checkout session only for a `confirmed` and `unpaid`
    appointment that belongs to the caller. The price comes from the database.
  - A signature-verified webhook marks the appointment `paid` and saves a
    `transactions` record. Failed or expired payments are saved as `failed`.
    Nothing else can set an appointment to `paid`.
- **Transactions API (admin):** read-only list of payments.
- **JWT verification middleware:** every protected route checks the token, then
  loads the user from the database, so a blocked user or a changed role is
  noticed immediately.

## Tech Stack

| Layer          | Technology                                          |
| -------------- | --------------------------------------------------- |
| Runtime        | Node.js (ES modules)                                |
| Framework      | Express 5                                           |
| Database       | MongoDB (official `mongodb` driver)                 |
| Authentication | JWT verification with `jose` (Better Auth JWKS)     |
| Payments       | Stripe Checkout and webhooks                        |
| Other          | `cors`, `dotenv`                                    |

## Project Structure

```
index.js              app setup, webhook, middleware and route mounting
config/
  db.js               MongoDB connection and collections
  stripe.js           Stripe client
  timeSlots.js        the predefined booking time slots
middleware/auth.js    verifyToken and verifyAdmin
routes/               URLs for each resource
  payments/           checkout session route
controllers/          the logic behind each route
utils/                small helpers (id check)
```

## Getting Started

### Prerequisites

- Node.js 20 or newer and npm
- A MongoDB database. It must be the **same database as the client**
  (`salon-zen`), because Better Auth in the client owns the `user` collection.
- A Stripe account in test mode
- The client repository running, because tokens are verified against its keys

### Install

```bash
git clone https://github.com/nirjhonhasan/salon-zen-server.git
cd salon-zen-server
npm install
```

### Environment variables

Create a `.env` file in the project root. Only the **names** are listed here.
Never commit real values.

| Variable                | Purpose                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `BETTER_DB_URI`         | MongoDB connection string (same database as the client)    |
| `AUTH_URL`              | Public URL of the client. Used to verify tokens and to build the Stripe success and cancel links |
| `STRIPE_SECRET_KEY`     | Stripe secret key (use a `sk_test_` key while testing)     |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the Stripe webhook (`whsec_...`)         |
| `PORT`                  | Optional. The default is `5000`                            |

### Run locally

```bash
node index.js
```

The API runs at http://localhost:5000. Check it with `GET /`, which answers
with a welcome message.

### Test Stripe webhooks locally

Stripe cannot reach `localhost`, so forward the events with the Stripe CLI.
Use the same Stripe account that your `STRIPE_SECRET_KEY` belongs to:

```bash
stripe listen \
  --events checkout.session.completed,checkout.session.expired,checkout.session.async_payment_failed \
  --forward-to localhost:5000/api/webhooks/stripe
```

The command prints a `whsec_...` secret. Put it in `STRIPE_WEBHOOK_SECRET` and
restart the server. Pay with the test card `4242 4242 4242 4242`, any future
expiry date and any CVC.

## API Reference

Protected routes need the header `Authorization: Bearer <token>`.
"Admin" means the caller must also have the `admin` role.

### Services

| Method | Endpoint                | Access        | Description                      |
| ------ | ----------------------- | ------------- | -------------------------------- |
| GET    | `/services`             | Public        | List all services                |
| GET    | `/services/:id`         | Logged in     | One service                      |
| POST   | `/services`             | Admin         | Create a service                 |
| PUT    | `/services/:id`         | Admin         | Update a service                 |
| PATCH  | `/services/:id/status`  | Admin         | Activate or deactivate           |
| DELETE | `/services/:id`         | Admin         | Delete a service                 |

### Appointments

| Method | Endpoint                         | Access    | Description                                   |
| ------ | -------------------------------- | --------- | --------------------------------------------- |
| GET    | `/appointments/booked`           | Logged in | Booked slots for a service on a date          |
| GET    | `/appointments/my`               | Logged in | The caller's own appointments                 |
| GET    | `/appointments`                  | Admin     | All appointments with customer and service    |
| POST   | `/appointments`                  | Customer  | Book an appointment                           |
| PATCH  | `/appointments/:id/confirm`      | Admin     | Confirm a pending appointment                 |
| PATCH  | `/appointments/:id/cancel`       | Admin     | Cancel an appointment                         |
| PATCH  | `/appointments/:id/cancel-mine`  | Customer  | Cancel the caller's own pending appointment   |

### Users

| Method | Endpoint              | Access | Description                      |
| ------ | --------------------- | ------ | -------------------------------- |
| GET    | `/customers`          | Admin  | List users                       |
| GET    | `/users`              | Admin  | List users with role and status  |
| PATCH  | `/users/:id/block`    | Admin  | Block or unblock a customer      |
| PATCH  | `/users/:id/role`     | Admin  | Make a user an admin             |

### Payments and transactions

| Method | Endpoint                             | Access    | Description                                  |
| ------ | ------------------------------------ | --------- | -------------------------------------------- |
| POST   | `/payments/create-checkout-session`  | Customer  | Start Stripe Checkout for an appointment     |
| POST   | `/api/webhooks/stripe`               | Stripe    | Webhook. Verified with the signing secret    |
| GET    | `/transactions`                      | Admin     | Read-only list of payments                   |

The webhook is also available at `/payments/webhook`. It reads the raw request
body, so it is mounted before `express.json()`.

## Data Model

```
appointments: serviceId, customerId, appointmentDate, timeSlot, message,
              servicePrice, paymentStatus (unpaid | paid),
              status (pending | confirmed | cancelled), createdAt
transactions: appointmentId, customerId, amount, currency,
              stripeSessionId, status (paid | failed), createdAt
services:     serviceName, category, description, price, duration,
              image, status (active | inactive), createdAt
```

The `user`, `session` and `account` collections belong to Better Auth in the
client. This server only reads users and updates `isBlocked` and `role`.

## Security Notes

- The caller's identity always comes from the verified token, never from the
  request body.
- The price of a payment comes from the saved appointment, not from the client.
- `paymentStatus` becomes `paid` only inside the verified Stripe webhook.
- Blocked users are rejected on every protected endpoint.
- Admin accounts are seeded or promoted by an admin, never created through
  sign-up.

## Deployment Notes

- Set every environment variable on the hosting platform.
- Set `AUTH_URL` to the live client URL.
- In the Stripe dashboard, add a webhook endpoint
  `https://<your-server-domain>/api/webhooks/stripe` with the events
  `checkout.session.completed`, `checkout.session.expired` and
  `checkout.session.async_payment_failed`, and put its signing secret in
  `STRIPE_WEBHOOK_SECRET`.
- Allow only the client origin in CORS before going live.

## Author

Built by Abul Hasan as part of the SalonBook assignment.
