const e = require('express');
const express = require('express');
const app = express();

const stripe = require('stripe')('sk_test_YOUR-KEY');

// DATA MODEL
const customers = {
  stripeCustomerId: {
    apiKey: '123xyz',
    active: false,
    itemId: 'stripeItemId',
    calls: 0
  },
};

const apiKeys = {
  '123xyz': 'cust1',
};

// Custom API Key Generation & Hashing
function generateAPIKey() {
  const { randomBytes } = require('crypto');
  const apiKey = randomBytes(16).toString('hex');
  const hashedAPIKey = hashedAPIKey(apiKey);

  if (apiKeys[hashedAPIKey]) {
    generateAPIKey();
  } else {
    return { hashedAPIKey, apiKey };
  }
}

function hashAPIKey(apiKey) {
  const { createHash } = require('crypto');

  const hashedAPIKey = createHash('md5').update(apiKey).digest('hex');

  return hashedAPIKey
}

// Express API
app.post('/checkout', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: 'price_1K1ZTkAFOerKpHQwflLt8ecT',
      },
    ],
    success_url: 'http://localhost:5000/success?session_id={CHECKOUT_SUCCESS_ID}',
    cancel_url: 'http://localhost:5000/error',
  });

  res.send(session);
});

app.post('/webhook', async (req, res) => {
  let data;
  let eventType;

  const webhookSecret = ''

  if (webhookSecret) {
    let event;
    let signature = req.headers['stripe-signature']

    try {
      event = stripe.webhooks.constructEvent(
        req['rawBody'],
        signature,
        webhookSecret
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      return res.sendStatus(400);
    }
    data = event.data;
    eventType = event.type;
  } else {
    data = req.body.data;
    eventType = req.body.type;
  }

  switch (eventType) {
    case 'checkout.session.completed':
      console.log(data);
      const customerId = data.object.customer;
      const subscriptionId = data.object.subscription;

      console.log(`💰 Customer ${customerId} subscribed to plan ${subscriptionId}`);

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const itemId = subscription.items.data[0].id;

      const { apiKey, hashedAPIKey } = generateAPIKey();
      console.log(`Generated unique API key: ${apiKey}`);

      customers[customerId] = { apiKey: hashedAPIKey, itemId, active: true, }
      apiKeys[hashedAPIKey] = customerId;

      break;
    case 'invoice.paid':
      break;
    case 'invoice.payment_failed':
    default:
  }
})


app.get('/customers/:id', (req, res) => {
  const customerId = req.params.id;
  const account = customers[customerId];
  if (account) {
    res.send(account);
  } else {
    res.sendStatus(404);
  }
});

app.get('/api', async (req, res) => {
  const apiKey = req.query.apiKey;

  if (!apiKey) {
    res.sendStatus(400);
  }

  const hashedAPIKey = hashAPIKey(apiKey)

  const customerId = apiKeys[hashedAPIKey];
  const customer = customers[customerId];

  if (!customer.active) {
    res.sendStatus(403);
  } else {
    const record = await stripe.subscriptionItems.createUsageRecord(
      customer.itemId,
      {
        quantity: 1,
        timestamp: 'now',
        action: 'increment',
      }
    );
    res.send({ data: '🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥', usage: record });
  }
});

app.get('/usage/:customer', async (req, res) => {
  const customerId = req.params.customer;
  const invoice = await stripe.invoices.retrieveUpcoming({
    customer: customerId,
  });

  res.send(invoice);
});

app.listen(8080, () => console.log('Start server on http://localhost:8080'));
