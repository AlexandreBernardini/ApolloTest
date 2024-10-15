import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { PrismaClient } from '@prisma/client';
// Instancier Prisma Client pour interagir avec la base de données
const prisma = new PrismaClient();
// Définition du schéma GraphQL
const typeDefs = `#graphql
    type Film {
        id: Int!
        title: String!
        director: Director!
        genre: Genre!
        releaseYear: Int!
        ratings: [Rating!]!
    }

    type Director {
        id: Int!
        name: String!
        films: [Film!]!
    }

    type Genre {
        id: Int!
        name: String!
        films: [Film!]!
    }

    type User {
        id: Int!
        username: String!
        ratings: [Rating!]!
    }

    type Rating {
        id: Int!
        score: Int!
        user: User!
        film: Film!
    }

    type Query {
        films: [Film!]!
        filmById(id: Int!): Film
        directors: [Director!]!
        genres: [Genre!]!
        users: [User!]!
    }

    input CreateFilmInput {
        title: String!
        directorId: Int!
        genreId: Int!
        releaseYear: Int!
    }

    input UpdateFilmInput {
        title: String
        directorId: Int
        genreId: Int
        releaseYear: Int
    }

    input CreateDirectorInput {
        name: String!
    }

    input CreateGenreInput {
        name: String!
    }

    input CreateUserInput {
        username: String!
    }

    input CreateRatingInput {
        score: Int!
        userId: Int!
        filmId: Int!
    }

    type Mutation {
        createFilm(input: CreateFilmInput!): Film!
        updateFilm(id: Int!, input: UpdateFilmInput!): Film!
        createDirector(input: CreateDirectorInput!): Director!
        createGenre(input: CreateGenreInput!): Genre!
        createUser(input: CreateUserInput!): User!  # Ajout de la mutation pour créer un utilisateur
        createRating(input: CreateRatingInput!): Rating!
    }
`;
// Résolveurs avec Prisma
const resolvers = {
    Query: {
        films: async () => {
            return await prisma.film.findMany({
                include: {
                    director: true,
                    genre: true,
                    ratings: {
                        include: {
                            user: true,
                        },
                    },
                },
            });
        },
        filmById: async (_, { id }) => {
            return await prisma.film.findUnique({
                where: { id },
                include: {
                    director: true,
                    genre: true,
                    ratings: {
                        include: {
                            user: true,
                        },
                    },
                },
            });
        },
        directors: async () => {
            return await prisma.director.findMany({
                include: { films: true },
            });
        },
        genres: async () => {
            return await prisma.genre.findMany({
                include: { films: true },
            });
        },
        users: async () => {
            return await prisma.user.findMany({
                include: { ratings: true },
            });
        },
    },
    Mutation: {
        createFilm: async (_, { input }) => {
            return await prisma.film.create({
                data: {
                    title: input.title,
                    releaseYear: input.releaseYear,
                    director: { connect: { id: input.directorId } },
                    genre: { connect: { id: input.genreId } },
                },
                include: {
                    director: true,
                    genre: true,
                },
            });
        },
        updateFilm: async (_, { id, input }) => {
            return await prisma.film.update({
                where: { id },
                data: {
                    title: input.title ?? undefined,
                    releaseYear: input.releaseYear ?? undefined,
                    director: input.directorId
                        ? { connect: { id: input.directorId } }
                        : undefined,
                    genre: input.genreId ? { connect: { id: input.genreId } } : undefined,
                },
                include: {
                    director: true,
                    genre: true,
                },
            });
        },
        createDirector: async (_, { input }) => {
            return await prisma.director.create({
                data: {
                    name: input.name,
                },
            });
        },
        createGenre: async (_, { input }) => {
            return await prisma.genre.create({
                data: {
                    name: input.name,
                },
            });
        },
        createUser: async (_, { input }) => {
            return await prisma.user.create({
                data: {
                    username: input.username,
                },
            });
        },
        createRating: async (_, { input }) => {
            return await prisma.rating.create({
                data: {
                    score: input.score,
                    user: { connect: { id: input.userId } },
                    film: { connect: { id: input.filmId } },
                },
                include: {
                    user: true,
                    film: true,
                },
            });
        },
    },
    Film: {
        director: async (parent) => {
            return await prisma.director.findUnique({
                where: { id: parent.directorId },
            });
        },
        genre: async (parent) => {
            return await prisma.genre.findUnique({
                where: { id: parent.genreId },
            });
        },
        ratings: async (parent) => {
            return await prisma.rating.findMany({
                where: { filmId: parent.id },
                include: { user: true },
            });
        },
    },
    Director: {
        films: async (parent) => {
            return await prisma.film.findMany({
                where: { directorId: parent.id },
            });
        },
    },
    Genre: {
        films: async (parent) => {
            return await prisma.film.findMany({
                where: { genreId: parent.id },
            });
        },
    },
    User: {
        ratings: async (parent) => {
            return await prisma.rating.findMany({
                where: { userId: parent.id },
                include: { film: true },
            });
        },
    },
};
// Création du serveur Apollo avec Prisma et résolveurs
const server = new ApolloServer({
    typeDefs,
    resolvers,
});
// Démarrage du serveur Apollo
const startServer = async () => {
    const { url } = await startStandaloneServer(server, {
        listen: { port: 4000 },
    });
    console.log(`🚀 Server ready at: ${url}`);
};
startServer().catch((e) => {
    console.error(e);
    prisma.$disconnect();
});
