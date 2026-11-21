// Função Netlify (API v2). Recebe o formulário de /contactos.
// Sem variáveis de ambiente de envio configuradas, responde 503 e indica telefone e e-mail.
import { handleContact } from '../../src/lib/contact-handler.mjs';
import { transportFromEnv } from '../../src/lib/contact.mjs';

export default async (request) =>
  handleContact(request, {
    transport: transportFromEnv(process.env),
    log: (m) => console.log(m),
  });

export const config = { path: '/api/contacto' };
