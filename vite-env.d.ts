/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  readonly GEMINI_API_KEY?: string; // Opcional, caso esteja configurado
  readonly VITE_MERCADOPAGO_PUBLIC_KEY?: string; // Chave pública MP (Checkout Bricks / CardForm)
  readonly VITE_ADMIN_EMAILS?: string; // E-mails com acesso admin (sem pagamento/trial), separados por vírgula
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
