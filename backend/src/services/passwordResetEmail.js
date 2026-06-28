import { sendMail } from './mailer.js';
import { buildNotificationEmailHtml } from './emailTemplate.js';

export async function sendPasswordResetEmail({ to, nombre, usuario, url }) {
  const subject = 'Restablecer contraseña — DevSoporte';
  const saludo = nombre ? `Hola ${nombre},` : 'Hola,';
  const introText =
    'Recibimos una solicitud para restablecer la contraseña de su usuario de soporte en DevSoporte. Si usted no la solicitó, ignore este mensaje.';
  const text = `
${saludo}

${introText}

Usuario: ${usuario}

Para elegir una nueva contraseña, abra el siguiente enlace (válido por tiempo limitado):

${url}

Si el enlace no funciona, copie y pegue la URL en su navegador.

DevSoporte
  `.trim();

  const html = buildNotificationEmailHtml({
    preheader: 'Restablezca su contraseña de DevSoporte',
    title: 'Restablecer contraseña',
    subtitle: 'Acceso técnicos de soporte',
    badge: 'Seguridad',
    accent: '#0d9488',
    greeting: saludo,
    introText,
    rows: [{ label: 'Usuario', value: usuario }],
    calloutTitle: 'Importante',
    calloutText: 'El enlace expira en poco tiempo. Solo funciona una vez para definir su nueva contraseña.',
    actionButton: { href: url, label: 'Restablecer contraseña' },
    footerNote: 'Si no solicitó este cambio, puede ignorar este correo. Su contraseña actual no se modificará.',
  });

  return sendMail({
    to,
    subject,
    text,
    html,
    meta: {
      contexto: 'recuperar_clave',
      referencia: usuario,
      cuerpo: text,
    },
  });
}
