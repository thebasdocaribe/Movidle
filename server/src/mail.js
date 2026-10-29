/**
 * Envio via EmailJS REST (sem npm extra).
 * .env: EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY
 * + EMAILJS_TEMPLATE_RESET e EMAILJS_TEMPLATE_VERIFY (ou EMAILJS_TEMPLATE_ID pra reset)
 */

async function sendEmailJs(templateId, params) {
  const serviceId = process.env.EMAILJS_SERVICE_ID
  const publicKey = process.env.EMAILJS_PUBLIC_KEY
  const privateKey = process.env.EMAILJS_PRIVATE_KEY
  const fromName = process.env.EMAIL_FROM_NAME || 'CineBlitz'

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    throw new Error(
      'E-mail não configurado no servidor. Configure o EmailJS no .env.',
    )
  }

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: {
        ...params,
        from_name: fromName,
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(
      `[mail] EmailJS ${res.status}: ${text}\n` +
        `service=${serviceId} template=${templateId}`,
    )
    if (/recipients address is corrupted/i.test(text)) {
      throw new Error(
        'EmailJS: destinatário inválido. No template, To Email deve ser exatamente {{to_email}} (sem espaços) e Salvar.',
      )
    }
    throw new Error(
      'Não foi possível enviar o e-mail de confirmação. Tente de novo em instantes.',
    )
  }

  return { sent: true }
}

export async function sendPasswordResetEmail({
  toEmail,
  username,
  resetLink,
}) {
  const templateId =
    process.env.EMAILJS_TEMPLATE_RESET || process.env.EMAILJS_TEMPLATE_ID
  return sendEmailJs(templateId, {
    to_email: toEmail,
    username,
    name: username,
    from_name: username,
    reset_link: resetLink,
    verify_link: resetLink,
    message: `Olá ${username}! Redefina sua senha no CineBlitz abrindo este link (válido 1h):\n\n${resetLink}`,
  })
}

export async function sendVerifyEmail({ toEmail, username, verifyLink }) {
  const templateId =
    process.env.EMAILJS_TEMPLATE_VERIFY ||
    process.env.EMAILJS_TEMPLATE_RESET ||
    process.env.EMAILJS_TEMPLATE_ID
  const mail = String(toEmail || '').trim().toLowerCase()
  return sendEmailJs(templateId, {
    // aliases — o To Email do template precisa bater com uma destas vars
    to_email: mail,
    email: mail,
    user_email: mail,
    username,
    name: username,
    from_name: 'CineBlitz',
    verify_link: verifyLink,
    reset_link: verifyLink,
    message: `Olá ${username}! Confirme sua conta no CineBlitz abrindo este link (válido 1h):\n\n${verifyLink}`,
  })
}
