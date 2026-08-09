const express = require('express');
const cors = require('cors');
const { RESEND_API_KEY, FROM_EMAIL, ORDER_CREATED_TEMPLATE_ID, ORDER_STATUS_CHANGED_TEMPLATE_ID } = require('./resend-config');

const app = express();
app.use(cors());
app.use(express.json());

const validateConfig = () => {
  if (!RESEND_API_KEY || RESEND_API_KEY.startsWith('re_')) {
    console.warn('WARNING: Resend API key is not configured. Update resend-config.js with your real key.');
  }
  if (!ORDER_CREATED_TEMPLATE_ID || !ORDER_STATUS_CHANGED_TEMPLATE_ID) {
    console.warn('WARNING: One or more Resend template IDs are not configured. Update resend-config.js.');
  }
};

const buildTemplateData = (order) => ({
  orderId: order.id,
  txRef: order.txRef || '',
  orderStatus: order.status || '',
  orderTotal: order.total != null ? order.total.toFixed(2) : '',
  orderCreatedAt: order.createdAt || '',
  customerName: order.user?.name || '',
  customerEmail: order.user?.email || '',
  customerPhone: order.user?.phone || '',
  itemCount: order.items?.length || 0,
  items: (order.items || []).map(item => ({
    name: item.name,
    quantity: item.quantity,
    price: item.price != null ? item.price.toFixed(2) : '',
    itemTotal: item.price != null ? (item.price * item.quantity).toFixed(2) : ''
  }))
});

const sendResendEmail = async (templateId, order) => {
  if (!RESEND_API_KEY || RESEND_API_KEY.startsWith('re_')) {
    throw new Error('Resend API key is not configured');
  }
  if (!order || !order.user || !order.user.email) {
    throw new Error('Invalid order or customer email');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: order.user.email,
      template: templateId,
      template_data: buildTemplateData(order),
      subject: `Order ${order.id} ${order.status ? `- ${order.status}` : ''}`
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error: ${response.status} ${response.statusText} - ${body}`);
  }
  return response.json();
};

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.post('/api/order-created', async (req, res) => {
  const { order } = req.body || {};
  try {
    const result = await sendResendEmail(ORDER_CREATED_TEMPLATE_ID, order);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Order created email error:', error.message || error);
    res.status(500).json({ success: false, error: error.message || 'Failed to send email' });
  }
});

app.post('/api/order-status-changed', async (req, res) => {
  const { order } = req.body || {};
  try {
    const result = await sendResendEmail(ORDER_STATUS_CHANGED_TEMPLATE_ID, order);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Order status changed email error:', error.message || error);
    res.status(500).json({ success: false, error: error.message || 'Failed to send email' });
  }
});

const PORT = process.env.PORT || 3000;
validateConfig();
app.listen(PORT, () => {
  console.log(`Resend email server started on http://localhost:${PORT}`);
});
