# Logpose

Logpose is a scalable URL shortener. This is a learning project for me.I am using auto-increment IDs & base conversion with obfuscation complete no-collision approach. This repository follows a proper layered architecture:
- Controllers
- Middlewares
- Models
- Repositories
- Routes
- Libs
Using Prisma ORM and Zod for data validation Omitting sensitive info from logs and the error messages. Auth middleware extracts the authorization header and verifies the token, checks for blacklisting, and then attaches the claims to the request. The flow of the client is:
1. `/get-short-code`
2.  check in the cache.
3. If cache miss, then fall back to the Postgres.
4. Load from the Postgres and set in the cache.
5. Redirect the user. It will be a temporary redirect.

I am using analytics middleware, which will extract info from the headers and the incoming request (such as IP address, browser, user agent, referer, country code, etc.) for analytics purposes and publish them to the Kafka topic `url.clicked`. Then a worker will consume this and do a batch insert in the cold DB Postgres. All the important and critical functions are unit tested using the middleware by the Vitest framework. 


To do:
- Rate limiting middleware
- Different methods of rate limiting
- Rate limiting per client
- OAuth implementation
- Implementation of controllers
- Exact logic of controllers
- Error handling
- Writing custom app errors
- Writing workers and a consumer worker
- Writing an E2E integration test
- Deployment on EC2 micro