# Server dependencies
cd server
npm install prisma @prisma/client
npm install -D prisma

# Initialize Prisma
npx prisma init

# Generate Prisma Client
npx prisma generate
