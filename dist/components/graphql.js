import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { PrismaClient } from '@prisma/client';
// Instancier Prisma Client pour interagir avec la base de données
const prisma = new PrismaClient();
// Définition du schéma GraphQL
const typeDefs = `#graphql
    type Book {
        id: Int!
        title: String!
        author: Author!
        category: Category!
    }

    type Author {
        id: Int!
        name: String!
        books: [Book!]!
    }

    type Category {
        id: Int!
        name: String!
        books: [Book!]!
    }

    type Query {
        books: [Book!]!
        bookById(id: Int!): Book
        categories: [Category!]!
        authors: [Author!]!
    }

    input CreateBookInput {
        title: String!
        authorId: Int!
        categoryId: Int!
    }
    
    input UpdateBookInput {
        title: String!
        authorId: Int!
        categoryId: Int!
    }

    type Mutation {
        createBook(input: CreateBookInput!): Book!
        updateBook(id: Int!, input: UpdateBookInput!): Book!
    }
`;
// Résolveurs avec Prisma
const resolvers = {
    Query: {
        books: async () => {
            return await prisma.book.findMany({
                include: {
                    author: true,
                    category: true,
                },
            });
        },
        bookById: async (_, { id }) => {
            return await prisma.book.findUnique({
                where: { id },
                include: {
                    author: true,
                    category: true,
                },
            });
        },
        authors: async () => {
            return await prisma.author.findMany({
                include: { books: true },
            });
        },
        categories: async () => {
            return await prisma.category.findMany({
                include: { books: true },
            });
        },
    },
    Mutation: {
        createBook: async (_, { input }) => {
            return await prisma.book.create({
                data: {
                    title: input.title,
                    author: { connect: { id: input.authorId } },
                    category: { connect: { id: input.categoryId } },
                },
                include: {
                    author: true,
                    category: true,
                },
            });
        },
        updateBook: async (_, { id, input }) => {
            return await prisma.book.update({
                where: { id },
                data: {
                    title: input.title,
                    author: { connect: { id: input.authorId } },
                    category: { connect: { id: input.categoryId } },
                },
                include: {
                    author: true,
                    category: true,
                },
            });
        },
    },
    Book: {
        author: async (parent) => {
            return await prisma.author.findUnique({
                where: { id: parent.authorId },
            });
        },
        category: async (parent) => {
            return await prisma.category.findUnique({
                where: { id: parent.categoryId },
            });
        },
    },
    Author: {
        books: async (parent) => {
            return await prisma.book.findMany({
                where: { authorId: parent.id },
            });
        },
    },
    Category: {
        books: async (parent) => {
            return await prisma.book.findMany({
                where: { categoryId: parent.id },
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
