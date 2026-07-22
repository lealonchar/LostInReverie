# Lost In Reverie

A .NET + React website for Lost In Reverie with public tabs and an admin area. It starts with no shows, posts, merch, or orders so the real content can be added from the admin UI.

## Structure

- `src/BandPortal.Domain` - domain entities such as shows, posts, merch, and orders.
- `src/BandPortal.Repository` - data access with PostgreSQL support and JSON fallback.
- `src/BandPortal.Service` - business logic for shows, posts, merch, stock, and orders.
- `src/BandPortal.Web` - ASP.NET Core API endpoints and admin authorization.
- `src/BandPortal.Client` - React + Vite frontend.
- `src/BandPortal.Web/App_Data/uploads` - uploaded merch images when running the API locally.

## Main Features

- Public tabs for upcoming shows, news/posts, and merch.
- Admin panel for adding/removing shows.
- Admin panel for adding/removing posts.
- Admin panel for adding/editing/removing merch items.
- Drag-and-drop merch image uploads from the admin panel, with multiple images per item.
- Fixed S to XXL shirt stock counts, editable by admin.
- Public order request form with no payment integration.
- Admin order list with order status updates.

## Run Locally

With Docker:

```powershell
docker compose up --build
```

Open `http://localhost:5173`.

The API runs on `http://localhost:5000`, PostgreSQL runs on `localhost:5432`, and uploaded merch images are stored in the `uploads` Docker volume.

Without Docker:

In one terminal:

```powershell
cd src/BandPortal.Web
dotnet run
```

In another terminal:

```powershell
cd src/BandPortal.Client
npm install
npm run dev
```

Open `http://localhost:5173`.

The development admin token is `dev-band-admin`. Change it in `src/BandPortal.Web/appsettings.Development.json`.

## Configuration

- `ConnectionStrings:Default` enables PostgreSQL persistence. If it is blank, the API falls back to the local JSON file.
- `LostInReverie:AdminToken` controls admin API access.
- `VITE_API_BASE_URL` can point the frontend at a different API URL.
- `VITE_CURRENCY` controls store currency formatting. It defaults to `MKD` and displays as `den`.

## Hosting Notes

For Azure, the Docker setup is a good local packaging step. A student-plan deployment will usually work best with the frontend and API hosted as containers or app services, Azure Database for PostgreSQL for the database, and Azure Blob Storage for uploaded images if you need durable production file storage.

