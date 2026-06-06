# VacaMake — Cliente Frontend

Este repositorio contiene únicamente la aplicación del cliente (Frontend PWA) desarrollada en **Next.js** con App Router y Tailwind CSS. El servidor backend y la base de datos se encuentran alojados de forma privada por seguridad.

---

## Cómo iniciar el proyecto localmente

Sigue estos pasos para correr la aplicación en tu entorno local conectándote directamente a las APIs en vivo:

### 1. Requisitos previos
Asegúrate de tener instalado:
* **Node.js** (versión 20 o superior recomendado)
* **npm** (gestor de paquetes de Node)

### 2. Configurar Variables de Entorno
Crea un archivo llamado `.env.local` dentro de la carpeta `client/` y copia el siguiente contenido. Esto configurará tu aplicación local para conectarse directamente a las APIs y WebSockets en vivo de nuestro servidor:

```env
NEXT_PUBLIC_API_URL=https://api-vacamake.francescoer.dev
NEXT_PUBLIC_SOCKET_URL=https://api-vacamake.francescoer.dev
```

### 3. Instalar dependencias e iniciar el servidor de desarrollo
Navega a la carpeta del cliente, instala los paquetes y corre el comando de desarrollo:

```bash
# Entrar a la carpeta del cliente
cd client

# Instalar dependencias
npm install

# Correr el servidor local de desarrollo
npm run dev
```

Una vez que el comando esté corriendo, abre **[http://localhost:3000](http://localhost:3000)** en tu navegador. 

¡Cualquier cuenta que crees o plato que agregues se sincronizará en tiempo real con la base de datos de pruebas del servidor!

---

## Flujo de Despliegue (Deploy)

> [!IMPORTANT]
> **Solo el propietario realiza los despliegues.** 
> Los cambios aprobados y subidos a la rama `main` en GitHub son jalados directamente al servidor local utilizando herramientas internas. No intentes construir o subir contenedores Docker manualmente al servidor de producción.
