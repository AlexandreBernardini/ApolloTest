import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { PrismaClient } from '@prisma/client';
import DataLoader from 'dataloader';
// Instancier Prisma Client pour interagir avec la base de données
const prisma = new PrismaClient();
// DataLoader pour les réalisateurs
const directorsLoader = new DataLoader(async (directorIds) => {
    const directors = await prisma.director.findMany({
        where: { id: { in: [...directorIds] } },
    });
    const directorMap = directors.reduce((map, director) => {
        map[director.id] = director;
        return map;
    }, {});
    return directorIds.map(id => directorMap[id]);
});
// DataLoader pour les genres
const genresLoader = new DataLoader(async (genreIds) => {
    const genres = await prisma.genre.findMany({
        where: { id: { in: [...genreIds] } },
    });
    const genreMap = genres.reduce((map, genre) => {
        map[genre.id] = genre;
        return map;
    }, {});
    return genreIds.map(id => genreMap[id]);
});
// DataLoader pour les utilisateurs (liés aux évaluations)
const usersLoader = new DataLoader(async (userIds) => {
    const users = await prisma.user.findMany({
        where: { id: { in: [...userIds] } },
    });
    const userMap = users.reduce((map, user) => {
        map[user.id] = user;
        return map;
    }, {});
    return userIds.map(id => userMap[id]);
});
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
    createUser(input: CreateUserInput!): User!
    createRating(input: CreateRatingInput!): Rating!
    deleteFilm(id: Int!): Film!
  }
`;
// Résolveurs avec Prisma et DataLoader
const resolvers = {
    Query: {
        films: async () => {
            return prisma.film.findMany({
                include: {
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
            return prisma.film.findUnique({
                where: { id },
                include: {
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
            return prisma.director.findMany({
                include: { films: true },
            });
        },
        genres: async () => {
            return prisma.genre.findMany({
                include: { films: true },
            });
        },
        users: async () => {
            return prisma.user.findMany({
                include: { ratings: true },
            });
        },
    },
    Mutation: {
        createFilm: async (_, { input }) => {
            return prisma.film.create({
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
            return prisma.film.update({
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
            return prisma.director.create({
                data: {
                    name: input.name,
                },
            });
        },
        createGenre: async (_, { input }) => {
            return prisma.genre.create({
                data: {
                    name: input.name,
                },
            });
        },
        createUser: async (_, { input }) => {
            return prisma.user.create({
                data: {
                    username: input.username,
                },
            });
        },
        createRating: async (_, { input }) => {
            return prisma.rating.create({
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
        deleteFilm: async (_, { id }) => {
            return prisma.film.delete({
                where: { id },
                include: {
                    director: true,
                    genre: true,
                },
            });
        },
    },
    Film: {
        director: async (parent, _, context) => {
            return context.directorsLoader.load(parent.directorId);
        },
        genre: async (parent, _, context) => {
            return context.genresLoader.load(parent.genreId);
        },
        ratings: async (parent) => {
            return prisma.rating.findMany({
                where: { filmId: parent.id },
                include: { user: true },
            });
        },
    },
    Director: {
        films: async (parent) => {
            return prisma.film.findMany({
                where: { directorId: parent.id },
            });
        },
    },
    Genre: {
        films: async (parent) => {
            return prisma.film.findMany({
                where: { genreId: parent.id },
            });
        },
    },
    User: {
        ratings: async (parent) => {
            return prisma.rating.findMany({
                where: { userId: parent.id },
                include: { film: true },
            });
        },
    },
};
// Création du serveur Apollo avec Prisma, Résolveurs et DataLoader
const server = new ApolloServer({
    typeDefs,
    resolvers,
});
// Démarrage du serveur Apollo avec context dans `startStandaloneServer`
const startServer = async () => {
    const { url } = await startStandaloneServer(server, {
        listen: { port: 4000 },
        context: async () => ({
            prisma,
            directorsLoader,
            genresLoader,
            usersLoader,
        }),
    });
    console.log(`🚀 Server ready at: ${url}`);
};
startServer().catch((e) => {
    console.error(e);
    prisma.$disconnect();
});
