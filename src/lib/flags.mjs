// Interruptores de compilação.
// PUBLIC_REVIEW=false  → retira faixa e notas de revisão e permite indexação (só após aprovação do escritório).
// PUBLIC_CONTACT_FORM=on → mostra o formulário (exige canal de envio configurado na função /api/contacto).
export const reviewMode = import.meta.env.PUBLIC_REVIEW !== 'false';
export const contactFormEnabled = import.meta.env.PUBLIC_CONTACT_FORM === 'on';
