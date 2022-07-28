const e = require('express');
const express = require('express');
const app = express();

const stripe = require('stripe')('sk_test_51K1ZRRAFOerKpHQwkQAsLztlVoHOOIroAmWM2tTyO7UUbpYGtwHNNFBD1mqJSSPYcTNJpMO3KlsaR6FBJnQBZDaD00xr70GEYg');

const customers = {
  stripeCustomerId: {
    apiKey: '123xyz',
    active: false,
    itemId: 'stripeItemId',
    calls: 0
  },
};

const apiKeys = {
  // apiKey : customerdata
  '123xyz': 'cust1',
};

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

function hashedAPIKey(apiKey) {
  const { createHash } = require('crypto');
  const hashedAPIKey = createHash('md5').update(apiKey).digest('hex');

  return hashedAPIKey
}

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

////// Express API ///////

// Create a Stripe Checkout Session to create a customer and subscribe them to a plan
app.post('/checkout', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: 'price_1K1ZTkAFOerKpHQwflLt8ecT',
      },
    ],
    // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
    // the actual Session ID is returned in the query parameter when your customer
    // is redirected to the success page.
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

app.get('/usage/:customer', async (req, res) => {
  const customerId = req.params.customer;
  const invoice = await stripe.invoices.retrieveUpcoming({
    customer: customerId,
  });

  res.send(invoice);
});

app.listen(8080, () => console.log('Running on http://localhost:8080'));
