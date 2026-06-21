-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "favoriteGenres" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Anime" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "genres" TEXT NOT NULL,
    "studio" TEXT NOT NULL,
    "releaseYear" INTEGER NOT NULL,
    "episodes" INTEGER NOT NULL,
    "rating" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "popularity" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "UserAnimeList" (
    "userId" INTEGER NOT NULL,
    "animeId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "rating" INTEGER,
    "watchedEpisodes" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("userId", "animeId"),
    CONSTRAINT "UserAnimeList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAnimeList_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
