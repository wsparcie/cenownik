<p align="center">
<pre>
      __
     /  \      ____  ____  _  _  ____  _  _  _  _  _  _  _  _
    / /\ \    / ___]| ===|| \| ||  _  || |/ \| || \| || || / /
   / /__\ \  | [___ | ___||  ` || |_| || \   / ||  ` || ||  \
  /________\  \____]|____||_|\_||_____| \_/ \_/ |_|\_||_||_|\_\
  \        /
   \      /      -- P R I C E   T R A C K I N G   B O T --
    \____/
</pre>
</p>

## Tech Stack

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/) [![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js)](https://nodejs.org/) [![NestJS](https://img.shields.io/badge/NestJS-11.x-E0234E?logo=nestjs)](https://nestjs.com/) [![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)](https://www.prisma.io/) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-4169E1?logo=postgresql)](https://www.postgresql.org/)

[![Cheerio](https://img.shields.io/badge/Cheerio-1.x-E88C1D)](https://cheerio.js.org/) [![Cron](https://img.shields.io/badge/Cron-Scheduling-333333)](https://docs.nestjs.com/techniques/task-scheduling) [![Swagger](https://img.shields.io/badge/Swagger-API_Docs-85EA2D?logo=swagger)](https://swagger.io/) [![Jest](https://img.shields.io/badge/Jest-30.x-C21325?logo=jest)](https://jestjs.io/)

[![Status](https://img.shields.io/badge/Status-Alpha-yellow)]() [![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

## About the Project

**Cenownik** is a backend application that automatically scrapes product prices from online stores. The user adds an offer link and sets a target price – when the price drops below the set value, they receive a notification.

### How It Works

1. User adds an offer link and sets the desired target price
2. Application periodically scrapes the page and checks the current price
3. When the price drops below the set value, the user receives a notification

### Target Audience

Users looking for the best deals on products from online stores.

### Added Value

- **Time saved** - automatic price monitoring instead of manual checking
- **Better deals** - instant notifications when prices drop
- **Multi-store support** - aggregation from multiple sources
- **Price history** - track price changes over time

### API Documentation

Swagger documentation available at: `http://localhost:3000/api`

## Features

- **Database storage** - persist offer links and target prices
- **Price scraping** - automatically fetch prices from online stores
- **User authentication** - JWT-based login and registration
- **Email notifications** - alerts when prices drop below target
- **Price history** - track price changes over time
- **Discord notifications** - receive alerts via Discord

## Database Schema

```mermaid
erDiagram
    User ||--o{ Offer : "creates"

    User {
        int id PK "Primary Key"
        string email UK "Unique Email"
        string username "Username"
        string password "Hashed Password"
        enum role "USER/ADMIN/GUEST"
        datetime createdAt "Created"
        datetime updatedAt "Updated"
    }

    Offer {
        int id PK "Primary Key"
        string link UK "Unique URL"
        string title "Offer Title"
        float price "Current Price"
        string description "Description"
        string source "Source Store"
        string[] images "Image URLs"
        int userId FK "User Reference"
        datetime createdAt "Created"
        datetime updatedAt "Updated"
    }
```

### Auth

- `POST /auth/register` - User registration
- `POST /auth/login` - Login (returns JWT token)

### Users

- `GET /users` - List users (ADMIN)
- `GET /users/:email` - User details
- `PATCH /users/:email` - Update user
- `DELETE /users/:email` - Delete user (ADMIN)

### Offers

- `GET /offers` - List offers
- `GET /offers/:id` - Offer details
- `GET /offers/statistics` - Offer statistics
- `POST /offers` - Add offer (requires auth)
- `PATCH /offers/:id` - Update offer (ADMIN)
- `DELETE /offers/:id` - Delete offer (ADMIN)

## License

MIT
