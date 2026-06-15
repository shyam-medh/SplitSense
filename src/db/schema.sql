CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE "User" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL UNIQUE,
    "email" TEXT UNIQUE,
    "password" TEXT,
    "isGuest" BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE "Group" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "ownerId" UUID NOT NULL DEFAULT uuid_generate_v4(),
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE "GroupMember" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "groupId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "leftAt" TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    UNIQUE ("groupId", "userId")
);

CREATE TABLE "Expense" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "groupId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "date" TIMESTAMP WITH TIME ZONE NOT NULL,
    "paidById" UUID,
    "splitType" TEXT NOT NULL,
    "notes" TEXT,
    "csvRow" INTEGER,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE,
    FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE TABLE "ExpenseSplit" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "expenseId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amountOwed" DOUBLE PRECISION NOT NULL,
    FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE "Settlement" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "groupId" UUID NOT NULL,
    "payerId" UUID NOT NULL,
    "payeeId" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP WITH TIME ZONE NOT NULL,
    "notes" TEXT,
    "csvRow" INTEGER,
    FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE,
    FOREIGN KEY ("payerId") REFERENCES "User"("id") ON DELETE CASCADE,
    FOREIGN KEY ("payeeId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE "ImportLog" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "level" TEXT NOT NULL,
    "csvRow" INTEGER,
    "field" TEXT,
    "rawValue" TEXT,
    "description" TEXT NOT NULL,
    "actionTaken" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "ownerId" UUID,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE
);
