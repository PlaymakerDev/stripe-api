const express = require('express');
const app = express();

const stripe = require('stripe')('sk_test_51K1ZRRAFOerKpHQwkQAsLztlVoHOOIroAmWM2tTyO7UUbpYGtwHNNFBD1mqJSSPYcTNJpMO3KlsaR6FBJnQBZDaD00xr70GEYg');

app.get('/api', (req, res) => {
    
    const apiKey = req.query.apiKey;

    // TODO validate API key
    // TODO bill user for usage

    res.send({ data: '🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥' });

});

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

app.listen(8080, () => console.log('alive on http://localhost:8080'));
