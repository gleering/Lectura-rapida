# Deploy de ReadFlow en el VPS

Guía para publicar la app en `https://readflow.gleering.com.ar` con la clave de IA segura.

## 0. Requisitos

- Node.js 18.18+ (recomendado 20 LTS) y npm en el VPS.
- PM2 global: `npm i -g pm2`
- Un reverse proxy con HTTPS: **Caddy** (recomendado) o **Nginx + certbot**.
- DNS: registro **A** de `readflow.gleering.com.ar` apuntando a la IP del VPS.

## 1. Subir el código

```bash
# En el VPS, por ejemplo en /var/www/readflow
git clone <tu-repo> /var/www/readflow
cd /var/www/readflow
```

> La carpeta `.next/`, `node_modules/` y `.env.local` NO están en el repo (van en .gitignore).

## 2. Configurar la clave de IA (NUNCA se commitea)

```bash
cp .env.example .env.local
nano .env.local   # pega tu clave real en GEMINI_API_KEY=...
```

`.env.local` es leído automáticamente por Next en `next start`. La clave solo la usa
la ruta de servidor `/api/gemini`; jamás llega al navegador.

## 3. Instalar y compilar

```bash
npm ci
npm run build
```

## 4. Levantar con PM2

Edita `ecosystem.config.js` y ajusta `cwd` a la ruta real (p.ej. `/var/www/readflow`). Luego:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup      # sigue la instrucción que imprime (para arranque tras reboot)
```

La app queda escuchando en `localhost:3000`.

## 5. Reverse proxy + HTTPS

### Opción A — Caddy (recomendada, TLS automático)

```bash
# copia deploy/Caddyfile a /etc/caddy/Caddyfile (o añade el bloque)
sudo caddy reload --config /etc/caddy/Caddyfile
```

### Opción B — Nginx + certbot

```bash
sudo cp deploy/nginx-readflow.conf /etc/nginx/sites-available/readflow.conf
sudo ln -s /etc/nginx/sites-available/readflow.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d readflow.gleering.com.ar
```

## 6. Verificar

- Abre `https://readflow.gleering.com.ar` — debe cargar con candado (HTTPS válido).
- En móvil/escritorio debe aparecer "Instalar app" (PWA) — requiere el HTTPS del paso 5.
- Prueba el Tutor o generar tarjetas: si responde, la clave del servidor funciona.

## Actualizar la app más adelante

```bash
cd /var/www/readflow
git pull
npm ci
npm run build
pm2 reload readflow
```

## Chequeo de seguridad (ya validado en el código)

- La clave vive solo en el servidor (`GEMINI_API_KEY`, sin `NEXT_PUBLIC_`).
- Todas las llamadas a Gemini pasan por `/api/gemini` (proxy servidor).
- El bundle del navegador NO contiene la clave ni el endpoint de Google.
- `.env.local` está en `.gitignore` → el secreto nunca se sube al repo.
- Recomendado: en Google AI Studio, restringe la clave por dominio/API.
