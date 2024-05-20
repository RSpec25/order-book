// Orderbook code of an trading exchange:---->
import express from 'express';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser({}));

interface Balance {
    [key: string]: number
}
interface User {
    userId: string,
    balance: Balance,
}
interface Order {
    userId: string,
    price: number,
    quantity: number
}
const user: User[] = [
    {
        userId: '1',
        balance: {
            'google': 10,
            'USD': 10000
        }
    },
    {
        userId: '2',
        balance: {
            'google': 5,
            'USD': 5000
        }
    }
]
const ticker: string = 'google';
const bid: Order[] = [];
const ask: Order[] = [];
enum Side {
    buy = 'buy',
    sell = 'sell'
}
app.post('/orders', (req, res) => {
    const side: Side = req.body.side;
    const userId: string = req.body.userId;
    const price: number = req.body.price;
    const qnty: number = req.body.quantity;

    const remainingQty = fillOrders(side, userId, price, qnty);

    if (remainingQty == 0) {
        res.json({
            msg: "Order filled succesfully"
        })
        return;
    }

    if (side === Side.buy) {
        bid.push({
            userId: userId,
            price: price,
            quantity: remainingQty
        })

        bid.sort((n1, n2) => n1 < n2 ? 1 : -1); // max buying price last -- remove from last
    }
    else {
        ask.push({
            userId: userId,
            price: price,
            quantity: remainingQty
        })
        ask.sort((a, b) => a < b ? -1 : 1);  // least selling price last -- remove from last 
    }

    res.json({
        msg: `remaining quantity left unfilled ${remainingQty}`
    })
    return;

})
app.get('/depth', (req, res) => {
    const depth: {
        [price: string]: {
            type: 'bid' | 'ask',
            qnty: number
        }
    } = {}

    for (let i = bid.length - 1; i >= 0; i--) {
        if (!depth[bid[i].price]) {
            depth[bid[i].price] = { type: 'bid', qnty: bid[i].quantity }
        } else {
            depth[bid[i].price].qnty += bid[i].quantity;
        }
    }
    for (let i = ask.length - 1; i >= 0; i--) {
        if (!depth[ask[i].price]) {
            depth[ask[i].price] = { type: 'ask', qnty: ask[i].quantity }
        } else {
            depth[ask[i].price].qnty += ask[i].quantity;
        }
    }

    res.json({
        depth: depth
    })

})

app.get('/balance/:userId', (req, res) => {
    const id: string = req.params.userId;
    // user.find( u => u.userId === id);
    user.forEach(u => {
        if (u.userId === id) {
            res.json({
                balance: u.balance
            })
            return;
        }
    })
    res.json({
        balance: 0
    })
})

app.get('/qoute', (req, res) => {
    //todo get the latest price
})

app.listen(3000, () => {
    console.log("App running on port 3000");
})

function fillOrders(side: Side, id: string, price: number, qnty: number): number {
    let remain = qnty;
    if (side === Side.buy) {
        for (let i = ask.length - 1; i >= 0; i--) {
            if (ask[i].price > price) {
                break;
            }
            if (ask[i].quantity > qnty) {
                ask[i].quantity -= qnty;
                remain = 0;
                flipBal(ask[i].userId, id, qnty, ask[i].price);
                return remain;
            } else {
                remain = remain - ask[i].quantity;
                flipBal(ask[i].userId, id, qnty, ask[i].price);
                ask.pop();
            }
        }
    } else {
        for (let i = bid.length - 1; i >= 0; i--) {
            if (bid[i].price < price) {
                break;
            }
            if (bid[i].quantity > qnty) {
                bid[i].quantity -= qnty;
                remain = 0;
                flipBal(id, bid[i].userId, qnty, price);
                return remain;
            } else {
                remain = remain - bid[i].quantity;
                flipBal(id, bid[i].userId, qnty, price);
                bid.pop()
            }
        }
    }
    return remain;
}

function flipBal(askId: string, id: string, qnty: number, price: number) {
    let userAsk = user.find(x => x.userId === askId);
    let userBid = user.find(x => x.userId === id);
    if (!userAsk || !userBid) { return; }
    userAsk.balance[ticker] -= qnty;
    userBid.balance[ticker] += qnty;
    userAsk.balance['USD'] += price * qnty;
    userBid.balance['USD'] -= price * qnty;
}