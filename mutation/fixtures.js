'use strict';

/**
 * fixtures.js — deterministic local demo app with seedable bugs.
 *
 * buildSite(activeBugs) returns { '<path>': '<full html>' }. The SAME base
 * app is generated for every variant; exactly one bug (or none) changes
 * behaviour. All pages are static HTML+inline JS so runs are reproducible
 * and no external dependency exists.
 *
 * Seeded bugs (each is a REAL defect class):
 *   broken_nav     About link points at /about.html which is never served (404)
 *   wrong_calc     Cart total adds a phantom $10 line
 *   bad_validation Checkout accepts any syntactically-invalid email
 *   missing_required Login succeeds with EMPTY username/password
 *   dead_button    Contact form submit button does nothing
 */

const BUGS = {
  broken_nav: {
    name: 'Broken navigation link',
    description: '/about.html is linked from every page but never served (404).',
    targets: ['about'],
    detect_urls: ['404', 'about.html'],
  },
  wrong_calc: {
    name: 'Wrong cart total',
    description: 'Cart total silently includes an extra $10 fee not shown anywhere.',
    targets: ['total'],
    detect_urls: [],
  },
  bad_validation: {
    name: 'Checkout accepts invalid email',
    description: 'Place order succeeds with email "not-an-email".',
    targets: ['email', 'place order'],
    detect_urls: [],
  },
  missing_required: {
    name: 'Login accepts empty credentials',
    description: 'Empty username/password still logs the user in.',
    targets: ['login', 'sign in'],
    detect_urls: [],
  },
  dead_button: {
    name: 'Dead submit button',
    description: 'Contact form submit performs no action and gives no feedback.',
    targets: ['send message', 'contact'],
    detect_urls: [],
  },
};

const STYLE = `
  <style>
    body{font-family:Arial,sans-serif;margin:0;background:#f4f5f7}
    nav{background:#1f2937;padding:12px 24px;display:flex;gap:20px}
    nav a{color:#fff;text-decoration:none;font-size:15px}
    main{max-width:720px;margin:32px auto;background:#fff;padding:28px;border-radius:8px}
    h1{margin-top:0}
    input,button{padding:8px 12px;font-size:14px;margin:6px 0;display:block}
    button{cursor:pointer}
    .product{border:1px solid #ddd;padding:12px;margin:10px 0;border-radius:6px}
    .err{color:#b91c1c}.ok{color:#047857}
  </style>`;

function nav() {
  return `<nav>
    <a href="/index.html">Home</a>
    <a href="/shop.html">Shop</a>
    <a href="/cart.html">Cart</a>
    <a href="/contact.html">Contact</a>
    <a href="/about.html">About</a>
  </nav>`;
}

const page = (title, body) => `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${title}</title>${STYLE}</head><body>${nav()}<main>${body}</main></body></html>`;

const LOGIN_OK_USER = 'demo';
const LOGIN_OK_PASS = 'demo123';

function indexPage(bugs) {
  return page('DemoShop Home', `
    <h1>DemoShop</h1>
    <p>A tiny shop used by the mutation-testing harness.</p>
    <h2>Sign in</h2>
    <form id="login" onsubmit="return doLogin(event)">
      <input id="user" type="text" placeholder="Username">
      <input id="pass" type="password" placeholder="Password">
      <button type="submit">Login</button>
      <p class="err" id="loginErr"></p>
    </form>
    <script>
      function doLogin(e){
        e.preventDefault();
        var u=document.getElementById('user').value.trim();
        var p=document.getElementById('pass').value.trim();
        var emptyOk=${bugs.includes('missing_required')};
        if(emptyOk){location.href='/shop.html';return false;}
        if(u==='${LOGIN_OK_USER}'&&p==='${LOGIN_OK_PASS}'){location.href='/shop.html';return false;}
        if(!u||!p){document.getElementById('loginErr').textContent='Please fill both fields.';return false;}
        document.getElementById('loginErr').textContent='Invalid credentials.';
        return false;
      }
    </script>`);
}

const PRODUCTS = [
  { id: 'p1', name: 'Wireless Mouse', price: 25 },
  { id: 'p2', name: 'USB-C Cable', price: 12 },
  { id: 'p3', name: 'Desk Lamp', price: 40 },
];

