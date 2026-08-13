import emailjs from '@emailjs/browser';

const serviceId = 'service_3xbwnmx';
const templateId = 'template_ndxsysh';
const publicKey = 'ZP7dUh_bOfue4qoXh';

emailjs.init({ publicKey });

export async function sendEmail(to, subject, message, name = 'Customer') {
  try {
    const response = await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: to,
        to_name: name,
        customer_name: name,
        subject,
        message,
        reply_to: to
      },
      { publicKey }
    );
    return response && (response.status === 200 || response.status === 'OK' || response.status === 'success');
  } catch (error) {
    console.error('EmailJS send failed:', error);
    return false;
  }
}