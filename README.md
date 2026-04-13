# Reserva Espacios Frontend

Interfaz de administración y reserva de espacios para la Feria de Empleo, desarrollada con React, TypeScript y Konva.js.

## Requisitos previos

- Node.js 18+
- Backend corriendo en `http://localhost:5001` (ver README del backend)
- Keycloak corriendo en `http://localhost:8080`

## Instalación y ejecución

```bash
npm install
npm run dev   # → http://localhost:5173
```

## Configuración

Crear un archivo `.env` en la raíz del proyecto frontend:

```env
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=reserva-espacios
VITE_KEYCLOAK_CLIENT_ID=front-admin
VITE_API_BASE=http://localhost:5001
```

> Si el backend o Keycloak corren en otra URL (ej: deploy en la nube), actualizar estos valores en consecuencia.

## Scripts disponibles

| Comando            | Descripción                                           |
|--------------------|-------------------------------------------------------|
| `npm run dev`      | Inicia en modo desarrollo (`http://localhost:5173`)   |
| `npm run build`    | Genera la build de producción en `dist/`              |
| `npm run preview`  | Sirve la build generada para validación               |
| `npm run lint`     | Ejecuta ESLint                                        |

## Autenticación

La app usa **Keycloak** para autenticación. Al abrir la app, redirige al login de Keycloak. El realm y los usuarios se configuran en el servidor Keycloak (que levanta automáticamente con Docker Compose desde el backend).

## Imágenes de planos

Las imágenes de los planos se almacenan en el backend (AWS S3, DigitalOcean Spaces o Azure Blob Storage). El frontend **nunca accede al storage directamente** — todas las imágenes se sirven a través del proxy del backend en `/planos/image/<key>` para evitar problemas de CORS.

El archivo [`src/utils/imageProxy.ts`](src/utils/imageProxy.ts) detecta URLs del proveedor de storage y las convierte a URLs del proxy. Si el backend cambia de proveedor:

- **AWS S3 → DigitalOcean Spaces**: no requiere cambios en el frontend.
- **AWS S3 / DO Spaces → Azure**: hay que actualizar el regex en `imageProxy.ts`. Ver instrucciones detalladas en el README del backend.

## Estructura relevante

```
src/
├── main.tsx                  # Punto de entrada
├── App.tsx                   # Rutas principales
├── api/                      # Llamadas al backend (axios)
├── components/               # Componentes reutilizables
├── pages/                    # Vistas principales
├── store/                    # Estado global (Zustand)
├── utils/
│   └── imageProxy.ts         # Conversión de URLs de storage a proxy del backend
└── types/                    # Tipos TypeScript compartidos
```