function shopPage() {
  const rows = PRODUCTS.map((p) => `
    <div class="product" data-id="${p.id}">
      <strong>${p.name}</strong> — $${p.price}
      <button onclick="add('${p.id}')">Add to cart</button>
    </div>`).join('');
  return page('DemoShop Shop', `
    <h1>Shop</h1>${rows}
    <script>
      function add(id){
        var c=JSON.parse(localStorage.getItem('cart')||'{}');
        c[id]=(c[id]||0)+1;
        localStorage.setItem('cart',JSON.stringify(c));
        alert('Added to cart');
      }
    </script>`);
}

function cartPage(bugs) {
  return page('DemoShop Cart', `
    <h1>Your cart</h1>
    <div id="items"></div>
    <h2>Total: $<span id="total">0</span></h2>
    <button onclick="location.href='/checkout.html'">Proceed to checkout</button>
    <script>
      var P=${JSON.stringify(PRODUCTS)};
      var c=JSON.parse(localStorage.getItem('cart')||'{}');
      var total=0,out='';
      P.forEach(function(p){
        var q=c[p.id]||0;if(!q)return;
        total+=p.price*q;
        out+='<div class="product">'+q+' x '+p.name+' ($'+(p.price*q)+')</div>';
      });
      ${bugs.includes('wrong_calc') ? "total+=10;" : ""}
      document.getElementById('items').innerHTML=out||'<p>(empty)</p>';
      document.getElementById('total').textContent=total;
    </script>`);
}

function checkoutPage(bugs) {
  return page('DemoShop Checkout', `
    <h1>Checkout</h1>
    <form onsubmit="return placeOrder(event)">
      <input id="email" type="text" placeholder="Email address">
      <input id="name" type="text" placeholder="Full name">
      <button type="submit">Place order</button>
      <p id="msg"></p>
    </form>
    <script>
      function placeOrder(e){
        e.preventDefault();
        var em=document.getElementById('email').value.trim();
        var valid=/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(em);
        ${bugs.includes('bad_validation') ? 'valid=true;' : ''}
        var m=document.getElementById('msg');
        if(!valid){m.className='err';m.textContent='Invalid email address';return false;}
        m.className='ok';m.textContent='Order placed!';
        localStorage.removeItem('cart');
        return false;
      }
    </script>`);
}

function contactPage(bugs) {
  return page('DemoShop Contact', `
    <h1>Contact us</h1>
    <form onsubmit="return sendMsg(event)">
      <input type="text" placeholder="Your name">
      <textarea placeholder="Message"></textarea>
      <button type="submit">Send message</button>
      <p id="sent"></p>
    </form>
    <script>
      function sendMsg(e){
        e.preventDefault();
        ${bugs.includes('dead_button')
          ? 'return false;'
          : "document.getElementById('sent').className='ok';document.getElementById('sent').textContent='Thanks! We will reply soon.';return false;"}
      }
    </script>`);
}

function aboutPage() {
  return page('DemoShop About', '<h1>About</h1><p>DemoShop is a fixture application.</p>');
}

function notFoundPage() {
  return page('404 — Not Found', '<h1>404</h1><p class="err">The page you requested does not exist.</p>');
}

/** Build the whole site for a set of active bug ids. */
function buildSite(activeBugs = []) {
  const unknown = activeBugs.filter((b) => !BUGS[b]);
  if (unknown.length) throw new Error(`Unknown bug ids: ${unknown.join(', ')}`);
  return {
    '/index.html': indexPage(activeBugs),
    '/shop.html': shopPage(activeBugs),
    '/cart.html': cartPage(activeBugs),
    '/checkout.html': checkoutPage(activeBugs),
    '/contact.html': contactPage(activeBugs),
    '/': indexPage(activeBugs),
    // NOTE: '/about.html' deliberately ABSENT when broken_nav is active.
    ...(activeBugs.includes('broken_nav') ? {} : { '/about.html': aboutPage() }),
    '__404': notFoundPage(),
  };
}

module.exports = { BUGS, buildSite, PRODUCTS };
